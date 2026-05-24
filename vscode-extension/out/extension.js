"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
// Using fetch against Linear GraphQL API to avoid depending on @linear/sdk in the extension
// GraphQL endpoint: https://api.linear.app/graphql
// Scopes typically required to read issues and users; adjust as needed
const LINEAR_SCOPES = ['read', 'issues:read', 'issues:write'];
async function activate(context) {
    const disposable = vscode.commands.registerCommand('extension.requestLinearSession', async () => {
        try {
            // Provided session flow: request a Linear session and initialize LinearClient with accessToken
            const session = await vscode.authentication.getSession('linear', // Linear VS Code authentication provider ID
            ['read'], // OAuth scopes we're requesting
            { createIfNone: true });
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
                }
                catch (sdkErr) {
                    console.error('Linear fetch error', sdkErr);
                    vscode.window.showErrorMessage('Linear API failed to fetch viewer: ' + (sdkErr?.message ?? String(sdkErr)));
                }
            }
            else {
                console.error('Something went wrong, could not acquire a Linear API session.');
                vscode.window.showErrorMessage('Could not acquire a Linear API session.');
            }
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to request Linear session: ' + (err?.message ?? String(err)));
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
