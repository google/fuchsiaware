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
import { findFuchsiaBuildDir } from './fuchsia_paths';
import { Provider } from './provider';

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
  _asyncActivate(context).then((success) => log.info(
    `The FuchsiAware extension initialization completed ${success ? 'successfully' : 'with errors'}`
  ));
}

async function _asyncActivate(context: vscode.ExtensionContext): Promise<boolean> {
  log.info('The FuchsiAware extension is activated and looking for the fuchsia source...');

  const result = await findFuchsiaBuildDir();
  if (!result) {
    return false;
  }
  const [baseUri, buildDir] = result;

  const provider = new Provider(baseUri, buildDir);

  if (!await provider.init()) {
    return false;
  }

  context.subscriptions.push(vscode.Disposable.from(
    vscode.languages.registerDocumentLinkProvider({ scheme: Provider.scheme }, provider),
  ));
  log.info('The DocumentLinkProvider is initialized and registered.');
  context.subscriptions.push(vscode.Disposable.from(
    vscode.window.registerTerminalLinkProvider(provider),
  ));
  log.info('The TerminalLinkProvider is initialized and registered.');
  context.subscriptions.push(vscode.Disposable.from(
    vscode.languages.registerReferenceProvider({ scheme: Provider.scheme }, provider),
  ));
  log.info('The ReferenceProvider is initialized and registered.');
  return true;
}
