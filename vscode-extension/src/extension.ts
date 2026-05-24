import * as vscode from 'vscode';
import { LinearClient } from '@linear/sdk';

// Scopes typically required to read issues and users; adjust as needed
const LINEAR_SCOPES = ['read', 'issues:read', 'issues:write'];

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.requestLinearSession', async () => {
    try {
      // Request a session from the 'linear' authentication provider registered in VS Code
      const session = await vscode.authentication.getSession('linear', LINEAR_SCOPES, { createIfNone: true });
      if (!session) {
        vscode.window.showErrorMessage('Could not obtain Linear session.');
        return;
      }

      const token = session.accessToken;
      // Initialize Linear SDK with the token
      const client = new LinearClient({ apiKey: token });

      // Example usage: fetch viewer (current user)
      const viewer = await client.viewer();
      vscode.window.showInformationMessage(`Linear session acquired for ${viewer?.login ?? 'unknown user'}`);

      // store client in the extension context for later use
      context.globalState.update('linearClientToken', token);
      context.globalState.update('linearViewer', viewer?.id ?? null);
    } catch (err: any) {
      vscode.window.showErrorMessage('Failed to request Linear session: ' + (err?.message ?? String(err)));
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
