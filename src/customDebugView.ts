import * as vscode from "vscode";

interface MonitoredTransaction {
  txHash: string;
  contractAddress?: string;
  entrypoint?: string;
  blockNumber?: number;
  from?: string;
  value?: string;
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

  constructor() {
    // Initial refresh
    this.refresh();
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
      } catch (error) {
        // If request fails, use empty list
        this.transactions = [];
      }

      // Build items list
      this.items = [];

      // Add monitored transactions
      if (this.transactions.length > 0) {
        this.items.push(
          new DebugViewItem(
            "Monitored Transactions",
            `${this.transactions.length} transaction(s)`,
            "list"
          )
        );

        for (const tx of this.transactions) {
          const txHash = tx.txHash || "unknown";
          const shortHash =
            txHash.length > 16 ? `${txHash.substring(0, 16)}...` : txHash;
          const description = tx.entrypoint ? `${tx.entrypoint}` : "";

          const item = new DebugViewItem(
            shortHash,
            description,
            "symbol-event",
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
        this.items.push(
          new DebugViewItem("No transactions monitored yet", "", undefined)
        );
      }
    } else {
      this.items = [
        new DebugViewItem("No active debug session", "", undefined),
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
