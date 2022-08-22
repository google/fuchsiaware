// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';
import * as log from './log';

const SHOW_UNRESOLVED_TERMINAL_LINKS = vscode.workspace.getConfiguration().get(
  'fuchsiAware.showUnresolvedTerminalLinks'
) ?? false;
const NORMALIZE_WORD_SEPARATORS = vscode.workspace.getConfiguration().get(
  'fuchsiAware.normalizeWordSeparators'
) ?? true;
const USE_HEURISTICS_TO_FIND_MORE_LINKS = vscode.workspace.getConfiguration().get(
  'fuchsiAware.useHeuristicsToFindMoreLinks'
) ?? true;

interface FuchsiAwareLink extends vscode.TerminalLink {
  uri?: vscode.Uri;
}

export class Provider implements
  vscode.DocumentLinkProvider,
  vscode.TerminalLinkProvider,
  vscode.ReferenceProvider {

  static scheme = '*';

  private _baseUri: vscode.Uri;
  private _buildDir: string;
  private _manifestFileNameToPackageAndComponents = new Map<string, string[]>();
  private _componentToSomeManifestPath = new Map<string, string>();
  private _packageAndComponentToManifestUri = new Map<string, vscode.Uri>();
  private _sourcePathToPackageAndComponents = new Map<string, string[]>();
  private _packageAndComponentToReferences = new Map<string, vscode.Location[]>();
  private _nonNormalizedLinksResolved = 0;

  constructor(baseUri: vscode.Uri, buildDir: string) {
    this._baseUri = baseUri;
    this._buildDir = buildDir;
  }

  dispose() {
    this._manifestFileNameToPackageAndComponents.clear();
    this._componentToSomeManifestPath.clear();
    this._packageAndComponentToManifestUri.clear();
    this._sourcePathToPackageAndComponents.clear();
    this._packageAndComponentToReferences.clear();
  }

  async init(): Promise<boolean> {
    const [gotLinks, gotReferences] = await Promise.all([
      this._getLinksToManifests(),
      this._getReferencesToManifests()
    ]);

    if (!(gotLinks && gotReferences)) {
      return false;
    }

    if (USE_HEURISTICS_TO_FIND_MORE_LINKS) {
      this._resolveUnmatchedUrlsToAnyMatchingManifestByName();
    }

    if (log.DEBUG) {
      let totalReferences = 0;
      for (const references of this._packageAndComponentToReferences.values()) {
        totalReferences += references.length;
      }
      let totalUnresolvedLinks = 0;
      for (const [packageAndComponent, locations] of this._packageAndComponentToReferences) {
        if (!this._packageAndComponentToManifestUri.get(packageAndComponent)) {
          totalUnresolvedLinks++;
          const [
            packageName,
            componentName,
          ] = packageAndComponent.split('/');
          log.debug(
            `UNRESOLVED: fuchsia-pkg://fuchsia.com/${packageName}?#meta/${componentName}.cm(x)?`
          );
        }
      }
      // TODO(#1): Clean up and expand on these reported stats
      log.debug(`Link Resolution Statistics`);
      log.debug(`==========================`);
      log.debug(`unresolved links = ${totalUnresolvedLinks}`);
      log.debug(`manifests = ${this._manifestFileNameToPackageAndComponents.size}`);
      log.debug(`references = ${totalReferences}`);
      log.debug(`nonNormalizedLinksResolved = ${this._nonNormalizedLinksResolved}`);
    }

    return true;
  }

  // For any unresolved component URL link for which there is a manifest with the same component
  // name, add the link. These links are not guaranteed to be accurate, and there may be
  // duplicates, but the provide a best-effort resolution, which may still be helpful.
  private _resolveUnmatchedUrlsToAnyMatchingManifestByName() {
    for (const [packageAndComponent, locations] of this._packageAndComponentToReferences) {
      if (!this._packageAndComponentToManifestUri.get(packageAndComponent)) {
        const [
          packageName,
          componentName,
        ] = packageAndComponent.split('/');
        for (const suffixToRemove of [
          , // undefined (first, try to find a manifestPath without removing any suffix)
          /_allowed$/,
          /-isolated$/,
          /_test$/,
          /_tests$/,
        ]) {
          let lookupByComponentName = componentName;
          if (suffixToRemove) {
            lookupByComponentName = componentName.replace(suffixToRemove, '');
            if (lookupByComponentName === componentName) {
              continue;
            }
          }
          let manifestPath = this._componentToSomeManifestPath.get(lookupByComponentName);
          if (!manifestPath && NORMALIZE_WORD_SEPARATORS) {
            const normalizedComponentName = _normalize(lookupByComponentName);
            if (normalizedComponentName !== lookupByComponentName) {
              manifestPath = this._componentToSomeManifestPath.get(normalizedComponentName);
            }
          }
          if (manifestPath) {
            this.addLink(packageName, componentName, manifestPath);
            break;
          }
        }
      }
    }
  }

  private async _getLinksToManifests(): Promise<boolean> {
    const componentTargetPathToPackageTargetPaths = new Map<string, string[]>();
    const componentTargetPathToComponentNameAndManifest = new Map<string, [string, string]>();
    const componentTargetPathToSubComponentTargets = new Map<string, string[]>();
    const packageTargetPathToPackageName = new Map<string, string>();

    const ninjaFileUri = this._baseUri.with({
      path: `${this._baseUri.path}/${this._buildDir}/toolchain.ninja`
    });
    const ninjaStream = fs.createReadStream(ninjaFileUri.fsPath);
    ninjaStream.on('error', (err) => {
      log.error(
        `Error reading the build dependencies from ${ninjaFileUri.fsPath}: '${err}'\n` +
        'You may need to re-run `fx set ...` and then reload your VS Code window.'
      );
    });
    const ninjaReadline = readline.createInterface(ninjaStream);

    let matchedAtLeastOneMetaFarExample = false;
    let matchedAtLeastOneManifestAndComponentExample = false;
    let matchedAtLeastOnePmBuildExample = false;

    for await (const line of ninjaReadline) {
      let result;
      if ((result = Provider.extractBuildDirPackageTargetAndComponents(line))) {
        const [targetBuildDir, packageTarget, componentTargets] = result;
        for (const componentTarget of componentTargets) {
          const packageTargetPath = `${targetBuildDir}:${packageTarget}`;
          let componentTargetPath;
          const [
            subComponentDir,
            subComponentTarget,
          ] = componentTarget.split('/');
          if (subComponentDir && subComponentTarget) {
            componentTargetPath = `${targetBuildDir}/${subComponentDir}:${subComponentTarget}`;
          } else {
            componentTargetPath = `${targetBuildDir}:${componentTarget}`;
          }
          if (!matchedAtLeastOneMetaFarExample) {
            matchedAtLeastOneMetaFarExample = true;
            log.debug(
              `Associating packages to components based on build dependencies in ` +
              `${ninjaFileUri.fsPath}, for example, package '${packageTarget}' will include at ` +
              `least the component built from ninja target '${componentTargetPath}'.`
            );
          }
          let packageTargetPaths = componentTargetPathToPackageTargetPaths.get(componentTargetPath);
          if (!packageTargetPaths) {
            packageTargetPaths = [];
            componentTargetPathToPackageTargetPaths.set(componentTargetPath, packageTargetPaths);
          }
          packageTargetPaths.push(packageTargetPath);
        }
      } else if ((result = Provider.extractSubComponents(line))) {
        const [
          manifestPath,
          targetBuildDir,
          componentTarget,
          subComponentTargets,
        ] = result;
        let componentTargetPath = `${targetBuildDir}:${componentTarget}`;
        for (const subComponentTarget of subComponentTargets) {
          if (!matchedAtLeastOneMetaFarExample) {
            matchedAtLeastOneMetaFarExample = true;
            log.debug(
              `Associating sub-components to components based on build dependencies in ` +
              `${ninjaFileUri.fsPath}, for example, '${componentTargetPath}' will include at ` +
              `least the component built from ninja target '${subComponentTarget}'.`
            );
          }
          let subComponentTargets =
            componentTargetPathToSubComponentTargets.get(componentTargetPath);
          if (!subComponentTargets) {
            subComponentTargets = [];
            componentTargetPathToSubComponentTargets.set(componentTargetPath, subComponentTargets);
          }
          subComponentTargets.push(subComponentTarget);
        }
      } else if (result = Provider.extractManifestPathAndCmlComponent(line)) {
        const [manifestPath, componentName, componentTargetPath] = result;
        if (!matchedAtLeastOneManifestAndComponentExample) {
          matchedAtLeastOneManifestAndComponentExample = true;
          log.debug(
            `Matching components to manifests based on build commands in ${ninjaFileUri.fsPath}, ` +
            `for example, '${manifestPath}' is the manifest source for ` +
            `a component to be named '${componentName}', and built via ninja target ` +
            `'${componentTargetPath}'.`
          );
        }

        if (log.DEBUG) {
          const existing = componentTargetPathToComponentNameAndManifest.get(componentTargetPath);
          if (existing) {
            const [origComponentName, origManifestPath] = existing;
            if (componentName !== origComponentName ||
              manifestPath !== origManifestPath) {
              log.debug(
                `WARNING (debug-only check): componentTargetPath '${componentTargetPath}' has ` +
                `duplicate entries:\n` +
                `${[origComponentName, origManifestPath]} != ` +
                `${[componentName, manifestPath]}`
              );
            }
          }
        }

        componentTargetPathToComponentNameAndManifest.set(
          componentTargetPath,
          [componentName, manifestPath]
        );
      }

      // Note that extractBuildDirPackageTargetAndComponents() uses the same
      // ninja command line used by extractPackage, so this check is not in
      // the if-else-if condition block.
      if ((result = Provider.extractPackage(line))) {
        const [packageName, packageTargetPath] = result;
        if (!matchedAtLeastOnePmBuildExample) {
          matchedAtLeastOnePmBuildExample = true;
          log.debug(
            `Matching package targets to package names based on build commands in ` +
            `${ninjaFileUri.fsPath}, for example, '${packageTargetPath}' is the build target for ` +
            `a package to be named '${packageName}',`
          );
        }
        packageTargetPathToPackageName.set(packageTargetPath, packageName);
      }
    }

    if (!matchedAtLeastOneMetaFarExample) {
      log.error(
        `The ninja build file '${ninjaFileUri.fsPath}' did not contain any lines matching the ` +
        `expected pattern to identify components in a 'build meta.far' statement: \n\n` +
        `  metaFarRegEx = ${Provider._metaFarRegEx}\n`
      );
      return false;
    } else if (!matchedAtLeastOneManifestAndComponentExample) {
      log.error(
        `The ninja build file '${ninjaFileUri.fsPath}' did not contain any lines matching the ` +
        `expected pattern to identify components in a 'validate .cmx manifest' command: \n\n` +
        `  cmcCompileCmlRegEx = ${Provider._cmcCompileCmlRegEx}\n`
      );
      return false;
    } else if (!matchedAtLeastOnePmBuildExample) {
      log.error(
        `The ninja build file '${ninjaFileUri.fsPath}' did not contain any lines matching the ` +
        `expected pattern to identify components in a 'build package' command: \n\n` +
        `  pmBuildRegEx = ${Provider._pmBuildRegEx}\n`
      );
      return false;
    }

    for (
      let [componentTargetPath, packageTargetPaths]
      of componentTargetPathToPackageTargetPaths.entries()
    ) {
      for (const packageTargetPath of packageTargetPaths) {
        const packageName = packageTargetPathToPackageName.get(packageTargetPath);

        if (!packageName) {
          continue;
        }
        let componentNameAndManifest =
          componentTargetPathToComponentNameAndManifest.get(componentTargetPath);
        if (USE_HEURISTICS_TO_FIND_MORE_LINKS) {
          if (!componentNameAndManifest) {
            const targetWithoutComponentSuffix = componentTargetPath.replace(/:test_/, ':');
            if (targetWithoutComponentSuffix !== componentTargetPath) {
              componentTargetPath = targetWithoutComponentSuffix;
              componentNameAndManifest =
                componentTargetPathToComponentNameAndManifest.get(targetWithoutComponentSuffix);
            }
          }
          if (!componentNameAndManifest) {
            const targetWithoutComponentSuffix = componentTargetPath.replace(/_component$/, '');
            if (targetWithoutComponentSuffix !== componentTargetPath) {
              componentTargetPath = targetWithoutComponentSuffix;
              componentNameAndManifest =
                componentTargetPathToComponentNameAndManifest.get(targetWithoutComponentSuffix);
            }
          }
        }
        if (!componentNameAndManifest) {
          continue;
        }

        const [componentName, manifestPath] = componentNameAndManifest;
        this.addLink(packageName, componentName, manifestPath);

        const subComponentTargets =
          componentTargetPathToSubComponentTargets.get(componentTargetPath);
        if (subComponentTargets) {
          for (const subComponentTarget of subComponentTargets) {
            this.addLink(packageName, subComponentTarget, manifestPath);
          }
        }

        if (USE_HEURISTICS_TO_FIND_MORE_LINKS) {
          const nameWithoutComponentSuffix =
            componentName.replace(/_component(_generated_manifest)?$/, '');
          if (nameWithoutComponentSuffix !== componentName) {
            const targetWithoutComponentSuffix =
              componentTargetPath.replace(/_component(_generated_manifest)?$/, '');
            this.addLink(packageName, nameWithoutComponentSuffix, manifestPath);
          }
        }
      }
    }

    log.info('The data required by the DocumentLinkProvider is loaded.');
    return true;
  }

  // TODO(#2): These patterns are very fragile and subject to breakage when GN rules change.
  // Plus, since they only search the results from `fx set`, the results are limited to the packages
  // in the current set of dependencies (which isn't terrible, but not great for general browsing,
  // or to find a dependency.) Alternative 1: Find a better way to query the dependencies.
  // Alternative 2: Parse the BUILD.gn files (not recommended) And, consider running GN from the
  // extension, to generate a custom ninja result, with a broad set of targets, but if possible, a
  // narrow set of output targets (only those needed for the extension).

  private static _metaFarRegEx = new RegExp([
    /^\s*build\s*obj\/(?<targetBuildDir>[^.]+?)\/(?<packageTarget>[-\w]+)\/meta\.far/,
    /\s*(?<ignoreOtherOutputs>[^:]*)\s*:/,
    /\s*(?<ignoreNinjaRulename>[^\s]+)/,
    /\s*(?<ignoreInputs>[^|]+)\|/,
    /(?<dependencies>(.|\n)*)/,
  ].map(r => r.source).join(''));

  static extractBuildDirPackageTargetAndComponents(
    line: string
  ): [string, string, string[]] | undefined {
    const match = Provider._metaFarRegEx.exec(line);
    if (!match) {
      return;
    }
    const [
      , // full match
      targetBuildDir,
      packageTarget,
      , // ignoreOtherOutputs
      , // ignoreNinjaRulename
      , // ignoreInputs
      dependencies,
    ] = match;

    // Get all dependencies (global search)
    const componentTargets = [];
    const depRegEx = new RegExp([
      // CAUTION! Since this RegExp is built dynamically, and has at least one capturing group that
      // spans a wide swath (multiple lines, as structured here), the typical slash-contained
      // JavaScript RegExp syntax cannot be used. This means ALL BACKSLASHES MUST BE DOUBLED.
      // Be careful because many editors and parsers do not provide any warnings if you forget
      // to add the second backslash, but RegExp parsing will mysteriously stop working as
      // expected:
      `\\s*obj/${targetBuildDir}(?!/${packageTarget}\\.)/(?:(?:(?:(?<componentBuildSubdir>${packageTarget})_)?)|(?<subPackage>[^./]+))(?:/)?`,
      `(?:`,
      `(?:manifest.stamp)|`,
      `(?:metadata.stamp)|`,
      `(?:validate_manifests[^/]+.stamp)|`,
      `(?:[^\\s]+?_component_index.stamp)|`,
      `(?<componentTarget>[^/]+)(?:\\.manifest)?\\.stamp`,
      `)`,
    ].join(''), 'g');
    let depMatch;
    while ((depMatch = depRegEx.exec(dependencies))) {
      let [
        , // full match
        componentTargetPrefix,
        componentBuildSubdir,
        componentTarget,
      ] = depMatch;
      if (componentTarget === 'component' && componentTargetPrefix) {
        componentTarget = `${componentTargetPrefix}_${componentTarget}`;
      }
      if (componentTarget) {
        if (componentBuildSubdir) {
          componentTargets.push(`${componentBuildSubdir}/${componentTarget}`);
        } else if (componentTarget) {
          componentTargets.push(componentTarget);
        }
      }
    }

    return [
      targetBuildDir,
      packageTarget,
      componentTargets,
    ];
  }

  private static _buildCmxRegEx = new RegExp([
    /^\s*build\s*obj\/(?<manifestPath>(?<targetBuildDir>[^.]+?)\/(?<componentTarget>[-\w]+)\.cm[xl])/,
    /\s*(?<ignoreOtherOutputs>[^:]*)\s*:/,
    /\s*(?<ignoreNinjaRulename>[^\s]+)/,
    /\s*(?<ignoreInputs>[^|]+)\|/,
    /(?<dependencies>(.|\n)*)/,
  ].map(r => r.source).join(''));

  static extractSubComponents(
    line: string
  ): [string, string, string, string[]] | undefined {
    const match = Provider._buildCmxRegEx.exec(line);
    if (!match) {
      return;
    }
    const [
      , // full match
      manifestPath,
      targetBuildDir,
      componentTarget,
      , // ignoreOtherOutputs
      , // ignoreNinjaRulename
      , // ignoreInputs
      dependencies,
    ] = match;

    if (manifestPath.startsWith('build/') || manifestPath.endsWith('.cm') ||
        manifestPath.indexOf('_manifest_compile/') >= 0) {
      // generated manifest
      return;
    }

    // Get all dependencies (global search)
    const subComponentTargets = [];
    const depRegEx = new RegExp([
      // CAUTION! Since this RegExp is built dynamically, and has at least one capturing group that
      // spans a wide swath (multiple lines, as structured here), the typical slash-contained
      // JavaScript RegExp syntax cannot be used. This means ALL BACKSLASHES MUST BE DOUBLED.
      // Be careful because many editors and parsers do not provide any warnings if you forget
      // to add the second backslash, but RegExp parsing will mysteriously stop working as
      // expected:
      `\\s*obj/${targetBuildDir}/`,
      `(?:`,
      `(?:${componentTarget}_check_includes)|`,
      `(?:${componentTarget}_cmc_validate_references)|`,
      `(?:${componentTarget}_manifest_resource)|`,
      `(?:${componentTarget}_merge)|`,
      `(?:${componentTarget}_validate)|`,
      `(?<subComponentTarget>[-\\w]+)`,
      `)`,
      `\\.stamp`,
    ].join(''), 'g');
    let depMatch;
    while ((depMatch = depRegEx.exec(dependencies))) {
      let [
        , // full match
        subComponentTarget,
      ] = depMatch;
      if (subComponentTarget) {
        subComponentTargets.push(subComponentTarget);
      }
    }

    return [
      manifestPath,
      targetBuildDir,
      componentTarget,
      subComponentTargets,
    ];
  }

  private static _cmcCompileCmlRegEx = new RegExp([
    /^\s*command\s*=.*/,
    /--label\s+\/\/(?<targetBuildDir>[^$]+)\$:(?<componentTarget>[-\w]+)_manifest_compile/,
    /[^\s]*\s+obj\/[^\s]+\/(?<componentName>[^/.]+)\.cm\s/,
    /.*\/cmc\s+compile\s+\.\.\/\.\.\/(?<manifestPath>[^\s]+)/,
  ].map(r => r.source).join(''));

  static extractManifestPathAndCmlComponent(line: string): [string, string, string] | undefined {
    const match = Provider._cmcCompileCmlRegEx.exec(line);
    if (!match) {
      return;
    }

    const [
      , // full match
      targetBuildDir,
      componentTarget,
      componentName,
      manifestPath,
    ] = match;

    if (manifestPath.startsWith('build/') || manifestPath.endsWith('.cm') ||
        manifestPath.indexOf('_manifest_compile/') >= 0) {
      // generated manifest
      return;
    }

    const componentTargetPath = `${targetBuildDir}:${componentTarget}`;

    return [
      manifestPath,
      componentName,
      componentTargetPath,
    ];
  }

  private static _pmBuildRegEx = new RegExp([
    /^\s*build\s+obj\/(?<targetBuildDir>[^\s]+)\/(?<packageTarget>[^\s/]+)\/meta.far\s+/,
    /.*package-tool.*\/gn_run_binary.sh\s+[^\s]*\/(?<packageName>[^\s/.]+)\.stamp/,
  ].map(r => r.source).join(''));

  static extractPackage(line: string): [string, string] | undefined {
    const match = Provider._pmBuildRegEx.exec(line);
    if (!match) {
      return;
    }

    const [
      , // full match
      targetBuildDir,
      packageTarget,
      packageName,
    ] = match;

    const packageTargetPath = `${targetBuildDir}:${packageTarget}`;

    return [
      packageName,
      packageTargetPath,
    ];
  }

  private async _askGit(gitArgs: string[]): Promise<string | undefined> {
    let git = child_process.spawnSync(
      'git',
      gitArgs,
      { cwd: `${this._baseUri.path}` }
    );

    if (git.error) {
      log.error(
        `Error executing \`git\`: '${git.error}'\n`
      );
      return;
    }

    if (git.status !== 0) {
      log.error(
        `Error (${git.status}) executing \`git\`: '${git.stderr}'\n`
      );
      return;
    }

    return git.stdout.toString();
  }

  private async _gitLsFiles(gitLsFilesGlobs: string[]): Promise<string | undefined> {
    let gitArgs = [
      '--no-pager',
      '--glob-pathspecs',
      'ls-files',
      '--cached', // ensure cached mode (normally the default)
      '--recurse-submodules', // requires --cached
      '--',
    ];

    gitArgs = gitArgs.concat(gitLsFilesGlobs);

    log.info(
      `Searching the 'fuchsia.git' repo, by running the command: \n\n` +
      `  \`git ${gitArgs.join(' ')}\`\n\n` +
      `from the '${this._baseUri.path}' directory.`
    );

    return this._askGit(gitArgs);
  }

  // Note, this private function may be useful for experimentation, or a future feature, but is
  // currently unused.
  private async _findAllManifests(): Promise<string[] | undefined> {
    return (await this._gitLsFiles([
      '**/?*.cmx',
      '**/?*.cml',
    ]) ?? '').split('\n');
  }

  private async _gitGrep(grepExtendedRegEx: string | RegExp): Promise<string | undefined> {
    if (grepExtendedRegEx instanceof RegExp) {
      grepExtendedRegEx = grepExtendedRegEx.source;
    }

    const gitArgs = [
      '--no-pager',
      'grep',
      '--recurse-submodules',
      '-I', // don't match the pattern in binary files
      '--extended-regexp',
      // '--only-matching', // grep BUG! --column value is wrong for second match in line
      // '--column', // not useful without --only-matching
      '--line-number',
      '--no-column',
      '--no-color',
      grepExtendedRegEx,
    ];

    log.info(
      `Searching the 'fuchsia.git' repo, by running the command: \n\n` +
      `  \`git ${gitArgs.join(' ')}\`\n\n` +
      `from the '${this._baseUri.path}' directory.`
    );

    return this._askGit(gitArgs);
  }

  private async _getReferencesToManifests(): Promise<boolean> {

    log.info(
      `Searching for component URLs('fuchsia-pkg://...cm[x]') referenced from any text document.`
    );

    const matches = await this._gitGrep(/fuchsia-pkg:\/\/fuchsia.com\/([^#]*)#meta\/(-|\w)*\.cmx?/);
    if (!matches) {
      return false;
    }

    // patterns end in either '.cm' or '.cmx'
    const urlRegEx = /\bfuchsia-pkg:\/\/fuchsia.com\/([-\w]+)(?:\?[^#]*)?#meta\/([-\w]+)\.cmx?\b/g;

    let loggedAtLeastOneExample = false;

    let start = 0;
    while (start < matches.length) {
      let end = matches.indexOf('\n', start);
      if (end === -1) {
        end = matches.length;
      }
      const line = matches.substr(start, end - start);
      start = end + 1;
      const [path, lineNumberStr] = line.split(':', 2);
      const lineNumber: number = (+lineNumberStr) - 1;
      const matchedLine = line.substr(path.length + 1 + lineNumberStr.length);
      let match;
      while ((match = urlRegEx.exec(matchedLine))) {
        const componentUrl = match[0];
        const packageName = match[1];
        const componentName = match[2];
        const column = match.index - 1;
        const sourceUri = this._baseUri.with({ path: `${this._baseUri.path}/${path}` });
        this.addReference(packageName, componentName, componentUrl, sourceUri, lineNumber, column);
        if (!loggedAtLeastOneExample) {
          loggedAtLeastOneExample = true;
          log.debug([
            `Getting references to manifests. For example, '${componentUrl}' is referenced by `,
            `'${sourceUri.fsPath}:`,
            `${lineNumber + 1}:`,
            `${column + 1}:`,
            `${lineNumber + 1}:`,
            `${column + componentUrl.length + 1}`,
          ].join(''));
        }
      }
      if (!loggedAtLeastOneExample) {
        loggedAtLeastOneExample = true;
        log.warn(
          `RegEx failed to match the first line returned from \`git grep\`.\n\n` +
          `  Line: '${matchedLine}'\n` +
          `  RegEx: ${urlRegEx}`
        );
      }
    }

    if (loggedAtLeastOneExample) {
      log.info('The data required by the ReferenceProvider is loaded.');
    } else {
      log.error(
        `No component URLs ('fuchsia-pkg://...cm[x]') were found in the 'fuchsia.git' repo`
      );
    }
    return true;
  }

  // TODO(#3): find links to fuchsia Service declarations in .fidl files using (I suggest)
  // a `git` command (since we know this works) equivalent of:
  //   $ find ${this._baseUri}/${buildDir} -name '*fidl.json'
  //
  // for each matched file, use VS Code JSON parsing APIs to do the equivalent of:
  //   $ jq '.interface_declarations[] | .name,.location' \
  //     ${this._baseUri}/${buildDir}/fidling/gen/sdk/fidl/fuchsia.logger/fuchsia.logger.fidl.json
  //   "fuchsia.logger/Log"
  //   {
  //       "filename": "../../sdk/fidl/fuchsia.logger/logger.fidl",
  //       "line": 114,
  //       "column": 10,
  //       "length": 3
  //   }
  //   "fuchsia.logger/LogSink"
  //   {
  //       "filename": "../../sdk/fidl/fuchsia.logger/logger.fidl",
  //       "line": 140,
  //       "column": 10,
  //       "length": 7
  //   }
  //
  // And use that information to add additional service links via the provideDocumentLinks()
  // method.

  private static _findLinksOredRegEx = new RegExp(
    '(?:(?:' +
    [
      // Note the suffix `.cmx?`: component URLs end in either '.cm' or '.cmx'
      /\bfuchsia-pkg:\/\/fuchsia.com\/(?<packageName>[-\w]+)(?:\?[^#]*)?#meta\/(?<componentName>[-\w]+)\.cmx?\b/,
      /(?:https?:\/\/)?fxr(?:ev.dev)?\/(?<revId>\d+)/,
      /(?:https?:\/\/)?fxb(?:ug.dev)?\/(?<bugId>\d+)/,
    ].map(r => r.source).join(')|(?:')
    + '))',
    'g'
  );

  private _findLinks(text: string): FuchsiAwareLink[] {
    const links: FuchsiAwareLink[] = [];
    let match;
    while ((match = Provider._findLinksOredRegEx.exec(text))) {
      const [
        fullMatch,
        packageName,
        componentName,
        revId,
        bugId,
      ] = match;
      const startIndex = match.index;
      const length = fullMatch.length;
      const webPath = revId ? `fxrev.dev/${revId}` : `fxbug.dev/${bugId}`;
      let tooltip: string | undefined;
      let uri: vscode.Uri | undefined;
      if (packageName && componentName) {
        const packageAndComponent = `${packageName}/${componentName}`;
        uri = this._packageAndComponentToManifestUri.get(packageAndComponent);
        if (NORMALIZE_WORD_SEPARATORS && !uri) {
          uri = this._packageAndComponentToManifestUri.get(_normalize(packageAndComponent));
        }
        if (uri) {
          tooltip = 'Open component manifest';
        } else if (SHOW_UNRESOLVED_TERMINAL_LINKS) {
          tooltip = 'Manifest not found!';
        } else {
          continue; // don't add the link
        }
      } else if (webPath) {
        uri = vscode.Uri.parse(`https://${webPath}`);
      }
      links.push({ startIndex, length, tooltip, uri });
    }
    return links;
  }

  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken,
  ): vscode.Location[] | undefined {
    const ext = document.uri.path.split('.').slice(-1)[0];
    // For unit testing, the document is virtual, and will be untitled, but we can check its
    // languageId. Otherwise, check its extension. For real manifest files, the language ID may
    // be json or json5.
    if (document.languageId !== 'untitled-fuchsia-manifest' && ext !== 'cml' && ext !== 'cmx') {
      return;
    }
    let sourcePath = document.uri.fsPath;
    if (document.uri.fsPath.startsWith(this._baseUri.fsPath)) {
      sourcePath = sourcePath.replace(this._baseUri.fsPath + '/', '');
    }
    let references = new Set<vscode.Location>();
    for (let packageAndComponent of this._sourcePathToPackageAndComponents.get(sourcePath) ?? []) {
      if (NORMALIZE_WORD_SEPARATORS) {
        packageAndComponent = _normalize(packageAndComponent);
      }
      this._packageAndComponentToReferences.get(
        packageAndComponent
      )?.forEach(reference => references.add(reference));
    }
    return Array.from(references.values());
  }

  provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.DocumentLink[] | undefined {
    const documentLinks: vscode.DocumentLink[] = [];
    for (const link of this._findLinks(document.getText())) {
      if (link.uri) {
        const startPos = document.positionAt(link.startIndex);
        const endPos = document.positionAt(link.startIndex + link.length);
        const linkRange = new vscode.Range(startPos, endPos);
        documentLinks.push(new vscode.DocumentLink(linkRange, link.uri));
      }
    }
    return documentLinks;
  }

  provideTerminalLinks(
    context: vscode.TerminalLinkContext,
    token: vscode.CancellationToken
  ): vscode.TerminalLink[] | undefined {
    return this._findLinks(context.line);
  }

  handleTerminalLink(link: FuchsiAwareLink) {
    if (!link.uri) {
      return;
    }
    if (['http', 'https'].indexOf(link.uri.scheme) >= 0) {
      vscode.env.openExternal(link.uri);
    } else {
      const document = vscode.workspace.openTextDocument(link.uri).then(document => {
        vscode.window.showTextDocument(document);
      });
    }
  }

  addLink(packageName: string, componentName: string, manifestPath: string) {
    let packageAndComponent = `${packageName}/${componentName}`;

    let manifestFileName = manifestPath.split('/').slice(-1)[0];
    let packageAndComponents = this._manifestFileNameToPackageAndComponents.get(manifestFileName);
    if (!packageAndComponents) {
      packageAndComponents = [];
      this._manifestFileNameToPackageAndComponents.set(packageAndComponent, packageAndComponents);
    }
    packageAndComponents.push(packageAndComponent);

    if (manifestPath.indexOf(`/${componentName}.cm`) >= 0) {
      this._componentToSomeManifestPath.set(componentName, manifestPath);
    }
    if (this._addLinkToMap(packageAndComponent, manifestPath)) {
      this._nonNormalizedLinksResolved++;
    }
    if (NORMALIZE_WORD_SEPARATORS) {
      const normalizedPackageAndComponent = _normalize(packageAndComponent);
      if (normalizedPackageAndComponent !== packageAndComponent) {
        const normalizedComponentName = _normalize(componentName);
        if (normalizedComponentName !== componentName) {
          if (_normalize(manifestPath).indexOf(`/${normalizedComponentName}.cm`) >= 0) {
            this._componentToSomeManifestPath.set(normalizedComponentName, manifestPath);
          }
        }
        this._addLinkToMap(normalizedPackageAndComponent, manifestPath);
      }
    }
  }

  private _addLinkToMap(packageAndComponent: string, manifestPath: string): boolean {
    let linkWasAdded = false;
    if (!this._packageAndComponentToManifestUri.get(packageAndComponent)) {
      linkWasAdded = true;
      const manifestUri = this._baseUri.with({ path: `${this._baseUri.path}/${manifestPath}` });
      this._packageAndComponentToManifestUri.set(packageAndComponent, manifestUri);
    }
    let packageAndComponents = this._sourcePathToPackageAndComponents.get(manifestPath);
    if (!packageAndComponents) {
      packageAndComponents = [];
      this._sourcePathToPackageAndComponents.set(manifestPath, packageAndComponents);
    }
    packageAndComponents.push(packageAndComponent);
    return linkWasAdded;
  }

  addReference(
    packageName: string,
    componentName: string,
    componentUrl: string,
    referencedByUri: vscode.Uri,
    lineNumber: number,
    column: number,
  ) {
    const packageAndComponent = `${packageName}/${componentName}`;
    const range = new vscode.Range(
      lineNumber,
      column,
      lineNumber,
      column + componentUrl.length,
    );
    this._addReferenceToMap(packageAndComponent, referencedByUri, range);
    if (NORMALIZE_WORD_SEPARATORS) {
      const normalizedPackageAndComponent = _normalize(packageAndComponent);
      if (normalizedPackageAndComponent !== packageAndComponent) {
        this._addReferenceToMap(normalizedPackageAndComponent, referencedByUri, range);
      }
    }
  }

  private _addReferenceToMap(
    packageAndComponent: string,
    referencedByUri: vscode.Uri,
    range: vscode.Range,
  ) {
    let references = this._packageAndComponentToReferences.get(packageAndComponent);
    if (!references) {
      references = [];
      this._packageAndComponentToReferences.set(packageAndComponent, references);
    }
    references.push(new vscode.Location(referencedByUri, range));
  }
}

function _normalize(nameOrTarget: string): string {
  return nameOrTarget.replace(/-/g, '_');
}
