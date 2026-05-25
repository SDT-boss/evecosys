declare module 'vscode' {
  export interface ExtensionContext {
    subscriptions: any[];
    globalState: {
      update(key: string, value: any): Promise<void>;
    };
  }

  export namespace authentication {
    export function getSession(id: string, scopes: string[], options?: { createIfNone?: boolean }): Promise<any>;
  }

  export namespace commands {
    export function registerCommand(command: string, callback: (...args: any[]) => any): { dispose(): void };
  }

  export namespace window {
    export function showInformationMessage(message: string): void;
    export function showErrorMessage(message: string): void;
  }

  const vscode: any;
  export default vscode;
}

declare module '@linear/sdk' {
  export class LinearClient {
    constructor(opts: { accessToken?: string; apiKey?: string });
    viewer(): Promise<any>;
    // minimal placeholder types; extend as needed
  }
}
