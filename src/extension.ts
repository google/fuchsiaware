import * as vscode from 'vscode';
import * as fs from 'fs';
import * as readline from 'readline';

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('fuchsia package-to-source links extension is activated');
  const provider = new Provider(context);
}

class Provider implements vscode.DocumentLinkProvider {

  static scheme = '*';

  private _baseUri!: vscode.Uri;
  private _packageAndComponentToSource = new Map<string, vscode.Uri>();

  constructor(context: vscode.ExtensionContext) {
    const baseUri = vscode.workspace.workspaceFolders?.[0]?.uri;

    if (baseUri != null) {
      this._baseUri = baseUri;
      const buildDirUri = this._baseUri.with({ path: this._baseUri.path + '/.fx-build-dir' });
      const buildDirDoc = vscode.workspace.openTextDocument(buildDirUri);
      buildDirDoc.then(document => {
        const buildDir = document.getText().trim();

        this._readAllTheLinks(baseUri, buildDir).then(packageAndComponentToSource => {
          this._packageAndComponentToSource = packageAndComponentToSource;
          const providerRegistrations = vscode.Disposable.from(
            vscode.languages.registerDocumentLinkProvider({ scheme: Provider.scheme }, this)
          );

          context.subscriptions.push(
            providerRegistrations
          );
        });
      });
    }
  }

  dispose() {
    this._packageAndComponentToSource.clear();
  }

  private async _readAllTheLinks(
    baseUri: vscode.Uri, buildDir: string
  ): Promise<Map<string, vscode.Uri>> {
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

    const ninjaTargetsUri = baseUri.with({ path: `${baseUri.path}/${buildDir}/toolchain.ninja` });
    const stream = fs.createReadStream(ninjaTargetsUri.fsPath);
    const rl = readline.createInterface(stream);

    for await (const line of rl) {
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
      packageAndComponentToSource.set(`${packageName}/${componentName}`, sourceUri);
    }
    return packageAndComponentToSource;
  }

  provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentLink[] | undefined {
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
      if (linkTarget != null) {
        links.push(new vscode.DocumentLink(linkRange, linkTarget));
      }
    }
    return links;
  }
}
