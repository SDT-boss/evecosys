import * as vscode from 'vscode';
// Using fetch against Linear GraphQL API to avoid depending on @linear/sdk in the extension
// GraphQL endpoint: https://api.linear.app/graphql

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
        console.log('Acquired a Linear API session', { account: session.account });

        // Example: fetch viewer (current user) using Linear GraphQL API
        try {
          const resp = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.accessToken}`
            },
            body: JSON.stringify({ query: '{ viewer { id name displayName email } }' })
          });

          const json = await resp.json();
          const viewer = json?.data?.viewer;
          vscode.window.showInformationMessage(`Linear session acquired for ${viewer?.displayName ?? 'unknown user'}`);
          context.globalState.update('linearClientToken', session.accessToken);
          context.globalState.update('linearViewer', viewer?.id ?? null);
        } catch (sdkErr: any) {
          console.error('Linear fetch error', sdkErr);
          vscode.window.showErrorMessage('Linear API failed to fetch viewer: ' + (sdkErr?.message ?? String(sdkErr)));
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
