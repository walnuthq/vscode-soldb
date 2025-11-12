import * as vscode from "vscode";
import * as net from "net";

/**
 * Check if RPC URL is a localhost address
 */
export function isLocalhostRpc(rpcUrl: string): boolean {
  try {
    const url = new URL(rpcUrl);
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0"
    );
  } catch {
    return false;
  }
}

/**
 * Check if RPC endpoint is available by attempting TCP connection
 */
export async function checkRpcAvailability(rpcUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const url = new URL(rpcUrl);
      const hostname = url.hostname;
      const port = parseInt(
        url.port || (url.protocol === "https:" ? "443" : "80"),
        10
      );

      // Use TCP socket to check if port is listening
      const socket = new net.Socket();
      socket.setTimeout(2000);

      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });

      socket.on("error", () => {
        resolve(false);
      });

      socket.connect(port, hostname);
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Show warning message and terminal output when Anvil is not running
 */
export async function showAnvilNotRunningWarning(
  rpcUrl: string
): Promise<void> {
  const message = `⚠️ Anvil node is not running at ${rpcUrl}. Please start Anvil before debugging.`;

  // Show VS Code popup warning
  await vscode.window.showWarningMessage(message, "Open Terminal");

  // Create terminal output with red text
  const terminal = vscode.window.createTerminal("Soldb - Anvil Check");
  terminal.show();

  // Use printf with ANSI escape codes for red text (works in bash/zsh)
  // Escape the message properly for shell
  const escapedMessage = message.replace(/"/g, '\\"');
  terminal.sendText(`printf "\\033[31m${escapedMessage}\\033[0m\\n"`);
}
