import * as vscode from 'vscode';
import requestLinearSession from './requestLinearSession';

// Scopes typically required to read issues and users; adjust as needed
const LINEAR_SCOPES = ['read', 'issues:read', 'issues:write'];

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.requestLinearSession', async () => {
    try {
      const result = await requestLinearSession();
      if (!result) return;

      const { session, linearClient } = result;
      // Linear SDK may expose viewer as a method or a property depending on version
      let viewer: any = null;
      if (typeof (linearClient as any).viewer === 'function') {
        viewer = await (linearClient as any).viewer();
      } else {
        viewer = (linearClient as any).viewer;
      }

      vscode.window.showInformationMessage(`Linear session acquired for ${viewer?.login ?? 'unknown user'}`);

      // store client token and viewer id in the extension context for later use
      context.globalState.update('linearClientToken', session.accessToken);
      context.globalState.update('linearViewer', viewer?.id ?? null);
    } catch (err: any) {
      vscode.window.showErrorMessage('Failed to request Linear session: ' + (err?.message ?? String(err)));
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
