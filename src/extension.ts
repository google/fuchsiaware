import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';

const fuchsiawareOutput = vscode.window.createOutputChannel('FuchsiAware');

function info(message: string) {
  console.log(`INFO (fuchsiaware): ${message}`);
  fuchsiawareOutput.appendLine(`INFO: ${message}`);
}

function warn(message: string) {
  console.log(`WARNING (fuchsiaware): ${message}`);
  fuchsiawareOutput.appendLine(`WARNING: ${message}`);
  vscode.window.showWarningMessage(message);
}

function error(message: string) {
  console.log(`ERROR (fuchsiaware): ${message}`);
  fuchsiawareOutput.appendLine(`ERROR: ${message}`);
  vscode.window.showErrorMessage(message);
}

function bug(message: string) {
  console.log(`BUG (fuchsiaware): ${message}`);
  fuchsiawareOutput.appendLine(`BUG: ${message}`);
  vscode.window.showErrorMessage(`BUG: ${message}`);
}

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
  info('The FuchsiAware extension is activated and looking for the fuchsia source...');
  const provider = new Provider();
  provider.init().then((success) => {
    if (success) {
      context.subscriptions.push(vscode.Disposable.from(
        vscode.languages.registerDocumentLinkProvider({ scheme: Provider.scheme }, provider),
      ));
      info('The DocumentLinkProvider is initialized and registered.');
      context.subscriptions.push(vscode.Disposable.from(
        vscode.languages.registerReferenceProvider({ scheme: Provider.scheme }, provider),
      ));
      info('The ReferenceProvider is initialized and registered.');
    }
  });
}

export class Provider implements vscode.DocumentLinkProvider, vscode.ReferenceProvider {

  static scheme = '*';

  private _packageAndComponentToSourceUri = new Map<string, vscode.Uri>();
  private _sourcePathToPackageAndComponent = new Map<string, string>();
  private _packageAndComponentToReferences = new Map<string, vscode.Location[]>();

  dispose() {
    this._packageAndComponentToSourceUri.clear();
    this._sourcePathToPackageAndComponent.clear();
    this._packageAndComponentToReferences.clear();
  }

  async init(): Promise<boolean> {
    const result = await this._findFuchsiaBuildDir();
    if (!result) {
      return false;
    }

    const [baseUri, buildDir] = result;

    const [linksResult, referencesResult] = await Promise.all([
      this._getLinksToManifests(baseUri, buildDir),
      this._getReferencesToManifests(baseUri, buildDir)
    ]);

    if (!linksResult || !referencesResult) {
      return false;
    }

    [
      this._packageAndComponentToSourceUri,
      this._sourcePathToPackageAndComponent,
    ] = linksResult;

    this._packageAndComponentToReferences = referencesResult;

    return true;
  }

