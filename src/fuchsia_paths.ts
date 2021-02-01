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
import * as log from './log';

const FUCHSIA_DIR_SETTING_KEY = 'fuchsiAware.fuchsia.rootDirectory';

export async function findFuchsiaBuildDir(): Promise<[vscode.Uri, string] | undefined> {
  const buildDirFilename = '.fx-build-dir';
  if (!vscode.workspace.workspaceFolders) {
    return;
  }
  let useFuchsiaDirFromEnv = false;
  let fuchsiaDirFromEnv: string | undefined =
    vscode.workspace.getConfiguration().get(FUCHSIA_DIR_SETTING_KEY);
  let fuchsiaDirVariable;
  if (fuchsiaDirFromEnv) {
    fuchsiaDirVariable = `VS Code setting '${FUCHSIA_DIR_SETTING_KEY}'`;
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
      buildDir = await _readBuildDirDoc(folder.uri, buildDirFilename);
    }
    if (buildDir) {
      return [folder.uri, buildDir];
    } else if (!fuchsiaSubdirUri && fuchsiaDirFromEnv &&
      folder.uri.fsPath.startsWith(fuchsiaDirFromEnv)) {
      fuchsiaSubdirUri = folder.uri;
    }
  }
  if (!useFuchsiaDirFromEnv) {
    log.info(
      `Could not find file '${buildDirFilename}' in the root of any workspace folder: \n  ` +
      vscode.workspace.workspaceFolders.map((folder) => folder.uri).join('\n  ')
    );
  }
  if (fuchsiaDirFromEnv) {
    if (fuchsiaSubdirUri) {
      const fuchsiaDirUri = fuchsiaSubdirUri.with({ path: fuchsiaDirFromEnv });
      const buildDir = await _readBuildDirDoc(fuchsiaDirUri, buildDirFilename);
      if (buildDir) {
        log.info(`Loading provider data from ${fuchsiaDirVariable} = '${fuchsiaDirUri}'`);
        return [fuchsiaDirUri, buildDir];
      } else {
        log.info(
          `nor was it found in the directory from ${fuchsiaDirVariable} (${fuchsiaDirUri}).`
        );
      }
    } else {
      log.info(
        `nor was any workspace folder found under the directory from ${fuchsiaDirVariable} ` +
        `(${fuchsiaDirFromEnv}).`
      );
    }
  } else {
    log.info(
      `and the fuchsia root directory could not be determined from either ` +
      `settings ('${FUCHSIA_DIR_SETTING_KEY}') or an environment variable ($FUCHSIA_DIR or ` +
      `$FUCHSIA_ROOT.`
    );
  }
  log.info(
    `If you have an open workspace for the 'fuchsia.git' source tree, make sure the ` +
    `workspace is rooted at the repository root directory (e.g., 'fuchsia'), and ` +
    'run `fx set ...` or `fx use ...`, then reload the VS Code window.'
  );
  return;
}

async function _readBuildDirDoc(
  folderUri: vscode.Uri,
  buildDirFilename: string
): Promise<string | undefined> {
  const buildDirFileUri = folderUri.with({ path: `${folderUri.path}/${buildDirFilename}` });
  try {
    const buildDirDoc = await vscode.workspace.openTextDocument(buildDirFileUri);
    const buildDir = buildDirDoc.getText().trim();
    log.info(
      `Folder '${folderUri.fsPath}' contains the '${buildDirFilename}' file, ` +
      `which specifies that the current Fuchsia build directory is '${buildDir}'`
    );
    return buildDir;
  } catch (err) {
    return;
  } // the file probably doesn't exist in this folder
}
