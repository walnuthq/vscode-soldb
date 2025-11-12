import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import {
  isLocalhostRpc,
  checkRpcAvailability,
  showAnvilNotRunningWarning,
} from "./rpcUtils";

const execAsync = promisify(exec);

export class SoldbDebugAdapterDescriptorFactory
  implements vscode.DebugAdapterDescriptorFactory
{
  async createDebugAdapterDescriptor(
    session: vscode.DebugSession,
    executable?: vscode.DebugAdapterExecutable
  ): Promise<vscode.DebugAdapterDescriptor> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        const error = "No workspace folder found";
        vscode.window.showErrorMessage(error);
        throw new Error(error);
      }

      const workspaceRoot = workspaceFolder.uri.fsPath;

      // Get RPC URL from session configuration
      const config = session.configuration;
      const rpcUrl = config?.rpc || "http://localhost:8545";

      // Check if Anvil/RPC is running (only for localhost RPCs)
      const isLocalhost = isLocalhostRpc(rpcUrl);
      if (isLocalhost) {
        const isRunning = await checkRpcAvailability(rpcUrl);
        if (!isRunning) {
          await showAnvilNotRunningWarning(rpcUrl);
        }
      }

      // Check for soldb --version
      try {
        await execAsync("soldb --version");
      } catch (error) {
        const errorMsg =
          "soldb is not installed or not in PATH. Please install soldb first.";
        vscode.window.showErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }

      // Check for solc --version
      try {
        await execAsync("solc --version");
      } catch (error) {
        const errorMsg =
          "solc is not installed or not in PATH. Please install solc first.";
        vscode.window.showErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }

      const dapServerPath = await this.findDapServer();

      if (!dapServerPath) {
        const error =
          "soldb-dap-server not found. Please ensure soldb is properly installed.";
        vscode.window.showErrorMessage(error);
        throw new Error(error);
      }

      return new vscode.DebugAdapterExecutable(dapServerPath, [], {
        env: Object.fromEntries(
          Object.entries(process.env).filter(
            ([_, value]) => value !== undefined
          )
        ) as { [key: string]: string },
      });
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      vscode.window.showErrorMessage(
        `Failed to create debug adapter: ${errorMsg}`
      );
      throw error;
    }
  }

  private async findDapServer(): Promise<string | null> {
    try {
      const { stdout } = await execAsync("which soldb-dap-server");
      const dapServerPath = stdout.trim();
      return dapServerPath;
    } catch {
      vscode.window.showWarningMessage(
        `soldb not found in PATH. Please ensure soldb is properly installed.`
      );
    }

    return null;
  }
}
