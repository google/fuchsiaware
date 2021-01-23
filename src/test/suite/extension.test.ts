import * as assert from 'assert';

import * as vscode from 'vscode';
import * as fuchsiaware from '../../extension';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    const ext = vscode.extensions.getExtension('google-fuchsia.fuchsiaware');
    assert.strictEqual(true, ext?.isActive ?? false);

    const provider = new fuchsiaware.Provider();

    test('matches .cm files (compiled cml)', async () => {
        const docWithComponentUrl = await vscode.workspace.openTextDocument({
            content: `
componentUrl: "fuchsia-pkg://fuchsia.com/some-package?1a2b3c4d5e6f#meta/some-component.cm"
`
        });
        provider.addLink(
            'some-package/some-component', vscode.Uri.file('src/some/path.cml_or_cmx'));
        const links = provider.provideDocumentLinks(
            docWithComponentUrl, new vscode.CancellationTokenSource().token);
        assert.strictEqual(1, links?.length);
    });

    test('matches .cmx files', async () => {
        const docWithComponentUrl = await vscode.workspace.openTextDocument({
            content: `
componentUrl: "fuchsia-pkg://fuchsia.com/some-package?1a2b3c4d5e6f#meta/some-component.cmx"
`
        });
        provider.addLink(
            'some-package/some-component', vscode.Uri.file('src/some/path.cml_or_cmx'));
        const links = provider.provideDocumentLinks(
            docWithComponentUrl, new vscode.CancellationTokenSource().token);
        assert.strictEqual(1, links?.length);
    });
});
