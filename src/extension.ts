import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';

const output = vscode.window.createOutputChannel('FuchsiAware');

function info(message: string) {
  output.appendLine(`INFO (fuchsiaware): ${message}`);
}

function warn(message: string) {
  output.appendLine(`WARNING (fuchsiaware): ${message}`);
  vscode.window.showWarningMessage(message);
}

function error(message: string) {
  output.appendLine(`ERROR (fuchsiaware): ${message}`);
  vscode.window.showErrorMessage(message);
}

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
  info('fuchsia package-to-source links extension is activated');
  const provider = new Provider();
  provider.init().then(() => {
    context.subscriptions.push(vscode.Disposable.from(
      vscode.languages.registerDocumentLinkProvider({ scheme: Provider.scheme }, provider),
    ));
    context.subscriptions.push(vscode.Disposable.from(
      vscode.languages.registerReferenceProvider({ scheme: Provider.scheme }, provider),
    ));
  });
}

export class Provider implements vscode.DocumentLinkProvider, vscode.ReferenceProvider {

  static scheme = '*';

  private _packageAndComponentToSource = new Map<string, vscode.Uri>();
  private _sourceToPackageAndComponent = new Map<string, string>();
  private _packageAndComponentToReferences = new Map<string, vscode.Location[]>();

  dispose() {
    this._packageAndComponentToSource.clear();
    this._sourceToPackageAndComponent.clear();
    this._packageAndComponentToReferences.clear();
  }

  async init() {
    const result = await this._findFuchsiaBuildDir();
    if (!result) {
      return;
    }

    const [baseUri, buildDir] = result;

    [
      [
        this._packageAndComponentToSource,
        this._sourceToPackageAndComponent,
      ],
      this._packageAndComponentToReferences,
    ] = await Promise.all([
      this._getLinksToManifests(baseUri, buildDir),
      this._getReferencesToManifests(baseUri, buildDir)
    ]);
  }

  private async _findFuchsiaBuildDir(): Promise<[vscode.Uri, string] | undefined> {
    const buildDirFilename = '.fx-build-dir';
    if (!vscode.workspace.workspaceFolders) {
      return;
    }
    for (const folder of (vscode.workspace.workspaceFolders || [])) {
      const buildDirUri = folder.uri.with({ path: `${folder.uri.path}/${buildDirFilename}` });
      const buildDirDoc = await vscode.workspace.openTextDocument(buildDirUri);
      if (buildDirDoc) {
        const buildDir = buildDirDoc.getText().trim();
        info(
          `Workspace folder '${folder.uri.fsPath}' contains the '${buildDirFilename}' file, which ` +
          `specifies that the current Fuchsia build directory is '${buildDir}'`
        );
        return [folder.uri, buildDir];
      } else {
        info(
          `Workspace folder '${folder.uri.fsPath}' does not contain a file named '${buildDirFilename}'`
        );
      }
    }
    warn(
      `Could not find file '${buildDirFilename}' in the root of any open VS Code workspace. ` +
      `If you have an open workspace for the 'fuchsia.git' source tree, make sure the ` +
      `workspace is rooted at the repository root directory (e.g., 'fuchsia'), and ` +
      'run `fx set ...` or `fx use ...`, then reload the VS Code window.'
    );
    return;
  }