  private async _findFuchsiaBuildDir(): Promise<[vscode.Uri, string] | undefined> {
    const buildDirFilename = '.fx-build-dir';
    const fuchsiaDirSettingKey = 'fuchsia.rootDirectory';
    if (!vscode.workspace.workspaceFolders) {
      return;
    }
    let useFuchsiaDirFromEnv = false;
    let fuchsiaDirFromEnv: string | undefined =
      vscode.workspace.getConfiguration().get(fuchsiaDirSettingKey);
    let fuchsiaDirVariable;
    if (fuchsiaDirFromEnv) {
      fuchsiaDirVariable = `VS Code setting '${fuchsiaDirSettingKey}'`;
      useFuchsiaDirFromEnv = true;
    } else {
      fuchsiaDirFromEnv = process.env.FUCHSIA_DIR;
      if (fuchsiaDirFromEnv) {
        fuchsiaDirVariable = `environment variable '$FUCHSIA_DIR'`;
      } else {
        fuchsiaDirFromEnv = process.env.FUCHSIA_ROOT;
        if (fuchsiaDirFromEnv) {
          fuchsiaDirVariable = `environment variable '$FUCHSIA_ROOT'`;
        }
      }
    }
    let fuchsiaSubdirUri;
    for (const folder of vscode.workspace.workspaceFolders) {
      let buildDir;
      if (!useFuchsiaDirFromEnv || folder.uri.path === fuchsiaDirFromEnv) {
        buildDir = await this._readBuildDirDoc(folder.uri, buildDirFilename);
      }
      if (buildDir) {
        return [folder.uri, buildDir];
      } else if (!fuchsiaSubdirUri && fuchsiaDirFromEnv &&
        folder.uri.fsPath.startsWith(fuchsiaDirFromEnv)) {
        fuchsiaSubdirUri = folder.uri;
      }
    }
    if (!useFuchsiaDirFromEnv) {
      info(
        `Could not find file '${buildDirFilename}' in the root of any workspace folder: \n  ` +
        vscode.workspace.workspaceFolders.map((folder) => folder.uri).join('\n  ')
      );
    }
    if (fuchsiaDirFromEnv) {
      if (fuchsiaSubdirUri) {
        const fuchsiaDirUri = fuchsiaSubdirUri.with({ path: fuchsiaDirFromEnv });
        const buildDir = await this._readBuildDirDoc(fuchsiaDirUri, buildDirFilename);
        if (buildDir) {
          info(`Loading provider data from ${fuchsiaDirVariable} = '${fuchsiaDirUri}'`);
          return [fuchsiaDirUri, buildDir];
        } else {
          info(
            `nor was it found in the directory from ${fuchsiaDirVariable} (${fuchsiaDirUri}).`
          );
        }
      } else {
        info(
          `nor was any workspace folder found under the directory from ${fuchsiaDirVariable} ` +
          `(${fuchsiaDirFromEnv}).`
        );
      }
    } else {
      info(
        `and the fuchsia root directory could not be determined from either ` +
        `settings ('${fuchsiaDirSettingKey}') or an environment variable ($FUCHSIA_DIR or ` +
        `$FUCHSIA_ROOT.`
      );
    }
    info(
      `If you have an open workspace for the 'fuchsia.git' source tree, make sure the ` +
      `workspace is rooted at the repository root directory (e.g., 'fuchsia'), and ` +
      'run `fx set ...` or `fx use ...`, then reload the VS Code window.'
    );
    return;
  }

  private async _readBuildDirDoc(
    folderUri: vscode.Uri,
    buildDirFilename: string
  ): Promise<string | undefined> {
    const buildDirFileUri = folderUri.with({ path: `${folderUri.path}/${buildDirFilename}` });
    try {
      const buildDirDoc = await vscode.workspace.openTextDocument(buildDirFileUri);
      const buildDir = buildDirDoc.getText().trim();
      info(
        `Folder '${folderUri.fsPath}' contains the '${buildDirFilename}' file, ` +
        `which specifies that the current Fuchsia build directory is '${buildDir}'`
      );
      return buildDir;
    } catch (err) {
      return;
    } // the file probably doesn't exist in this folder
  }

