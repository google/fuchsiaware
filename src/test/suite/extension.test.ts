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

import * as assert from 'assert';

import * as vscode from 'vscode';
import { Provider } from '../../provider';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  const baseUri = vscode.Uri.file('fuchsia');
  const buildDir = 'out/default.test';

  // TODO(#4): Replace these hardcoded copies of specific lines from the `toolchain.ninja`
  // file with a cached but quickly refreshed copy of the developer's most current `toolchain.ninja`
  // (at least the subset of lines relevant to this extension). Each 'line' value below can then
  // be replaced with a regex to pull the specific required line from the cached and current data.
  // This way the test can validate that the expected format has not changed.

  // TODO(#5): Add an integration test that loops throught all extracted packageAndComponent
  // pairs, formats them into 'fuchsia-pkg://...' URLs, gets the manifest URIs from
  // provideDocumentLinks(), and validates the files exist. Generate stats for the number of
  // valid and invalid links.

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('libdriver_integration_test_extractBuildDirPackageTargetAndComponents', () => {
    const line = `
build
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test/meta.far
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test/meta/contents
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test/meta.far.merkle
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test/blobs.json
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test/blobs.manifest
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test/package_manifest.json:
__src_devices_tests_libdriver-integration-test_libdriver-integration-test___build_toolchain_fuchsia_arm64__rule
|
../../build/gn_run_binary.sh
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test_manifest
host_x64/pm
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test_component.stamp
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test_manifest.stamp
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test_metadata.stamp
obj/src/devices/tests/libdriver-integration-test/libdriver-integration-test_test_libdriver-integration-test_component.stamp
host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir,
      packageTarget,
      componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/devices/tests/libdriver-integration-test');
    assert.strictEqual(packageTarget, 'libdriver-integration-test');
    assert.deepStrictEqual(componentTargets, [
      'libdriver-integration-test_component',
      'test_libdriver-integration-test_component',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('archivist_integration_tests_extractBuildDirPackageTargetAndComponents', () => {
    const line = `
build
obj/src/devices/bin/driver_manager/driver-manager-tests/meta.far
obj/src/devices/bin/driver_manager/driver-manager-tests/meta/contents
obj/src/devices/bin/driver_manager/driver-manager-tests/meta.far.merkle
obj/src/devices/bin/driver_manager/driver-manager-tests/blobs.json
obj/src/devices/bin/driver_manager/driver-manager-tests/blobs.manifest
obj/src/devices/bin/driver_manager/driver-manager-tests/package_manifest.json:
__src_devices_bin_driver_manager_driver-manager-tests___build_toolchain_fuchsia_arm64__rule
|
../../build/gn_run_binary.sh
obj/src/devices/bin/driver_manager/driver-manager-tests_manifest
host_x64/pm
obj/src/devices/bin/driver_manager/driver-host-loader-service-test.stamp
obj/src/devices/bin/driver_manager/driver-manager-test.stamp
obj/src/devices/bin/driver_manager/driver-manager-tests_manifest.stamp
obj/src/devices/bin/driver_manager/driver-manager-tests_metadata.stamp
obj/src/devices/bin/driver_manager/driver-manager-tests_test_driver-host-loader-service-test.stamp
obj/src/devices/bin/driver_manager/driver-manager-tests_test_driver-manager-test.stamp
obj/src/devices/bin/driver_manager/driver-manager-tests_test_driver-runner-test.stamp
obj/src/devices/bin/driver_manager/driver-runner-test.stamp
host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir,
      packageTarget,
      componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/devices/bin/driver_manager');
    assert.strictEqual(packageTarget, 'driver-manager-tests');
    assert.deepStrictEqual(componentTargets, [
      'driver-host-loader-service-test',
      'driver-manager-test',
      'test_driver-host-loader-service-test',
      'test_driver-manager-test',
      'test_driver-runner-test',
      'driver-runner-test',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('archivist_integration_tests_extractBuildDirPackageTargetAndComponents', () => {
    const line = `
build
obj/src/diagnostics/archivist/tests/archive_path/archive_path.cmx:
__src_diagnostics_archivist_tests_archive_path_archive_path___build_toolchain_fuchsia_arm64__rule
|
../../build/gn_run_binary.sh
obj/src/diagnostics/archivist/tests/archive_path/archive_path_merge
host_x64/cmc
obj/src/diagnostics/archivist/tests/archive_path/archive_path_check_includes.stamp
obj/src/diagnostics/archivist/tests/archive_path/archive_path_cmc_validate_references.stamp
obj/src/diagnostics/archivist/tests/archive_path/archive_path_include.cmx.stamp
obj/src/diagnostics/archivist/tests/archive_path/archive_path_manifest_resource.stamp
obj/src/diagnostics/archivist/tests/archive_path/archive_path_merge.stamp
obj/src/diagnostics/archivist/tests/archive_path/archive_path_test_archivist.stamp
obj/src/diagnostics/archivist/tests/archive_path/archive_path_validate.stamp
./archive_path_test
host_x64/cmc
`.replace(/\n/g, ' ');

    const [
      manifestSourcePath,
      targetBuildDir,
      componentTarget,
      subComponentTargets,
    ] = Provider.extractSubComponents(line) ?? [, , []];
    assert.strictEqual(
      manifestSourcePath,
      'src/diagnostics/archivist/tests/archive_path/archive_path.cmx'
    );
    assert.strictEqual(targetBuildDir, 'src/diagnostics/archivist/tests/archive_path');
    assert.strictEqual(componentTarget, 'archive_path');
    assert.deepStrictEqual(subComponentTargets, [
      'archive_path_test_archivist',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('archivist_integration_tests_extractBuildDirPackageTargetAndComponents', () => {
    const line = `
build
obj/src/diagnostics/archivist/tests/archivist-integration-tests/meta.far
obj/src/diagnostics/archivist/tests/archivist-integration-tests/meta/contents
obj/src/diagnostics/archivist/tests/archivist-integration-tests/meta.far.merkle
obj/src/diagnostics/archivist/tests/archivist-integration-tests/blobs.json
obj/src/diagnostics/archivist/tests/archivist-integration-tests/blobs.manifest
obj/src/diagnostics/archivist/tests/archivist-integration-tests/package_manifest.json:
__src_diagnostics_archivist_tests_archivist-integration-tests___build_toolchain_fuchsia_arm64__rule
|
../../build/gn_run_binary.sh
obj/src/diagnostics/archivist/tests/archivist-integration-tests_manifest
host_x64/pm
obj/src/diagnostics/archivist/tests/archivist-integration-tests_manifest.stamp
obj/src/diagnostics/archivist/tests/archivist-integration-tests_metadata.stamp
obj/src/diagnostics/archivist/tests/accessor_truncation/accessor-truncation-integration-test.stamp
obj/src/diagnostics/archivist/tests/archive_path/archive_path.stamp
obj/src/diagnostics/archivist/tests/feedback_reader/feedback_reader.stamp
obj/src/diagnostics/archivist/tests/logs/cpp/cpp.stamp
obj/src/diagnostics/archivist/tests/unified_reader/unified_reader.stamp
host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir,
      packageTarget,
      componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/diagnostics/archivist/tests');
    assert.strictEqual(packageTarget, 'archivist-integration-tests');
    assert.deepStrictEqual(componentTargets, [
      'accessor_truncation/accessor-truncation-integration-test',
      'archive_path/archive_path',
      'feedback_reader/feedback_reader',
      'unified_reader/unified_reader',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('session_manager_extractBuildDirPackageTargetAndComponents', () => {
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
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir, packageTarget, componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/session/bin/session_manager');
    assert.strictEqual(packageTarget, 'session_manager');
    assert.deepStrictEqual(componentTargets, [
      'session_manager_component',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('ime_keyboard_test_extractBuildDirPackageTargetAndComponents', () => {
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
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir, packageTarget, componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/ui/bin/ime');
    assert.strictEqual(packageTarget, 'keyboard_test');
    assert.deepStrictEqual(componentTargets, [
      'default_hardware_ime.cmx',
      'ime_service.cmx',
      'ime_service_integration_test.cmx',
      'keyboard3_integration_test.cmx',
      'keyboard_test_bin.cmx',
      'keyboard_test_test/ime_service_integration_test_test_spec',
      'keyboard_test_test/keyboard3_integration_test_test_spec',
      'keyboard_test_test/keyboard_test_bin_test_spec',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('archivist_integration_tests_extractPackage', () => {
    const line = `
build
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests/meta.far
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests/meta.far.merkle
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests/blobs.json
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests/blobs.manifest
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests/package_manifest.json:
__src_diagnostics_archivist_tests_integration_archivist-integration-tests.pm___build_toolchain_fuchsia_x64__rule
|
../../build/rbe/output-scanner.sh
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests_manifest
host_x64/package-tool
../../build/gn_run_binary.sh
obj/src/diagnostics/archivist/tests/integration/archivist-for-integration.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-for-integration-config.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-for-integration-for-v1.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-for-v1-config.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests.pm_metadata.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests.verify.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests_manifest.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-integration-tests_test_archivist_integration_tests.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-feedback-filtering.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-feedback-filtering-config.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-feedback-filtering-disabled.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-feedback-filtering-disabled-config.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-klog.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-klog-config.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-legacy-metrics-filtering.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-legacy-metrics-filtering-config.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-lowpan-filtering.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-lowpan-filtering-config.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-small-caches.stamp
obj/src/diagnostics/archivist/tests/integration/archivist-with-small-caches-config.stamp
obj/src/diagnostics/archivist/tests/integration/archivist_integration_tests.stamp
obj/src/diagnostics/archivist/tests/integration/configure_legacy_metrics_pipeline.stamp
obj/src/diagnostics/archivist/tests/integration/do_not_filter_feedback.stamp
obj/src/diagnostics/archivist/tests/integration/filter_feedback.stamp
obj/src/diagnostics/archivist/tests/integration/filter_lowpan.stamp
obj/src/diagnostics/archivist/tests/integration/components/components.stamp
obj/src/diagnostics/iquery/test/test_component/test_component.stamp
host_x64/obj/src/sys/pkg/bin/package-tool/package-tool.stamp
    `.replace(/\n/g, ' ');

    const [
      packageName, packageTargetPath
    ] = Provider.extractPackage(line) ?? [];
    assert.strictEqual(packageName, 'archivist-for-integration');
    assert.strictEqual(
      packageTargetPath,
      'src/diagnostics/archivist/tests/integration:archivist-integration-tests'
    );
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('archivist_integration_tests_v2_extractManifestPathAndCmlComponent', () => {
    const line = `
command
=

../../build/rbe/output-scanner.sh
--label
//src/diagnostics/archivist/tests/integration$:archivist_integration_tests_manifest_compile\(//build/toolchain/fuchsia$:x64\)
obj/src/diagnostics/archivist/tests/integration/cml/archivist_integration_tests_manifest_compile/archivist_integration_tests.cm
--
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/linux-x64/bin
host_x64/cmc
compile
../../src/diagnostics/archivist/tests/integration/meta/archivist_integration_tests.cml
--output
obj/src/diagnostics/archivist/tests/integration/cml/archivist_integration_tests_manifest_compile/archivist_integration_tests.cm
--depfile
obj/src/diagnostics/archivist/tests/integration/archivist_integration_tests_manifest_compile.d
--config-package-path
meta/archivist_integration_tests.cvf
--includeroot
../../
--includepath
../../sdk/lib/
--features
hub
    `.replace(/\n/g, ' ');

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = Provider.extractManifestPathAndCmlComponent(line) ?? [];
    assert.strictEqual(
      manifestSourcePath,
      'src/diagnostics/archivist/tests/integration/meta/archivist_integration_tests.cml'
    );
    assert.strictEqual(componentName, 'archivist_integration_tests');
    assert.strictEqual(
      componentTargetPath,
      'src/diagnostics/archivist/tests/integration:archivist_integration_tests'
    );
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('archivist_integration_tests_v2_extractBuildDirPackageTargetAndComponents', () => {
    const line = `
build
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2/meta.far
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2/meta/contents
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2/meta.far.merkle
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2/blobs.json
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2/blobs.manifest
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2/package_manifest.json:
__src_diagnostics_archivist_tests_v2_archivist-integration-tests-v2___build_toolchain_fuchsia_arm64__rule
|
../../build/gn_run_binary.sh
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2.manifest
host_x64/pm
obj/build/deprecated_package.stamp
./archivist
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2.manifest.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2.resource.resource.config_archivist_config.json.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_archivist.cm.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_archivist_integration_tests.cm.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_driver.cm.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_metadata.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_stub_inspect_component.cm.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_test/archivist_integration_tests_test_spec.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_validate_manifests_archivist.cm.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_validate_manifests_archivist_integration_tests.cm.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_validate_manifests_driver.cm.stamp
obj/src/diagnostics/archivist/tests/v2/archivist-integration-tests-v2_validate_manifests_stub_inspect_component.cm.stamp
./archivist_integration_tests
./stub_inspect_component
host_x64/obj/src/sys/pkg/bin/pm/pm_bin.stamp
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir, packageTarget, componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/diagnostics/archivist/tests/v2');
    assert.strictEqual(packageTarget, 'archivist-integration-tests-v2');
    assert.deepStrictEqual(componentTargets, [
      'archivist.cm',
      'archivist_integration_tests.cm',
      'driver.cm',
      'stub_inspect_component.cm',
      'archivist-integration-tests-v2_test/archivist_integration_tests_test_spec',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('go_test_runner_extractBuildDirPackageTargetAndComponents', () => {
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
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir, packageTarget, componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/sys/test_runners/gotests');
    assert.strictEqual(packageTarget, 'go-test-runner');
    assert.deepStrictEqual(componentTargets, ['go_test_runner']);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('elf_extractBuildDirPackageTargetAndComponents', () => {
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
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir, packageTarget, componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/sys/test_runners/elf');
    assert.strictEqual(packageTarget, 'elf-test-runner');
    assert.deepStrictEqual(componentTargets, ['elf-test-runner-component']);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('extractBuildDirPackageTargetAndComponents', () => {
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
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir, packageTarget, componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
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

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('scenic_extractBuildDirPackageTargetAndComponents', () => {
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
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir, packageTarget, componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , ['']];
    assert.strictEqual(targetBuildDir, 'src/ui/scenic');
    assert.strictEqual(packageTarget, 'scenic_pkg');
    assert.deepStrictEqual(componentTargets, [
      'scenic.cmx',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('fonts_extractBuildDirPackageTargetAndComponents', () => {
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
    `.replace(/\n/g, ' ');

    const [
      targetBuildDir, packageTarget, componentTargets,
    ] = Provider.extractBuildDirPackageTargetAndComponents(line) ?? [, , []];
    assert.strictEqual(targetBuildDir, 'src/fonts');
    assert.strictEqual(packageTarget, 'pkg');
    assert.deepStrictEqual(componentTargets, [
      'fonts.cm',
      'fonts.cmx',
      'fonts_for_downstream_tests.cmx',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('fonts_extractManifestPathAndCmlComponent', () => {
    const line = `
command
=

../../build/rbe/output-scanner.sh
--label
//src/fonts$:font_provider_cm_manifest_compile\(//build/toolchain/fuchsia$:x64\)
obj/src/fonts/cml/font_provider_cm_manifest_compile/fonts.cm
--
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/linux-x64/bin
host_x64/cmc
compile
../../src/fonts/meta/fonts.cml
--output
obj/src/fonts/cml/font_provider_cm_manifest_compile/fonts.cm
--depfile
obj/src/fonts/font_provider_cm_manifest_compile.d
--config-package-path
meta/fonts.cvf
--includeroot
../../
--includepath
../../sdk/lib/
--features
hub
    `.replace(/\n/g, ' ');

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = Provider.extractManifestPathAndCmlComponent(line) ?? [];
    assert.strictEqual(manifestSourcePath, 'src/fonts/meta/fonts.cml');
    assert.strictEqual(componentName, 'fonts');
    assert.strictEqual(componentTargetPath, 'src/fonts:font_provider_cm');
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('elf_extractManifestPathAndCmlComponent', () => {
    const line = `
command
=

../../build/rbe/output-scanner.sh
--label
//src/sys/test_runners/elf$:elf-test-runner-component_manifest_compile\(//build/toolchain/fuchsia$:x64\)
obj/src/sys/test_runners/elf/cml/elf-test-runner-component_manifest_compile/elf-test-runner.cm
--
../../build/gn_run_binary.sh
../../prebuilt/third_party/clang/linux-x64/bin
host_x64/cmc
compile
../../src/sys/test_runners/elf/meta/elf_test_runner.cml
--output
obj/src/sys/test_runners/elf/cml/elf-test-runner-component_manifest_compile/elf-test-runner.cm
--depfile
obj/src/sys/test_runners/elf/elf-test-runner-component_manifest_compile.d
--config-package-path
meta/elf-test-runner.cvf
--includeroot
../../
--includepath
../../sdk/lib/
--features
hub
    `.replace(/\n/g, ' ');

    const [
      manifestSourcePath, componentName, componentTargetPath
    ] = Provider.extractManifestPathAndCmlComponent(line) ?? [];
    assert.strictEqual(manifestSourcePath, 'src/sys/test_runners/elf/meta/elf_test_runner.cml');
    assert.strictEqual(componentName, 'elf-test-runner');
    assert.strictEqual(componentTargetPath, 'src/sys/test_runners/elf:elf-test-runner-component');
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('extractPackage', () => {
    const line = `
build
obj/src/sys/test_manager/test_manager_pkg/meta.far
obj/src/sys/test_manager/test_manager_pkg/meta.far.merkle
obj/src/sys/test_manager/test_manager_pkg/blobs.json
obj/src/sys/test_manager/test_manager_pkg/blobs.manifest
obj/src/sys/test_manager/test_manager_pkg/package_manifest.json:
__src_sys_test_manager_test_manager_pkg.pm___build_toolchain_fuchsia_x64__rule
|
../../build/rbe/output-scanner.sh
obj/src/sys/test_manager/test_manager_pkg_manifest
host_x64/package-tool
../../build/gn_run_binary.sh
obj/src/diagnostics/archivist/archivist-for-embedding-v2.stamp
obj/src/storage/memfs/memfs_component.stamp
obj/src/sys/early_boot_instrumentation/early-boot-instrumentation.stamp
host_x64/obj/src/sys/pkg/bin/package-tool/package-tool.stamp
obj/src/sys/test_manager/test_manager_cmp.stamp
obj/src/sys/test_manager/test_manager_pkg.pm_metadata.stamp
obj/src/sys/test_manager/test_manager_pkg.verify.stamp
obj/src/sys/test_manager/test_manager_pkg_manifest.stamp
obj/src/sys/test_manager/cmx_runner/cmx_runner.stamp
obj/src/sys/test_manager/debug_data/debug_data_rust.stamp
obj/src/sys/test_manager/debug_data_processor/debug_data_processor.stamp
    `.replace(/\n/g, ' ');

    const [
      packageName, packageTargetPath
    ] = Provider.extractPackage(line) ?? [];
    assert.strictEqual(packageName, 'archivist-for-embedding-v2');
    assert.strictEqual(packageTargetPath, 'src/sys/test_manager:test_manager_pkg');
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('provideDocumentLinks matches .cm files (compiled cml)', async () => {
    const provider = new Provider(baseUri, buildDir);
    const docWithComponentUrl = await vscode.workspace.openTextDocument({
      content: `
componentUrl: "fuchsia-pkg://fuchsia.com/some-package?1a2b3c4d5e6f#meta/some-component.cm"
`
    });
    provider.addLink('some-package', 'some-component', 'src/some/path.cml_or_cmx');
    const links = provider.provideDocumentLinks(
      docWithComponentUrl, new vscode.CancellationTokenSource().token);
    assert.deepStrictEqual(links?.map(link => link.target?.path), [
      '/fuchsia/src/some/path.cml_or_cmx',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('provideDocumentLinks matches .cmx files, and fxrev and fxbug IDs', async () => {
    const provider = new Provider(baseUri, buildDir);
    const docWithComponentUrl = await vscode.workspace.openTextDocument({
      content: `
componentUrl: "fuchsia-pkg://fuchsia.com/some-package?1a2b3c4d5e6f#meta/some-component.cmx"
// ISSUE(fxrev.dev/1012345):
// ISSUE(http://fxrev.dev/2012345):
// ISSUE(https://fxrev.dev/3012345):
// ISSUE(fxr/4012345):
// ISSUE(fxbug.dev/5012345):
// ISSUE(http://fxbug.dev/6012345):
// ISSUE(https://fxbug.dev/7012345):
// ISSUE(fxb/8012345):
`
    });
    provider.addLink('some-package', 'some-component', 'src/some/path.cml_or_cmx');
    const links = provider.provideDocumentLinks(
      docWithComponentUrl, new vscode.CancellationTokenSource().token);
    assert.deepStrictEqual(links?.map(link => link.target?.toString()), [
      'file:///fuchsia/src/some/path.cml_or_cmx',
      'https://fxrev.dev/1012345',
      'https://fxrev.dev/2012345',
      'https://fxrev.dev/3012345',
      'https://fxrev.dev/4012345',
      'https://fxbug.dev/5012345',
      'https://fxbug.dev/6012345',
      'https://fxbug.dev/7012345',
      'https://fxbug.dev/8012345',
    ]);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  test('provideTerminalLinks matches .cmx files', async () => {
    const provider = new Provider(baseUri, buildDir);
    const context = {
      line: `    componentUrl: "fuchsia-pkg://fuchsia.com/some-package#meta/some-component.cmx"`
    };
    provider.addLink('some-package', 'some-component', 'src/some/path.cml_or_cmx');
    const links = provider.provideTerminalLinks(
      <vscode.TerminalLinkContext>context, new vscode.CancellationTokenSource().token);
    assert.strictEqual((links ?? [])[0].startIndex, 19);
  });

// TODO(#13): Re-enable this test
//   //////////////////////////////////////////////////////////////////////////////////////////////////
//   test('finds references to a manifest', async () => {
//     const provider = new Provider(baseUri, buildDir);
//     const referencedManifestDoc = await vscode.languages.setTextDocumentLanguage(
//       await vscode.workspace.openTextDocument({
//         content: `{
//     program: {
//         binary: "bin/some_component_exe",
//     },
// }
// `
//       }),
//       'untitled-fuchsia-manifest',
//     );

//     const packageName = 'some-package';
//     const componentName = 'some-component';
//     const componentUrl = `fuchsia-pkg://fuchsia.com/${packageName}#meta/${componentName}.cm`;

//     const docWithComponentUrl = await vscode.workspace.openTextDocument({
//       content: `
// componentUrl: "fuchsia-pkg://fuchsia.com/${packageName}?1a2b3c4d5e6f#meta/${componentName}.cmx"
// `
//     });

//     provider.addLink(packageName, componentName, referencedManifestDoc.uri.fsPath);

//     provider.addReference(
//       packageName,
//       componentName,
//       componentUrl,
//       vscode.Uri.file('src/some/path_to_some_referrer.txt'),
//       10,
//       5,
//     );

//     provider.addReference(
//       packageName,
//       componentName,
//       componentUrl,
//       vscode.Uri.file('src/some/path_to_another_referrer.txt'),
//       10,
//       5,
//     );

//     const references = provider.provideReferences(
//       referencedManifestDoc,
//       new vscode.Position(0, 0),
//       { includeDeclaration: false },
//       new vscode.CancellationTokenSource().token,
//     );
//     assert.deepStrictEqual(references?.map(location => location.uri.path), [
//       '/src/some/path_to_some_referrer.txt',
//       '/src/some/path_to_another_referrer.txt',
//     ]);
//   });
});
