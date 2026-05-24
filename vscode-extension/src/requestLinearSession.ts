import * as vscode from "vscode";
import { LinearClient } from "@linear/sdk";

export default async function requestLinearSession() {
  const session = await vscode.authentication.getSession(
    "linear", // Linear VS Code authentication provider ID
    ["read"], // OAuth scopes we're requesting
    { createIfNone: true }
  );

  if (session) {
    const linearClient = new LinearClient({
      accessToken: session.accessToken,
    });

    console.log("Acquired a Linear API session", {
      account: session.account,
    });

    return { session, linearClient };
  } else {
    console.error(
      "Something went wrong, could not acquire a Linear API session."
    );
    return null;
  }
}

// If the script is run directly inside a Node environment that provides `vscode` (e.g. extension host)
if (require.main === module) {
  requestLinearSession().catch((err) => console.error(err));
}