  private async _getLinksToManifests(
    baseUri: vscode.Uri,
    buildDir: string
  ): Promise<[Map<string, vscode.Uri>, Map<string, string>] | undefined> {
    // TODO(richkadel): Add integration tests to ensure the patterns are found in an actual fuchsia
    // toolchain.ninja file. As build rules sometimes change, these patterns may need to be updated.

    // TODO(richkadel): These patterns are very fragile and subject to breakage when GN rules
    // change. Plus, since they only search the results from `fx set`, the results are limited to
    // the packages in the current set of dependencies (which isn't terrible, but not great for
    // general browsing, or to find a dependency.)
    // Alternative 1: Find a better way to query the dependencies.
    // Alternative 2: Parse the BUILD.gn files (not recommended)
    // And, consider running GN from the extension, to generate a custom ninja result, with a broad
    // set of targets, but if possible, a narrow set of output targets (only those needed for
    // the extension).

    const componentTargetPathToPackageTargetPath = new Map<string, string>();
    const componentTargetPathToComponentNameAndManifest = new Map<string, [string, string]>();
    const packageTargetPathToPackageName = new Map<string, string>();

    const ninjaFileUri = baseUri.with({ path: `${baseUri.path}/${buildDir}/toolchain.ninja` });
    const ninjaStream = fs.createReadStream(ninjaFileUri.fsPath);
    ninjaStream.on('error', (err) => {
      error(
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


        // TODO(richkadel): REMOVE ME! ...
        if (targetBuildDir.indexOf('go-test-runner') >= 0 ||
          packageTarget.indexOf('go-test-runner') >= 0) {
          console.log('break here');
        }



        for (const componentTarget of componentTargets) {
          const packageTargetPath = `${targetBuildDir}:${packageTarget}`;
          const componentTargetPath = `${targetBuildDir}:${componentTarget}`;
          if (!matchedAtLeastOneMetaFarExample) {
            matchedAtLeastOneMetaFarExample = true;
            info(
              `Associating packages to components based on build dependencies in ` +
              `${ninjaFileUri.fsPath}, for example, package '${packageTarget}' will include at ` +
              `least the component built from ninja target '${componentTargetPath}'.`
            );
          }
          componentTargetPathToPackageTargetPath.set(componentTargetPath, packageTargetPath);
        }
      } else if ((result = Provider.extractManifestPathAndCmxComponent(line)) ||
        (result = Provider.extractManifestPathAndCmlComponent(line))) {
        const [manifestSourcePath, componentName, componentTargetPath] = result;
        if (!matchedAtLeastOneManifestAndComponentExample) {
          matchedAtLeastOneManifestAndComponentExample = true;
          info(
            `Matching components to manifests based on build commands in ${ninjaFileUri.fsPath}, ` +
            `for example, '${manifestSourcePath}' is the manifest source for ` +
            `a component to be named '${componentName}', and built via ninja target ` +
            `'${componentTargetPath}'.`
          );
        }


        // TODO(richkadel): REMOVE ME! ...
        if (manifestSourcePath.indexOf('go_test_runner') >= 0) {
          console.log('break here');
        }



        // TODO(richkadel): REMOVE ME! ...
        if (componentTargetPathToComponentNameAndManifest.get(componentTargetPath) &&
          componentTargetPathToComponentNameAndManifest.get(componentTargetPath) !==
          [componentName, manifestSourcePath]) {
          console.log(
            `conflict: componentTargetPath '${componentTargetPath}' has duplicate entries: ${componentTargetPathToComponentNameAndManifest.get(componentTargetPath)} != ${[componentName, manifestSourcePath]}`
          );
        }




        componentTargetPathToComponentNameAndManifest.set(
          componentTargetPath,
          [componentName, manifestSourcePath]
        );
      } else if ((result = Provider.extractPackage(line))) {
        const [packageName, packageTargetPath] = result;
        if (!matchedAtLeastOnePmBuildExample) {
          matchedAtLeastOnePmBuildExample = true;
          info(
            `Matching package targets to package names based on build commands in ${ninjaFileUri.fsPath}, ` +
            `for example, '${packageTargetPath}' is the build target for ` +
            `a package to be named '${packageName}',`
          );
        }


        // TODO(richkadel): REMOVE ME! ...
        if (packageName.indexOf('go-test-runner') >= 0) {
          console.log('break here');
        }



        // TODO(richkadel): REMOVE ME! ...
        if (packageTargetPathToPackageName.get(packageTargetPath) &&
          packageTargetPathToPackageName.get(packageTargetPath) !==
          packageName) {
          console.log(
            `conflict: packageTargetPath '${packageTargetPath}' has duplicate entries: ${packageTargetPathToPackageName.get(packageTargetPath)} != ${packageName}`
          );
        }




        packageTargetPathToPackageName.set(packageTargetPath, packageName);
      }
    }

    if (!matchedAtLeastOneMetaFarExample) {
      error(
        `The ninja build file '${ninjaFileUri.fsPath}' did not contain any lines matching the ` +
        `expected pattern to identify components in a 'build meta.far' statement: \n\n` +
        `  metaFarRegEx = ${Provider._metaFarRegEx}\n`
      );
      return;
    } else if (!matchedAtLeastOneManifestAndComponentExample) {
      error(
        `The ninja build file '${ninjaFileUri.fsPath}' did not contain any lines matching the ` +
        `expected pattern to identify components in a 'validate .cmx manifest' command: \n\n` +
        `  validateCmxRegEx = ${Provider._validateCmxRegEx}\n`
      );
      return;
    } else if (!matchedAtLeastOnePmBuildExample) {
      error(
        `The ninja build file '${ninjaFileUri.fsPath}' did not contain any lines matching the ` +
        `expected pattern to identify components in a 'build package' command: \n\n` +
        `  pmBuildRegEx = ${Provider._pmBuildRegEx}\n`
      );
      return;
    }

    const packageAndComponentToSourceUri = new Map();
    const sourcePathToPackageAndComponent = new Map();
    for (const [componentTarget, packageTargetPath] of componentTargetPathToPackageTargetPath.entries()) {
      const packageName = packageTargetPathToPackageName.get(packageTargetPath);


      // TODO(richkadel): REMOVE ME! ...
      if (packageTargetPath.indexOf('go_test_runner') >= 0) {
        console.log('break here');
      }



      if (!packageName) {
        continue;
      }
      const values = componentTargetPathToComponentNameAndManifest.get(componentTarget);
      if (!values) {
        continue;
      }
      const [componentName, manifestSourcePath] = values;
      const packageAndComponent = `${packageName}/${componentName}`;
      const sourcePath = `${baseUri.path}/${manifestSourcePath}`;
      const sourceUri = baseUri.with({ path: sourcePath });
      packageAndComponentToSourceUri.set(packageAndComponent, sourceUri);
      sourcePathToPackageAndComponent.set(sourcePath, packageAndComponent);
    }

    info('The data required by the DocumentLinkProvider is loaded.');
    return [packageAndComponentToSourceUri, sourcePathToPackageAndComponent];
  }

  private static _metaFarRegEx = new RegExp([
    `^\\s*build\\s*obj/(?<targetBuildDir>[^.]+?)/(?<packageTarget>[-\\w]+)/meta\.far`,
    `\\s*(?<ignoreOtherOutputs>[^:]+)\\s*:`,
    `\\s*(?<ignoreNinjaRulename>[^\\s]+)`,
    `\\s*(?<ignoreInputs>[^|]+)\\|`,
    `(?<dependencies>(.|\n)*)`,
  ].join(''));

  static extractBuildDirPackageTargetAndComponents(line: string): [string, string, string[]] | undefined {
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
      `\\sobj/${targetBuildDir}/(?!${packageTarget}_test_)`,
      // `(?<componentTarget>[^/]+)`,
      // `(?!_manifest)(?!_metadata).stamp`,
      `(?:`,
      `(?:[^/]+_manifest.stamp)|`,
      `(?:[^/]+_metadata.stamp)|`,
      `(?<componentTarget>[^/]+).stamp)`,
    ].join(''), 'g');
    let depMatch;
    while ((depMatch = depRegEx.exec(dependencies))) {
      if (depMatch[1]) {
        componentTargets.push(depMatch[1]);
      }
    }

