# SolDB Debugger - VSCode Extension

Debug your Solidity smart contracts directly in Visual Studio Code with step-by-step execution, breakpoints, and variable inspection.

## Quick Start

### Prerequisites

Before using the extension, make sure you have:

1. **soldb** installed and available in your PATH

   Install soldb: [Quick Start Guide](https://github.com/walnuthq/soldb?tab=readme-ov-file#quick-start)

   ```bash
   # Check if installed
   soldb --version
   ```

2. **solc** (Solidity compiler) version at least 0.8.29 is installed

   ```bash
   # Check if installed
   solc --version
   ```

3. A running RPC node (e.g., Anvil)

   ```bash
   # For local development, start Anvil
   anvil --steps-tracing
   ```

### Setup

1. **Create launch configuration**

   Create `.vscode/launch.json` in your project root:

   ```json
   {
       "version": "0.2.0",
       "configurations": [
           {
               "name": "SolDB",
               "type": "soldb",
               "request": "launch"
           }
       ]
   }
   ```

2. **Open your Solidity file** in the editor

3. **Start debugging** by pressing `F5` or clicking the debug button

That's it! The extension will automatically:

- Detect your workspace and Solidity files
- Compile contracts with debugging information
- Connect to your RPC (default: `http://localhost:8545`)
- Start monitoring for transactions

## How to Use

The extension watches your blockchain for transactions and lets you debug them.

1. **Start a debug session** (F5)
2. **Deploy or interact** with your contract (using Remix, Foundry, or any tool)
3. **View transactions** in the "Transactions" panel (left sidebar)
4. **Click a transaction** to start debugging it
5. **Set breakpoints** in your Solidity code and step through execution

## Need Help?

- Check the [soldb documentation](https://github.com/walnuthq/soldb)
- Open an issue on GitHub
- Make sure your `soldb` and `solc` versions are compatible