import * as vscode from 'vscode';
import { LinearClient } from '@linear/sdk';

// Scopes typically required to read issues and users; adjust as needed
const LINEAR_SCOPES = ['read', 'issues:read', 'issues:write'];

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.requestLinearSession', async () => {
    try {
      // Provided session flow: request a Linear session and initialize LinearClient with accessToken
      const session = await vscode.authentication.getSession(
        'linear', // Linear VS Code authentication provider ID
        ['read'], // OAuth scopes we're requesting
        { createIfNone: true }
      );

      if (session) {
        // Use the LinearClient from @linear/sdk with the acquired session
        try {
          const linearClient = new LinearClient({
            accessToken: session.accessToken,
          });

          console.log('Acquired a Linear API session', {
            account: session.account,
          });

          // Example usage: fetch viewer
          try {
            const viewer = await linearClient.viewer();
            vscode.window.showInformationMessage(`Linear session acquired for ${viewer?.login ?? 'unknown user'}`);
            context.globalState.update('linearClientToken', session.accessToken);
            context.globalState.update('linearViewer', viewer?.id ?? null);
          } catch (sdkErr: any) {
            console.error('Linear SDK error', sdkErr);
            vscode.window.showErrorMessage('Linear SDK failed to fetch viewer: ' + (sdkErr?.message ?? String(sdkErr)));
          }
        } catch (errClient: any) {
          console.error('Could not initialize LinearClient', errClient);
          vscode.window.showErrorMessage('Failed to initialize Linear client: ' + (errClient?.message ?? String(errClient)));
        }
      } else {
        console.error('Something went wrong, could not acquire a Linear API session.');
        vscode.window.showErrorMessage('Could not acquire a Linear API session.');
      }
    } catch (err: any) {
      vscode.window.showErrorMessage('Failed to request Linear session: ' + (err?.message ?? String(err)));
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
