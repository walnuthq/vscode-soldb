import * as vscode from 'vscode';

export class SoldbDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.DebugAdapterDescriptor {
        // Get configuration settings (launch.json overrides workspace settings)
        const workspaceConfig = vscode.workspace.getConfiguration('soldb');
        const pythonPath = session.configuration.pythonPath || workspaceConfig.get<string>('pythonPath') || 'python3';
        const soldbPath = session.configuration.soldbPath || workspaceConfig.get<string>('soldbPath') || '';
    
        // Require soldb path to be configured
        if (!soldbPath) {
            throw new Error('soldb path not configured. Please set soldb.soldbPath in settings or launch.json.');
        }
        
        // Set PYTHONPATH to the src directory so Python can find the soldb module
        const srcPath = `${soldbPath}/src/soldb`;
        
        // Build command arguments - use module execution
        const args = ['-m', 'soldb.dap_server'];
        
        const executable = new vscode.DebugAdapterExecutable(
            pythonPath,
            args,
            {
                cwd: soldbPath,
                env: {
                    ...process.env,
                    PYTHONPATH: srcPath
                }
            }
        );
        return executable;
    }
}
