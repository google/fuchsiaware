import * as vscode from 'vscode';
import * as fs from 'fs';
import * as readline from 'readline';

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('fuchsia package-to-source links extension is activated');
    const provider = new Provider();
    provider.init().then(() => {
        const providerRegistrations = vscode.Disposable.from(
            vscode.languages.registerDocumentLinkProvider({ scheme: Provider.scheme }, provider)
        );
        context.subscriptions.push(
            providerRegistrations
        );
    });
}

export class Provider implements vscode.DocumentLinkProvider {

    static scheme = '*';

    private _baseUri: vscode.Uri | null = null;
    private _packageAndComponentToSource = new Map<string, vscode.Uri>();

    async init() {
        this._packageAndComponentToSource = await this._readAllTheLinks();
    }

    dispose() {
        this._packageAndComponentToSource.clear();
    }

    private async _findFuchsiaBuildDir(): Promise<[vscode.Uri, string] | null> {
        let baseUri: vscode.Uri | null = null;
        for (const folder of (vscode.workspace.workspaceFolders || [])) {
            const buildDirUri = folder.uri.with({ path: folder.uri.path + '/.fx-build-dir' });
            const buildDirDoc = await vscode.workspace.openTextDocument(buildDirUri);
            const buildDir = buildDirDoc.getText().trim();
            return [folder.uri, buildDir];
        }
        return null;
    }

    private async _readAllTheLinks(): Promise<Map<string, vscode.Uri>> {
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

        const [baseUri, buildDir] = await this._findFuchsiaBuildDir() ?? [null, ''];
        if (!baseUri) {
            return packageAndComponentToSource;
        }

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
            const linkTarget = this._packageAndComponentToSource.get(`${packageName}/${componentName}`) ?? null;
            if (linkTarget !== null) {
                links.push(new vscode.DocumentLink(linkRange, linkTarget));
            }
        }
        return links;
    }

    // For testing
    addLink(packageAndComponent: string, uri: vscode.Uri) {
        this._packageAndComponentToSource.set(packageAndComponent, uri);
    }
}