    return [
      targetBuildDir,
      packageTarget,
      componentTargets,
    ];
  }

  // TODO(richkadel): REMOVE ME! ...
  //    /(?:.|\n)*?--component_manifest\s*\.\.\/\.\.\/(?<manifestSourcePath>[^\s]*\/(?<componentName>[^/.]+)\.cm[lx]?)/,

  private static _validateCmxRegEx = new RegExp([
    /^\s*command\s*=(?:.|\n)*?\/validate_component_manifest_references\.py/,
    /(?:.|\n)*?--component_manifest\s+\.\.\/\.\.\/(?<manifestSourcePath>[^\s]*\/(?<componentName>[^/.]+)\.cmx]?)/,
    /(?:.|\n)*?--gn-label\s+\/\/(?<targetBuildDir>[^$]+)\$:(?<componentTarget>[-\w]+)_validate_component_manifest_references\b/,
  ].map(r => r.source).join(''));

  static extractManifestPathAndCmxComponent(line: string): [string, string, string] | undefined {
    const match = Provider._validateCmxRegEx.exec(line);
    if (!match) {
      return;
    }

    const [
      , // full match
      manifestSourcePath,
      componentName,
      targetBuildDir,
      componentTarget,
    ] = match;

    const componentTargetPath = `${targetBuildDir}:${componentTarget}`;

    return [
      manifestSourcePath,
      componentName,
      componentTargetPath,
    ];
  }

  private static _cmcBuildRegEx = new RegExp([
    /^\s*command\s*=(?:.|\n)*?\/cmc\s+compile/,
    /\s+\.\.\/\.\.\/(?<manifestSourcePath>[^.]+\.cml]?)/,
    /\s+--output\s+obj\/[^\s]+\/(?<componentName>[^/.]+)\.cm\s/,
    /(?:.|\n)*--depfile\s+obj\/(?<targetBuildDir>[^\s]+)\/(?<componentTarget>[^/.]+)\.d/,
  ].map(r => r.source).join(''));

  static extractManifestPathAndCmlComponent(line: string): [string, string, string] | undefined {
    const match = Provider._cmcBuildRegEx.exec(line);
    if (!match) {
      return;
    }

    const [
      , // full match
      manifestSourcePath,
      componentName,
      targetBuildDir,
      componentTarget,
    ] = match;

    const componentTargetPath = `${targetBuildDir}:${componentTarget}`;

    return [
      manifestSourcePath,
      componentName,
      componentTargetPath,
    ];
  }

  private static _pmBuildRegEx = new RegExp([
    /^\s*command\s*=(?:.|\n)*?\/pm/,
    /\s+-o\s+obj\/(?<targetBuildDir>[^\s]+)\/(?<packageTarget>[^\s]+)\s/,
    /(?:.|\n)*?-n\s+(?<packageName>[-\w]+)\s/,
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

  private async _getReferencesToManifests(
    baseUri: vscode.Uri,
    buildDir: string
  ): Promise<Map<string, vscode.Location[]>> {
    const packageAndComponentToReferences = new Map<string, vscode.Location[]>();

    const gitArgs = [
      '--no-pager',
      'grep',
      '--recurse-submodules',
      '-I',
      '--extended-regexp',
      '--line-number',
      // '--column',
      // '--only-matching', // grep BUG! --column value is wrong for second match in line
      '--no-column',
      '--no-color',
      'fuchsia-pkg://fuchsia.com/([^#]*)#meta/(-|\\w)*\\.cmx?',
    ];

    info(
      `Searching for component URLs('fuchsia-pkg://...cm[x]') referenced from any text document ` +
      `in the 'fuchsia.git' repo, by running the command: \n\n` +
      `  \`git ${gitArgs.join(' ')}\`\n\n` +
      `from the '${baseUri.path}' directory.`
    );

    let gitGrep = child_process.spawnSync(
      'git',
      gitArgs,
      { cwd: `${baseUri.path}` }
    );

    if (gitGrep.error) {
      error(
        `Error executing the \`git grep\` command: '${gitGrep.error}'\n`
      );
      return packageAndComponentToReferences; // return an empty map
    }

    if (gitGrep.status !== 0) {
      error(
        `Error (${gitGrep.status}) executing the \`git grep\` command: '${gitGrep.stderr}'\n`
      );
      return packageAndComponentToReferences; // return an empty map
    }

    const text = gitGrep.stdout.toString();

    // patterns end in either '.cm' or '.cmx'
    const urlRegEx = /\bfuchsia-pkg:\/\/fuchsia.com\/([-\w]+)(?:\?[^#]*)?#meta\/([-\w]+).cmx?\b/g;

    let loggedAtLeastOneExample = false;

    let start = 0;
    while (start < text.length) {
      let end = text.indexOf('\n', start);
      if (end === -1) {
        end = text.length;
      }
      const line = text.substr(start, end - start);
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
        const packageAndComponent = `${packageName}/${componentName}`;
        const sourceUri = baseUri.with({ path: `${baseUri.path}/${path}` });
        const range = new vscode.Range(
          lineNumber,
          column,
          lineNumber,
          column + componentUrl.length,
        );
        const location = new vscode.Location(sourceUri, range);
        let references = packageAndComponentToReferences.get(packageAndComponent);
        if (!references) {
          references = [];
          packageAndComponentToReferences.set(packageAndComponent, references);
        }


        // TODO(richkadel): REMOVE ME! ...
        if (packageAndComponent.indexOf('memfs') >= 0) {
          console.log('break here');
        }



        if (!loggedAtLeastOneExample) {
          loggedAtLeastOneExample = true;
          info([
            `Getting references to manifests. For example, '${componentUrl}' is referenced by `,
            `'${location.uri.fsPath}:`,
            `${location.range.start.line + 1}:`,
            `${location.range.start.character + 1}:`,
            `${location.range.end.line + 1}:`,
            `${location.range.end.character + 1}`,
          ].join(''));
        }
        references.push(location);
      }
      if (!loggedAtLeastOneExample) {
        loggedAtLeastOneExample = true;
        warn(
          `RegEx failed to match the first line returned from \`git grep\`.\n\n` +
          `  Line: '${matchedLine}'\n` +
          `  RegEx: ${urlRegEx}`
        );
      }
    }

    if (loggedAtLeastOneExample) {
      info('The data required by the ReferenceProvider is loaded.');
    } else {
      error(
        `No component URLs ('fuchsia-pkg://...cm[x]') were found in the 'fuchsia.git' repo, by ` +
        `running the command:\n\n` +
        `  \`git ${gitArgs.join(' ')}\`\n\n` +
        `from the '${baseUri.path}' directory.`
      );
    }
    return packageAndComponentToReferences;
  }

  // TODO(richkadel): find links to fuchsia Service declarations in .fidl files, using
  //   warning, vscode.provideWorkspaceSymbols("**/*.fidl.json") may not have all of these files in the workspace
  // VS Code API equivalent of:
  //   $ find ${baseUri}/${buildDir} -name '*fidl.json'
  // for each matched file:
  //   $ jq '.interface_declarations[] | .name,.location' ${baseUri}/${buildDir}/fidling/gen/sdk/fidl/fuchsia.logger/fuchsia.logger.fidl.json
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

  provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.DocumentLink[] | undefined {
    // patterns end in either '.cm' or '.cmx'
    const regEx = /\bfuchsia-pkg:\/\/fuchsia.com\/([-\w]+)(?:\?[^#]*)?#meta\/([-\w]+).cmx?\b/g;
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();
    let match;
    while ((match = regEx.exec(text))) {
      const packageName = match[1];
      const componentName = match[2];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const linkRange = new vscode.Range(startPos, endPos);
      const linkTarget = this._packageAndComponentToSourceUri.get(`${packageName}/${componentName}`);
      if (linkTarget) {
        links.push(new vscode.DocumentLink(linkRange, linkTarget));
      }
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
    const references: vscode.Location[] = [];
    const packageAndComponent = this._sourcePathToPackageAndComponent.get(document.uri.fsPath);
    if (!packageAndComponent) {
      return;
    }
    return this._packageAndComponentToReferences.get(packageAndComponent);
  }

  // For testing
  addLink(packageName: string, componentName: string, manifestUri: vscode.Uri) {
    const packageAndComponent = `${packageName}/${componentName}`;
    this._packageAndComponentToSourceUri.set(packageAndComponent, manifestUri);
    this._sourcePathToPackageAndComponent.set(manifestUri.fsPath, packageAndComponent);
  }

  // For testing
  addReference(
    packageName: string,
    componentName: string,
    referencedByUri: vscode.Uri,
    lineNumber: number,
    column: number,
  ) {
    const packageAndComponent = `${packageName}/${componentName}`;
    const componentUrl = `fuchsia-pkg://fuchsia.com/${packageName}#meta/${componentName}.cm`;
    const range = new vscode.Range(
      lineNumber,
      column,
      lineNumber,
      column + componentUrl.length,
    );
    let references = this._packageAndComponentToReferences.get(packageAndComponent);
    if (!references) {
      references = [];
      this._packageAndComponentToReferences.set(packageAndComponent, references);
    }
    references.push(new vscode.Location(referencedByUri, range));
  }
}
