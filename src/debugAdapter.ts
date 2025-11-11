import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

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
      vscode.window.showInformationMessage(
        `Setting up debug adapter for: ${workspaceRoot}`
      );

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
      vscode.window.showInformationMessage(
        `Successfully found soldb-dap-server in ${dapServerPath}`
      );
      return dapServerPath;
    } catch {
      vscode.window.showWarningMessage(
        `soldb-dap-server not found in PATH. Please ensure soldb-dap-server is properly installed.`
      );
    }

    return null;
  }
}
