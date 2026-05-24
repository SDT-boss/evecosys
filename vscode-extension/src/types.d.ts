declare module 'vscode' {
  const vscode: any;
  export = vscode;
}

declare module '@linear/sdk' {
  export class LinearClient {
    constructor(opts: { accessToken?: string; apiKey?: string });
    viewer(): Promise<any>;
    // minimal placeholder types; extend as needed
  }
}
