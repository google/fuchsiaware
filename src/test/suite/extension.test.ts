import * as assert from 'assert';

import * as vscode from 'vscode';
import * as fuchsiaware from '../../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  const provider = new fuchsiaware.Provider();

  test('go_test_runner_extractBuildDirPackageNameAndComponents', () => {
    const line = ` build
      obj/src/sys/test_runners/gotests/go-test-runner/meta.far
      obj/src/sys/test_runners/gotests/go-test-runner/meta/contents
      obj/src/sys/test_runners/gotests/go-test-runner/meta.far.merkle
      obj/src/sys/test_runners/gotests/go-test-runner/blobs.json
      obj/src/sys/test_runners/gotests/go-test-runner/blobs.manifest
      obj/src/sys/test_runners/gotests/go-test-runner/package_manifest.json:
      __src_sys_test_runners_gotests_go-test-runner___build_toolchain_fuchsia_arm64__rule
      |
      ../../build/gn_run_binary.sh
      obj/src/sys/test_runners/gotests/go-test-runner_manifest
      host_x64/pm
      host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
      obj/src/sys/test_runners/gotests/go-test-runner_manifest.stamp
      obj/src/sys/test_runners/gotests/go-test-runner_metadata.stamp
      obj/src/sys/test_runners/gotests/go_test_runner.stamp
    `;

    const [
      targetBuildDir, packageTarget, componentTargets
    ] = fuchsiaware.Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/sys/test_runners/gotests');
    assert.strictEqual(packageTarget, 'go-test-runner');

    assert.deepStrictEqual(componentTargets, ['go_test_runner']);
  });

  test('elf_extractBuildDirPackageNameAndComponents', () => {
    const line = `
      build
        obj/src/sys/test_runners/elf/elf-test-runner/meta.far
        obj/src/sys/test_runners/elf/elf-test-runner/meta/contents
        obj/src/sys/test_runners/elf/elf-test-runner/meta.far.merkle
        obj/src/sys/test_runners/elf/elf-test-runner/blobs.json
        obj/src/sys/test_runners/elf/elf-test-runner/blobs.manifest
        obj/src/sys/test_runners/elf/elf-test-runner/package_manifest.json:
      __src_sys_test_runners_elf_elf-test-runner___build_toolchain_fuchsia_arm64__rule
      | ../../build/gn_run_binary.sh
        obj/src/sys/test_runners/elf/elf-test-runner_manifest
        host_x64/pm
        host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
        obj/src/sys/test_runners/elf/elf-test-runner-component.stamp
        obj/src/sys/test_runners/elf/elf-test-runner_manifest.stamp
        obj/src/sys/test_runners/elf/elf-test-runner_metadata.stamp
    `;

    const [
      targetBuildDir, packageTarget, componentTargets
    ] = fuchsiaware.Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/sys/test_runners/elf');
    assert.strictEqual(packageTarget, 'elf-test-runner');

    assert.deepStrictEqual(componentTargets, ['elf-test-runner-component']);
  });

  test('elf_extractManifestPathAndCmlComponent', () => {
    const line = `
      command = /usr/bin/env ../../build/gn_run_binary.sh
        ../../prebuilt/third_party/clang/mac-x64/bin
      host_x64/cmc compile
        ../../src/sys/test_runners/elf/meta/elf_test_runner.cml
        --output obj/src/sys/test_runners/elf/elf-test-runner.cm
        --includepath ../../
        --depfile obj/src/sys/test_runners/elf/elf-test-runner-component.d
    `;

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = fuchsiaware.Provider.extractManifestPathAndCmlComponent(line) ?? [];
    assert.strictEqual(manifestSourcePath, 'src/sys/test_runners/elf/meta/elf_test_runner.cml');
    assert.strictEqual(componentName, 'elf-test-runner');
    assert.strictEqual(componentTargetPath, 'src/sys/test_runners/elf:elf-test-runner-component');
  });

  test('extractBuildDirPackageNameAndComponents', () => {
    const line = `
      build
        obj/src/sys/component_manager/component-manager-tests/meta.far
        obj/src/sys/component_manager/component-manager-tests/meta/contents
        obj/src/sys/component_manager/component-manager-tests/meta.far.merkle
        obj/src/sys/component_manager/component-manager-tests/blobs.json
        obj/src/sys/component_manager/component-manager-tests/blobs.manifest
        obj/src/sys/component_manager/component-manager-tests/package_manifest.json:
      __src_sys_component_manager_component-manager-tests___build_toolchain_fuchsia_arm64__rule
      | ../../build/gn_run_binary.sh
        obj/src/sys/component_manager/component-manager-tests_manifest
        host_x64/pm
        obj/examples/components/basic/hello-world.stamp
        obj/examples/components/basic/lifecycle-full.stamp
        obj/garnet/examples/fidl/echo_server_rust/echo-server-rust-cmp.stamp
        obj/src/sys/component_manager/component-manager-boot-env-tests-cmp.stamp
        obj/src/sys/component_manager/component-manager-tests-cmp.stamp
        obj/src/sys/component_manager/component-manager-tests_manifest.stamp
        obj/src/sys/component_manager/component-manager-tests_metadata.stamp
        obj/src/sys/component_manager/component-manager-tests_test_component-manager-boot-env-tests-cmp.stamp
        obj/src/sys/component_manager/component-manager-tests_test_component-manager-tests-cmp.stamp
        obj/src/sys/component_manager/component_manager_tests_invalid_manifest.stamp
        ./run_indefinitely
        host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
    `;

    const [
      targetBuildDir, packageTarget, componentTargets
    ] = fuchsiaware.Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/sys/component_manager');
    assert.strictEqual(packageTarget, 'component-manager-tests');

    assert.deepStrictEqual(componentTargets, [
      'component-manager-boot-env-tests-cmp',
      'component-manager-tests-cmp'
    ]);
  });

  test('extractManifestPathAndCmxComponent', () => {
    const line = `
      command = /usr/bin/env ../../prebuilt/third_party/python3/mac-x64/bin/python3.8 -S
        ../../tools/cmc/build/validate_component_manifest_references.py
        --component_manifest
          ../../src/sys/component_manager/meta/component_manager_boot_env_tests.cmx
        --package_manifest
          gen/src/sys/component_manager/component-manager-boot-env-tests-cmp_validate_component_manifest_references_fini_file
        --gn-label
          //src/sys/component_manager$:component-manager-boot-env-tests-cmp_validate_component_manifest_references\(//build/toolchain/fuchsia$:arm64\)
        --stamp
          gen/src/sys/component_manager/component-manager-boot-env-tests-cmp_validate_component_manifest_references.action.stamp
    `;

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = fuchsiaware.Provider.extractManifestPathAndCmxComponent(line) ?? [];
    assert.strictEqual(manifestSourcePath, 'src/sys/component_manager/meta/component_manager_boot_env_tests.cmx');
    assert.strictEqual(componentName, 'component_manager_boot_env_tests');
    assert.strictEqual(componentTargetPath, 'src/sys/component_manager:component-manager-boot-env-tests-cmp');
  });

  test('extractPath', () => {
    const line = `
      command = /usr/bin/env ../../build/gn_run_binary.sh
        ../../prebuilt/third_party/clang/mac-x64/bin
        host_x64/pm
        -o obj/src/sys/test_manager/test_manager_pkg
        -m obj/src/sys/test_manager/test_manager_pkg_manifest
        -n test_manager
        -version 0
        build -output-package-manifest
        obj/src/sys/test_manager/test_manager_pkg/package_manifest.json
        -depfile -blobsfile -blobs-manifest
    `;

    const [
      packageName, packageTargetPath
    ] = fuchsiaware.Provider.extractPackage(line) ?? [];
    assert.strictEqual(packageName, 'test_manager');
    assert.strictEqual(packageTargetPath, 'src/sys/test_manager:test_manager_pkg');
  });

  test('matches .cm files (compiled cml)', async () => {
    const docWithComponentUrl = await vscode.workspace.openTextDocument({
      content: `
componentUrl: "fuchsia-pkg://fuchsia.com/some-package?1a2b3c4d5e6f#meta/some-component.cm"
`
    });
    provider.addLink(
      'some-package', 'some-component', vscode.Uri.file('src/some/path.cml_or_cmx'));
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
      'some-package', 'some-component', vscode.Uri.file('src/some/path.cml_or_cmx'));
    const links = provider.provideDocumentLinks(
      docWithComponentUrl, new vscode.CancellationTokenSource().token);
    assert.strictEqual(1, links?.length);
  });

  test('finds references to a manifest', async () => {
    const referencedManifestDoc = await vscode.languages.setTextDocumentLanguage(
      await vscode.workspace.openTextDocument({
        content: `{
    program: {
        binary: "bin/some_component_exe",
    },
}
`
      }),
      'untitled-fuchsia-manifest',
    );

    const docWithComponentUrl = await vscode.workspace.openTextDocument({
      content: `
componentUrl: "fuchsia-pkg://fuchsia.com/some-package?1a2b3c4d5e6f#meta/some-component.cmx"
`
    });
    provider.addLink(
      'some-package', 'some-component', referencedManifestDoc.uri);

    provider.addReference(
      'some-package',
      'some-component',
      vscode.Uri.file('src/some/path_to_some_referrer.txt'),
      10,
      5,
    );
    provider.addReference(
      'some-package',
      'some-component',
      vscode.Uri.file('src/some/path_to_another_referrer.txt'),
      10,
      5,
    );
    const references = provider.provideReferences(
      referencedManifestDoc,
      new vscode.Position(0, 0),
      { includeDeclaration: false },
      new vscode.CancellationTokenSource().token,
    );
    assert.strictEqual(2, references?.length);
  });
});
