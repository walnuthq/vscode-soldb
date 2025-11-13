import * as vscode from "vscode";

interface MonitoredTransaction {
  txHash: string;
  contractAddress?: string;
  entrypoint?: string;
  blockNumber?: number;
  from?: string;
  value?: string;
  status?: number; // 1 = success, 0 = failed/reverted, undefined = unknown
}

export class CustomDebugViewProvider
  implements vscode.TreeDataProvider<DebugViewItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    DebugViewItem | undefined | null | void
  > = new vscode.EventEmitter<DebugViewItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    DebugViewItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private items: DebugViewItem[] = [];
  private transactions: MonitoredTransaction[] = [];
  private rpcUrl: string = "";

  constructor() {
    // Initial refresh
    this.refresh();

    // Listen for debug session start to capture RPC URL
    vscode.debug.onDidStartDebugSession((session) => {
      if (session.type === "soldb") {
        const config = session.configuration;
        if (config?.rpc) {
          this.rpcUrl = config.rpc;
          this.refresh();
        }
      }
    });
  }

  refresh(): void {
    this.updateItems();
    this._onDidChangeTreeData.fire();
  }

  private async updateItems(): Promise<void> {
    const session = vscode.debug.activeDebugSession;

    if (session && session.type === "soldb") {
      try {
        // Get monitored transactions from DAP server
        const response = await session.customRequest(
          "getMonitoredTransactions",
          {}
        );
        if (response && response.transactions) {
          this.transactions = response.transactions as MonitoredTransaction[];
        }
        // Get RPC URL from response or session configuration
        if (response && response.rpcUrl) {
          this.rpcUrl = response.rpcUrl;
        } else {
          // Fallback to session configuration
          const config = session.configuration;
          this.rpcUrl = config?.rpc || "unknown";
        }
      } catch (error) {
        // If request fails, use empty list
        this.transactions = [];
        // Try to get RPC from session configuration
        const config = session.configuration;
        this.rpcUrl = config?.rpc || "unknown";
      }

      // Build items list
      this.items = [];

      // Add monitored transactions
      if (this.transactions.length > 0) {
        const rpcLabel =
          this.rpcUrl && this.rpcUrl !== "unknown" ? this.rpcUrl : "unknown";
        this.items.push(
          new DebugViewItem(
            `Monitoring transactions at ${rpcLabel}`,
            `${this.transactions.length} transaction(s)`,
            "list"
          )
        );

        for (const tx of this.transactions) {
          const txHash = tx.txHash || "unknown";
          const description = tx.entrypoint ? `${tx.entrypoint}` : "";
          // Check if transaction failed (status === 0)
          const isFailed = tx.status !== undefined && tx.status === 0;
          // Use "error" icon for failed transactions, "check" for successful ones
          const icon = isFailed ? "error" : "check";

          const item = new DebugViewItem(
            txHash,
            description,
            icon,
            "transaction" // Context value for menu
          );
          item.command = {
            command: "soldb.debugTransaction",
            title: "Debug Transaction",
            arguments: [txHash],
          };
          this.items.push(item);
        }
      } else {
        const rpcLabel =
          this.rpcUrl && this.rpcUrl !== "unknown"
            ? `RPC (${this.rpcUrl})`
            : "RPC (unknown)";
        const item = new DebugViewItem(
          `Connected to ${rpcLabel}`,
          "\nNo transactions", // Try with newline in description
          undefined
        );
        this.items.push(item);
      }
    } else {
      // No active session - try to get RPC from configuration
      let rpcUrl: string | undefined = undefined;
      try {
        // Try to get from workspace settings
        const workspaceConfig = vscode.workspace.getConfiguration("soldb");
        rpcUrl = workspaceConfig.get<string>("rpc");

        // If not found, try to get from launch.json configurations
        if (!rpcUrl) {
          const launchConfig = vscode.workspace.getConfiguration("launch");
          const configurations =
            launchConfig.get<any[]>("configurations") || [];
          const soldbConfig = configurations.find(
            (config) => config.type === "soldb"
          );
          if (soldbConfig && soldbConfig.rpc) {
            rpcUrl = soldbConfig.rpc;
          }
        }
      } catch (error) {
        // If error, rpcUrl remains undefined
      }

      // Use default Anvil RPC if not found
      const defaultRpc = "http://localhost:8545";
      const rpcUrlToDisplay = rpcUrl || defaultRpc;
      const rpcLabel = rpcUrl
        ? `RPC : ${rpcUrl}`
        : `RPC : ${defaultRpc} [default Anvil]`;

      this.items = [
        new DebugViewItem(
          `No active debug session at ${rpcLabel}`,
          "",
          undefined
        ),
      ];
    }
  }

  getTreeItem(element: DebugViewItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DebugViewItem): Promise<DebugViewItem[]> {
    if (!element) {
      // Refresh transactions before returning items
      await this.updateItems();
      return Promise.resolve(this.items);
    }
    return Promise.resolve([]);
  }
}

class DebugViewItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly iconPath?: string | vscode.ThemeIcon,
    public readonly contextValue?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `${this.label} - ${this.description}`;
    this.description = description;
    this.contextValue = contextValue;

    if (iconPath) {
      if (typeof iconPath === "string") {
        this.iconPath = new vscode.ThemeIcon(iconPath);
      } else {
        this.iconPath = iconPath;
      }
    }
  }
}
