import * as assert from 'assert';

import * as vscode from 'vscode';
import * as fuchsiaware from '../../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  const provider = new fuchsiaware.Provider();

  // TODO(richkadel): Replace these hardcoded copies of specific lines from the `toolchain.ninja`
  // file with a cached but quickly refreshed copy of the developer's most current `toolchain.ninja`
  // (at least the subset of lines relevant to this extension). Each 'line' value below can then
  // be replaced with a regex to pull the specific required line from the cached and current data.
  // This way the test can validate that the expected format has not changed.

  // TODO(richkadel): Add an integration test that loops throught all extracted packageAndComponent
  // pairs, formats them into 'fuchsia-pkg://...' URLs, gets the manifest URIs from
  // provideDocumentLinks(), and validates the files exist. Generate stats for the number of
  // valid and invalid links.

  test('session_manager_extractBuildDirPackageNameAndComponents', () => {
    const line = `
build
obj/src/session/bin/session_manager/session_manager/meta.far
obj/src/session/bin/session_manager/session_manager/meta/contents
obj/src/session/bin/session_manager/session_manager/meta.far.merkle
obj/src/session/bin/session_manager/session_manager/blobs.json
obj/src/session/bin/session_manager/session_manager/blobs.manifest
obj/src/session/bin/session_manager/session_manager/package_manifest.json:
__src_session_bin_session_manager_session_manager___build_toolchain_fuchsia_arm64__rule
|
../../build/gn_run_binary.sh
obj/src/session/bin/session_manager/session_manager_manifest
host_x64/pm
obj/src/session/bin/session_manager/session_manager_component.stamp
obj/src/session/bin/session_manager/session_manager_manifest.stamp
obj/src/session/bin/session_manager/session_manager_metadata.stamp
host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
    `;

    const [
      targetBuildDir, packageTarget, componentTargets
    ] = fuchsiaware.Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/session/bin/session_manager');
    assert.strictEqual(packageTarget, 'session_manager');

    assert.deepStrictEqual(componentTargets, [
      'session_manager_component',
    ]);
  });

  test('ime_keyboard_test_extractBuildDirPackageNameAndComponents', () => {
    const line = `
build
obj/src/ui/bin/ime/keyboard_test/meta.far
obj/src/ui/bin/ime/keyboard_test/meta/contents
obj/src/ui/bin/ime/keyboard_test/meta.far.merkle
obj/src/ui/bin/ime/keyboard_test/blobs.json
obj/src/ui/bin/ime/keyboard_test/blobs.manifest
obj/src/ui/bin/ime/keyboard_test/package_manifest.json:
__src_ui_bin_ime_keyboard_test___build_toolchain_fuchsia_arm64__rule
| ../../build/gn_run_binary.sh
obj/src/ui/bin/ime/keyboard_test.manifest
host_x64/pm
obj/build/deprecated_package.stamp
host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
./default_hardware_ime
./ime_service
./ime_service_integration_test
./keyboard3_integration_test
obj/src/ui/bin/ime/keyboard_test.manifest.stamp
obj/src/ui/bin/ime/keyboard_test.resource.resource.goldens_en-us.json.stamp
obj/src/ui/bin/ime/keyboard_test.resource.resource.us.json.stamp
./keyboard_test_bin
obj/src/ui/bin/ime/keyboard_test_default_hardware_ime.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_default_hardware_ime.cmx_component_index.stamp
obj/src/ui/bin/ime/keyboard_test_ime_service.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_ime_service.cmx_component_index.stamp
obj/src/ui/bin/ime/keyboard_test_ime_service_integration_test.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_ime_service_integration_test.cmx_component_index.stamp
obj/src/ui/bin/ime/keyboard_test_keyboard3_integration_test.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_keyboard3_integration_test.cmx_component_index.stamp
obj/src/ui/bin/ime/keyboard_test_keyboard_test_bin.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_keyboard_test_bin.cmx_component_index.stamp
obj/src/ui/bin/ime/keyboard_test_metadata.stamp
obj/src/ui/bin/ime/keyboard_test_test/ime_service_integration_test_test_spec.stamp
obj/src/ui/bin/ime/keyboard_test_test/keyboard3_integration_test_test_spec.stamp
obj/src/ui/bin/ime/keyboard_test_test/keyboard_test_bin_test_spec.stamp
obj/src/ui/bin/ime/keyboard_test_validate_manifests_default_hardware_ime.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_validate_manifests_ime_service.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_validate_manifests_ime_service_integration_test.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_validate_manifests_keyboard3_integration_test.cmx.stamp
obj/src/ui/bin/ime/keyboard_test_validate_manifests_keyboard_test_bin.cmx.stamp
    `;

    const [
      targetBuildDir, packageTarget, componentTargets
    ] = fuchsiaware.Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/ui/bin/ime');
    assert.strictEqual(packageTarget, 'keyboard_test');

    assert.deepStrictEqual(componentTargets, [
      'default_hardware_ime.cmx',
      'ime_service.cmx',
      'ime_service_integration_test.cmx',
      'keyboard3_integration_test.cmx',
      'keyboard_test_bin.cmx',
    ]);
  });

  test('inspect_codelab_extractManifestPathAndCmxComponent', () => {
    const line = `
command
=
/usr/bin/env
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/linux-x64/bin
host_x64/cmc
--stamp
gen/examples/diagnostics/inspect/codelab/cpp/part_1/tests/inspect_cpp_codelab_part_1_integration_test_cmc_validate_references.action.stamp
validate-references
--component-manifest
../../examples/diagnostics/inspect/codelab/cpp/part_1/tests/integration_part_1.cmx
--package-manifest
gen/examples/diagnostics/inspect/codelab/cpp/part_1/tests/inspect_cpp_codelab_part_1_integration_test_cmc_validate_references_fini_file
--gn-label
//examples/diagnostics/inspect/codelab/cpp/part_1/tests$:inspect_cpp_codelab_part_1_integration_test_cmc_validate_references\(//build/toolchain/fuchsia$:arm64\)
    `;

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = fuchsiaware.Provider.extractManifestPathAndCmxComponent(line) ?? [];
    assert.strictEqual(
      manifestSourcePath,
      'examples/diagnostics/inspect/codelab/cpp/part_1/tests/integration_part_1.cmx'
    );
    assert.strictEqual(componentName, 'integration_part_1');
    assert.strictEqual(
      componentTargetPath,
      'examples/diagnostics/inspect/codelab/cpp/part_1/tests:inspect_cpp_codelab_part_1_integration_test'
    );
  });

  test('fonts_extractManifestPathAndCmxComponent', () => {
    const line = `
command
=
/usr/bin/env
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/linux-x64/bin
host_x64/cmc
--stamp
gen/src/fonts/pkg_validate_manifests_fonts.cmx.action.stamp
validate-references
--component-manifest
../../src/fonts/meta/fonts.cmx
--package-manifest
obj/src/fonts/pkg.manifest
--gn-label
//src/fonts$:pkg\(//build/toolchain/fuchsia$:arm64\)
    `;

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = fuchsiaware.Provider.extractManifestPathAndCmxComponent(line) ?? [];
    assert.strictEqual(manifestSourcePath, 'src/fonts/meta/fonts.cmx');
    assert.strictEqual(componentName, 'fonts');
    assert.strictEqual(componentTargetPath, 'src/fonts:fonts.cmx');
  });

  test('go_test_runner_extractBuildDirPackageNameAndComponents', () => {
    const line = `
build
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
|
../../build/gn_run_binary.sh
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
|
../../build/gn_run_binary.sh
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
      'component-manager-tests-cmp',
      'test_component-manager-boot-env-tests-cmp',
      'test_component-manager-tests-cmp',
      'component_manager_tests_invalid_manifest',
    ]);
  });

  test('scenic_extractBuildDirPackageNameAndComponents', () => {
    const line = `
build
obj/src/ui/scenic/scenic_pkg/meta.far
obj/src/ui/scenic/scenic_pkg/meta/contents
obj/src/ui/scenic/scenic_pkg/meta.far.merkle
obj/src/ui/scenic/scenic_pkg/blobs.json
obj/src/ui/scenic/scenic_pkg/blobs.manifest
obj/src/ui/scenic/scenic_pkg/package_manifest.json:
__src_ui_scenic_scenic_pkg___build_toolchain_fuchsia_arm64__rule
|
../../build/gn_run_binary.sh
obj/src/ui/scenic/scenic_pkg.manifest
host_x64/pm
obj/build/deprecated_package.stamp
host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
obj/src/ui/scenic/scenic_pkg.manifest.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_compute_pose_buffer_latching_comp14695981039346656037.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_flatland_flat_main_frag14695981039346656037.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_flatland_flat_main_vert14695981039346656037.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_model_renderer_main_vert12890958529260787213.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_model_renderer_main_vert15064700897732225279.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_model_renderer_main_vert4304586084079301274.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_model_renderer_main_vert7456302057085141907.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_paper_frag_main_ambient_light_frag4304586084079301274.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_paper_frag_main_ambient_light_frag7456302057085141907.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_paper_frag_main_ambient_light_frag9217636760892358205.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_paper_frag_main_point_light_frag15064700897732225279.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_paper_vert_main_shadow_volume_extrude_vert15276133142244279294.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_paper_vert_main_shadow_volume_extrude_vert9217636760892358205.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_test_main_frag12890958529260787213.spirv.stamp
obj/src/ui/scenic/scenic_pkg.resource.resource.shaders_shaders_test_main_frag4304586084079301274.spirv.stamp
obj/src/ui/scenic/scenic_pkg_metadata.stamp
obj/src/ui/scenic/scenic_pkg_scenic.cmx.stamp
obj/src/ui/scenic/scenic_pkg_scenic.cmx_component_index.stamp
obj/src/ui/scenic/scenic_pkg_validate_manifests_scenic.cmx.stamp
./scenic
    `;

    const [
      targetBuildDir, packageTarget, componentTargets
    ] = fuchsiaware.Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , ['']];
    assert.strictEqual(targetBuildDir, 'src/ui/scenic');
    assert.strictEqual(packageTarget, 'scenic_pkg');

    assert.deepStrictEqual(componentTargets, [
      'scenic.cmx',
    ]);
  });

  test('fonts_extractBuildDirPackageNameAndComponents', () => {
    const line = `
build
obj/src/fonts/pkg/meta.far
obj/src/fonts/pkg/meta/contents
obj/src/fonts/pkg/meta.far.merkle
obj/src/fonts/pkg/blobs.json
obj/src/fonts/pkg/blobs.manifest
obj/src/fonts/pkg/package_manifest.json:
__src_fonts_pkg___build_toolchain_fuchsia_arm64__rule
|
../../build/gn_run_binary.sh
obj/src/fonts/pkg.manifest
host_x64/pm
obj/build/deprecated_package.stamp
./font_provider
obj/src/fonts/pkg.manifest.stamp
obj/src/fonts/pkg_fonts.cm.stamp
obj/src/fonts/pkg_fonts.cmx.stamp
obj/src/fonts/pkg_fonts.cmx_component_index.stamp
obj/src/fonts/pkg_fonts_for_downstream_tests.cmx.stamp
obj/src/fonts/pkg_fonts_for_downstream_tests.cmx_component_index.stamp
obj/src/fonts/pkg_metadata.stamp
obj/src/fonts/pkg_validate_manifests_fonts.cm.stamp
obj/src/fonts/pkg_validate_manifests_fonts.cmx.stamp
obj/src/fonts/pkg_validate_manifests_fonts_for_downstream_tests.cmx.stamp
host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
    `;

    const [
      targetBuildDir, packageTarget, componentTargets
    ] = fuchsiaware.Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/fonts');
    assert.strictEqual(packageTarget, 'pkg');

    assert.deepStrictEqual(componentTargets, [
      'fonts.cm',
      'fonts.cmx',
      'fonts_for_downstream_tests.cmx',
    ]);
  });

  test('fonts_extractManifestPathAndCmlComponent', () => {
    const line = `
command
=
/usr/bin/env
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/mac-x64/bin
host_x64/cmc
compile
../../src/fonts/meta/fonts.cml
--output
obj/src/fonts/pkg_fonts.cm
--includepath
../../
--depfile
obj/src/fonts/pkg_fonts.cm.d
    `;

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = fuchsiaware.Provider.extractManifestPathAndCmlComponent(line) ?? [];
    assert.strictEqual(manifestSourcePath, 'src/fonts/meta/fonts.cml');
    assert.strictEqual(componentName, 'pkg_fonts');
    assert.strictEqual(componentTargetPath, 'src/fonts:pkg_fonts');
  });

  test('scenic_extractManifestPathAndCmxComponent', () => {
    const line = `
command
=
/usr/bin/env
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/linux-x64/bin
host_x64/cmc
--stamp
gen/src/ui/scenic/scenic_pkg_validate_manifests_scenic.cmx.action.stamp
validate-references
--component-manifest
../../src/ui/scenic/bin/meta/scenic.cmx
--package-manifest
obj/src/ui/scenic/scenic_pkg.manifest
--gn-label
//src/ui/scenic$:scenic_pkg\(//build/toolchain/fuchsia$:arm64\)
    `;

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = fuchsiaware.Provider.extractManifestPathAndCmxComponent(line) ?? [];
    assert.strictEqual(manifestSourcePath, 'src/ui/scenic/bin/meta/scenic.cmx');
    assert.strictEqual(componentName, 'scenic');
    assert.strictEqual(componentTargetPath, 'src/ui/scenic:scenic.cmx');
  });

  test('elf_extractManifestPathAndCmlComponent', () => {
    const line = `
command
=
/usr/bin/env
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/mac-x64/bin
host_x64/cmc
compile
../../src/sys/test_runners/elf/meta/elf_test_runner.cml
--output
obj/src/sys/test_runners/elf/elf-test-runner.cm
--includepath
../../
--depfile
obj/src/sys/test_runners/elf/elf-test-runner-component.d
    `;

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = fuchsiaware.Provider.extractManifestPathAndCmlComponent(line) ?? [];
    assert.strictEqual(manifestSourcePath, 'src/sys/test_runners/elf/meta/elf_test_runner.cml');
    assert.strictEqual(componentName, 'elf-test-runner');
    assert.strictEqual(componentTargetPath, 'src/sys/test_runners/elf:elf-test-runner-component');
  });

  test('extractManifestPathAndCmxComponent', () => {
    const line = `
command
=
/usr/bin/env
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/linux-x64/bin
host_x64/cmc
--stamp
gen/src/sys/component_manager/component-manager-boot-env-tests-cmp_cmc_validate_references.action.stamp
validate-references
--component-manifest
../../src/sys/component_manager/meta/component_manager_boot_env_tests.cmx
--package-manifest
gen/src/sys/component_manager/component-manager-boot-env-tests-cmp_cmc_validate_references_fini_file
--gn-label
//src/sys/component_manager$:component-manager-boot-env-tests-cmp_cmc_validate_references\(//build/toolchain/fuchsia$:arm64\)
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
command
=
/usr/bin/env
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/mac-x64/bin
host_x64/pm
-o
obj/src/sys/test_manager/test_manager_pkg
-m
obj/src/sys/test_manager/test_manager_pkg_manifest
-n
test_manager
-version
0
build
-output-package-manifest
obj/src/sys/test_manager/test_manager_pkg/package_manifest.json
-depfile
-blobsfile
-blobs-manifest
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
