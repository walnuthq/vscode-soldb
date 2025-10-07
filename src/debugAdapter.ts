import * as vscode from 'vscode';

export class SoldbDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.DebugAdapterDescriptor {
        // Get configuration settings (launch.json overrides workspace settings)
        const workspaceConfig = vscode.workspace.getConfiguration('soldb');
        
        // Use the specific venv where soldb-dap-server is installed
        const soldbEnv = session.configuration.soldbEnv || workspaceConfig.get<string>('soldbEnv') || '';
        
        // Validate that soldbEnv is set
        if (!soldbEnv) {
            throw new Error('soldbEnv must be configured. Please set soldbEnv in launch.json');
        }

        // Get the venv path from soldbEnv and construct the dap server executable path
        const venvBinDir = `${soldbEnv}/bin`;
        const dapServerPath = `${venvBinDir}/soldb-dap-server`;
        
        // Use the soldb-dap-server executable from the venv bin directory
        return new vscode.DebugAdapterExecutable(dapServerPath, [], {
            env: Object.fromEntries(
                Object.entries(process.env).filter(([_, value]) => value !== undefined)
            ) as { [key: string]: string }
        });
    }
}