  private async _getLinksToManifests(
    baseUri: vscode.Uri,
    buildDir: string
  ): Promise<[Map<string, vscode.Uri>, Map<string, string>]> {
    const cmlRegEx = new RegExp([
      /^\s*command\s*=.*\bcmc /,
      /compile \.\.\/\.\.\/(?<path>[^.]*\/(?<componentName>[^/.]+)\.cml)\s*/,
      /--output [^.]*\/(?<packageName>[-\w]+)\/[-\w]+.cm/,
    ].map(r => r.source).join(''));
    const cmxRegEx = new RegExp([
      /^\s*command\s*=.*\btools\/cmc\/build\/\w*.py /,
      /--package_manifest [^ ]*\/(?<packageName>[-\w]+)\.manifest .* /,
      /--component_manifests \.\.\/\.\.\/(?<path>[^.]*\/(?<componentName>[^/.]+)\.cmx)/,
    ].map(r => r.source).join(''));

    const packageAndComponentToSource = new Map<string, vscode.Uri>();
    const sourceToPackageAndComponent = new Map<string, string>();

    const ninjaTargetsUri = baseUri.with({ path: `${baseUri.path}/${buildDir}/toolchain.ninja` });
    const ninjaStream = fs.createReadStream(ninjaTargetsUri.fsPath);
    ninjaStream.on('error', (err) => {
      error(
        `Error reading the build dependencies from ${ninjaTargetsUri.fsPath}: '${err}'\n` +
        'You may need to re-run `fx set ...` and then reload your VS Code window.'
      );
    });
    const ninjaReadline = readline.createInterface(ninjaStream);

    let loggedAtLeastOneExample = false;

    for await (const line of ninjaReadline) {
      let match;
      let path;
      let componentName;
      let packageName;
      if ((match = cmlRegEx.exec(line))) {
        path = match[1];
        componentName = match[2];
        packageName = match[3];
      } else if ((match = cmxRegEx.exec(line))) {
        packageName = match[1];
        path = match[2];
        componentName = match[3];
      } else {
        continue;
      }
      const sourceUri = baseUri.with({ path: `${baseUri.path}/${path}` });
      const packageAndComponent = `${packageName}/${componentName}`;
      packageAndComponentToSource.set(packageAndComponent, sourceUri);
      sourceToPackageAndComponent.set(sourceUri.fsPath, packageAndComponent);
      if (!loggedAtLeastOneExample) {
        loggedAtLeastOneExample = true;
        info(
          `Getting links to manifests, based on build dependencies in ${ninjaTargetsUri.fsPath}, ` +
          `for example, '${sourceUri.fsPath}' is the manifest source for package '${packageName}', ` +
          `component '${componentName}'.`
        );
      }
    }

    if (!loggedAtLeastOneExample) {
      error(
        `None of the build dependency commands in '${ninjaTargetsUri.fsPath}' matched expected ` +
        `patterns associating a package and component to its manifest source:\n\n` +
        `  cmlRegEx = /${cmlRegEx}/\n` +
        `  cmxRegEx = /${cmxRegEx}/`
      );
    }

    return [packageAndComponentToSource, sourceToPackageAndComponent];
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
      `Searching for component URLs ('fuchsia-pkg://...cm[x]') referenced from any text document ` +
      `in the 'fuchsia.git' repo, by running the command:\n\n` +
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
        if (!loggedAtLeastOneExample) {
          loggedAtLeastOneExample = true;
          info(
            `Getting references to manifests. For example, '${componentUrl}' is referenced by ` +
            `'${location.uri.fsPath}:` +
            `${location.range.start.line + 1}:` +
            `${location.range.start.character + 1}:` +
            `${location.range.end.line + 1}:` +
            `${location.range.end.character + 1}`
          );
        }
        references.push(location);
      }
      if (!loggedAtLeastOneExample) {
        loggedAtLeastOneExample = true;
        warn(
          `Regex failed to match the first line returned from \`git grep\`.\n\n` +
          `  Line: '${matchedLine}'\n` +
          `  Regex: /${urlRegEx}/`
        );
      }
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
      const linkTarget = this._packageAndComponentToSource.get(`${packageName}/${componentName}`);
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
    if (document.languageId !== 'fuchsia-component-manifest' && ext !== 'cml' && ext !== 'cmx') {
      return;
    }
    const references: vscode.Location[] = [];
    const packageAndComponent = this._sourceToPackageAndComponent.get(document.uri.fsPath);
    if (!packageAndComponent) {
      return;
    }
    return this._packageAndComponentToReferences.get(packageAndComponent);
  }

  // For testing
  addLink(packageName: string, componentName: string, manifestUri: vscode.Uri) {
    const packageAndComponent = `${packageName}/${componentName}`;
    this._packageAndComponentToSource.set(packageAndComponent, manifestUri);
    this._sourceToPackageAndComponent.set(manifestUri.fsPath, packageAndComponent);
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
