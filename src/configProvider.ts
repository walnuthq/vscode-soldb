import * as vscode from "vscode";

export class SoldbDebugConfigurationProvider
  implements vscode.DebugConfigurationProvider
{
  provideDebugConfigurations(
    folder: vscode.WorkspaceFolder | undefined,
    token?: vscode.CancellationToken
  ): vscode.DebugConfiguration[] {
    return [
      {
        name: "SolDB",
        type: "soldb",
        request: "launch",
      },
    ];
  }

  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration
  ): vscode.DebugConfiguration | null {
    // If no configuration is provided, return null to cancel debug session
    if (!config.type && !config.request && !config.name) {
      return null;
    }

    config.type = "soldb";
    config.request = config.request || "launch";

    // Enable breakpoints everywhere for Solidity debugging
    // This allows breakpoints to be set in Solidity files
    const debugConfig = vscode.workspace.getConfiguration("debug");
    const allowBreakpointsEverywhere = debugConfig.get<boolean>(
      "allowBreakpointsEverywhere",
      false
    );
    if (!allowBreakpointsEverywhere) {
      debugConfig.update(
        "allowBreakpointsEverywhere",
        true,
        vscode.ConfigurationTarget.Workspace
      );
    }

    // Note: Compilation is handled automatically in dap_server.py during launch
    // No need for preLaunchTask - dap_server.py will compile contracts automatically

    // Allow launch.json to override workspace settings
    const workspaceConfig = vscode.workspace.getConfiguration("soldb");
    config.rpc =
      config.rpc ||
      workspaceConfig.get<string>("rpc") ||
      "http://localhost:8545";
    config.source =
      config.source ||
      vscode.window.activeTextEditor?.document.uri.fsPath ||
      "";
    config.workspaceRoot = config.workspaceRoot || folder?.uri.fsPath || "";

    return config;
  }

  resolveDebugConfigurationWithSubstitutedVariables(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration
  ): vscode.DebugConfiguration | null {
    // Additional validation
    return config;
  }
}
