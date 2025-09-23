import * as vscode from 'vscode';
import * as path from 'path';

export class SoldbDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.DebugAdapterDescriptor {
        // Get configuration settings (launch.json overrides workspace settings)
        const workspaceConfig = vscode.workspace.getConfiguration('soldb');
        const pythonPath = session.configuration.pythonPath || workspaceConfig.get<string>('pythonPath') || 'python3';
        const soldbPath = session.configuration.soldbPath || workspaceConfig.get<string>('soldbPath') || '';
        const dapServerPath = session.configuration.dapServerPath || workspaceConfig.get<string>('dapServerPath') || '';
    
        // Require dap server path to be configured
        if (!dapServerPath) {
            throw new Error('dap server path not configured. Please set soldb.dapServerPath in settings or launch.json.');
        }
        
        // Build command arguments - launch dap_server.py as script
        const args = [dapServerPath];
        
        const env = {
            ...process.env,
            SOLDB_PATH: soldbPath,
            PYTHONPATH: `${path.dirname(dapServerPath)}:${soldbPath}/src:${process.env.PYTHONPATH || ''}`
        };


        return new vscode.DebugAdapterExecutable(pythonPath, ['-m', 'dap_server'], {
            env: env,
            cwd: path.dirname(dapServerPath)
        });
    }
}
