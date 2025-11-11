import * as vscode from "vscode";
import { SoldbDebugConfigurationProvider } from "./configProvider";
import { SoldbDebugAdapterDescriptorFactory } from "./debugAdapter";
import { SolidityCodeLensProvider } from "./soliditySupport";
import { CustomDebugViewProvider } from "./customDebugView";

export function activate(context: vscode.ExtensionContext) {
  // Enable breakpoints everywhere for Solidity files
  const config = vscode.workspace.getConfiguration("debug");
  const allowBreakpointsEverywhere = config.get<boolean>(
    "allowBreakpointsEverywhere",
    false
  );
  if (!allowBreakpointsEverywhere) {
    config.update(
      "allowBreakpointsEverywhere",
      true,
      vscode.ConfigurationTarget.Workspace
    );
  }

  // Register the soldb debug configuration provider
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      "soldb",
      new SoldbDebugConfigurationProvider()
    )
  );

  // Register the soldb debug adapter descriptor factory
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      "soldb",
      new SoldbDebugAdapterDescriptorFactory()
    )
  );

  // Listen for custom events from debug adapter
  context.subscriptions.push(
    vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => {
      if (event.session.type === "soldb") {
        if (event.event === "transactionMonitored") {
          // New transaction was monitored - refresh view
          customDebugViewProvider.refresh();
        } else if (event.event === "transactionData") {
          const txData = event.body as {
            txHash?: string;
            contractAddress?: string;
            entrypoint?: string;
            calldata?: string;
          };
          // Refresh custom debug view
          customDebugViewProvider.refresh();
          vscode.window
            .showInformationMessage(
              `Transaction: ${txData.txHash?.substring(0, 16)}... | ` +
                `Contract: ${txData.contractAddress?.substring(0, 10)}... | ` +
                `Entrypoint: ${txData.entrypoint || "unknown"}`,
              "Open in Debug View"
            )
            .then((selection) => {
              if (selection === "Open in Debug View") {
                vscode.commands.executeCommand("workbench.view.debug");
              }
            });
        }
      }
    })
  );

  // Listen for debug session events
  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((session) => {
      if (session.type === "soldb") {
        vscode.window.showInformationMessage(
          `Debug session started: ${session.name}`
        );
        // Ensure breakpoints are enabled everywhere
        const config = vscode.workspace.getConfiguration("debug");
        config.update(
          "allowBreakpointsEverywhere",
          true,
          vscode.ConfigurationTarget.Workspace
        );
        // Refresh custom debug view when debug session starts
        customDebugViewProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession((session) => {
      if (session.type === "soldb") {
        vscode.window.showInformationMessage(
          `Debug session terminated: ${session.name}`
        );
        // Refresh custom debug view when debug session ends
        customDebugViewProvider.refresh();
      }
    })
  );

  // Register CodeLens provider for Solidity
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "solidity" },
      new SolidityCodeLensProvider()
    )
  );

  // Register custom debug view
  const customDebugViewProvider = new CustomDebugViewProvider();
  const customDebugView = vscode.window.createTreeView(
    "soldb.customDebugView",
    {
      treeDataProvider: customDebugViewProvider,
      showCollapseAll: false,
    }
  );
  context.subscriptions.push(customDebugView);

  // Refresh view when debug session changes
  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession(() => {
      customDebugViewProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession(() => {
      customDebugViewProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.debug.onDidChangeActiveDebugSession(() => {
      customDebugViewProvider.refresh();
    })
  );

  // Register "Toggle Breakpoint" command
  context.subscriptions.push(
    vscode.commands.registerCommand("soldb.toggleBreakpoint", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "solidity") {
        vscode.window.showWarningMessage(
          "Please open a Solidity file to set breakpoints"
        );
        return;
      }

      const line = editor.selection.active.line;

      try {
        // Get current breakpoints for this file
        const breakpoints = vscode.debug.breakpoints.filter(
          (bp) =>
            bp instanceof vscode.SourceBreakpoint &&
            bp.location.uri.toString() === editor.document.uri.toString() &&
            bp.location.range.start.line === line
        );

        if (breakpoints.length > 0) {
          // Remove breakpoint
          vscode.debug.removeBreakpoints(breakpoints);
          vscode.window.showInformationMessage(
            `Breakpoint removed at line ${line + 1}`
          );
        } else {
          // Add breakpoint - VS Code will automatically send setBreakpoints request to debug adapter
          const breakpoint = new vscode.SourceBreakpoint(
            new vscode.Location(
              editor.document.uri,
              new vscode.Position(line, 0)
            )
          );
          vscode.debug.addBreakpoints([breakpoint]);
          vscode.window.showInformationMessage(
            `Breakpoint set at line ${line + 1}`
          );
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to toggle breakpoint: ${error.message || error}`
        );
      }
    })
  );

  // Listen for breakpoint changes and ensure they're sent to active debug sessions
  context.subscriptions.push(
    vscode.debug.onDidChangeBreakpoints((e) => {
      // VS Code automatically sends setBreakpoints requests to debug adapters
      // This listener is here for potential future enhancements
      const activeSession = vscode.debug.activeDebugSession;
      if (activeSession && activeSession.type === "soldb") {
        // Breakpoints are automatically synchronized by VS Code
        // No additional action needed here
      }
    })
  );

  // Register "Debug transaction" command (called when clicking on transaction hash in view)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "soldb.debugTransaction",
      async (txHash: string) => {
        const activeDebugSession = vscode.debug.activeDebugSession;

        if (!activeDebugSession || activeDebugSession.type !== "soldb") {
          vscode.window.showErrorMessage(
            "No active Soldb debug session found. Please start a debug session first."
          );
          return;
        }

        if (!txHash) {
          vscode.window.showErrorMessage("No transaction hash provided");
          return;
        }

        try {
          // Send custom request to DAP server
          const response = await activeDebugSession.customRequest(
            "debugTransaction",
            {
              txHash: txHash,
            }
          );

          if (response) {
            vscode.window.showInformationMessage(
              `Transaction ready for debugging: ${response.txHash?.substring(
                0,
                16
              )}...`
            );
            // Refresh the view to show updated state
            customDebugViewProvider.refresh();
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to load transaction for debugging: ${
              error.message || error
            }`
          );
        }
      }
    )
  );

  // Register the command that CodeLens will trigger
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "wn.runFunction",
      async (functionName: string, args_cnt: number) => {
        let args: string[] = [];
        if (args_cnt > 0) {
          const argsInput = await vscode.window.showInputBox({
            prompt: `Enter arguments for ${functionName} (comma separated) or leave empty to use contracts.json`,
          });
          args = argsInput ? argsInput.split(",").map((s) => s.trim()) : [];
          if (args.length === 0) {
            vscode.window.showInformationMessage(
              `No arguments provided for ${functionName}, using contracts.json instead.`
            );
          } else if (args.length !== args_cnt) {
            vscode.window.showErrorMessage(
              `Expected ${args_cnt} arguments, but got ${args.length}`
            );
            return;
          }
        }

        // Get configuration settings (same as debug adapter descriptor)
        const workspaceConfig = vscode.workspace.getConfiguration("soldb");

        let rpc = workspaceConfig.get<string>("rpc") || "http://localhost:8545";

        // Check if there are any soldb debug configurations in launch.json
        const launchConfig = vscode.workspace.getConfiguration("launch");
        const configurations = launchConfig.get<any[]>("configurations") || [];
        const soldbConfig = configurations.find(
          (config) => config.type === "soldb"
        );

        if (soldbConfig) {
          rpc = soldbConfig.rpc || rpc;
        }
        // If args were not provided via input box, try to get from launch.json or workspace settings
        if (args.length !== args_cnt) {
          args = soldbConfig?.functionArgs || [];
        }

        // Start a debug session with the function name and args
        const debugConfig: vscode.DebugConfiguration = {
          type: "soldb",
          name: "SolDB",
          request: "launch",
          function: functionName,
          functionArgs: args,
          rpc: rpc,
          source: vscode.window.activeTextEditor?.document.uri.fsPath || "",
          workspaceRoot:
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
        };
        // Get the workspace folder for the debug session
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        try {
          const success = await vscode.debug.startDebugging(
            workspaceFolder,
            debugConfig
          );
          if (success) {
            vscode.window.showInformationMessage(
              `Successfully started debugging`
            );
          } else {
            vscode.window.showWarningMessage(
              `Debug session may not have started. Check the Debug Console for details.`
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to start debugging: ${error}`);
        }
      }
    )
  );
}

export function deactivate() {}
