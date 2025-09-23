import * as vscode from 'vscode';
import * as path from 'path';

export class SoldbDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.DebugAdapterDescriptor {
        // Get configuration settings (launch.json overrides workspace settings)
        const workspaceConfig = vscode.workspace.getConfiguration('soldb');
        const pythonPath = session.configuration.pythonPath || workspaceConfig.get<string>('pythonPath') || 'python3';
        const soldbPath = session.configuration.soldbPath || workspaceConfig.get<string>('soldbPath') || '';
    
        const dapPath = `${soldbPath}/tools/dap_server.py`;
        // Build command arguments - launch dap_server.py as script
        const env = {
            ...process.env,
            SOLDB_PATH: soldbPath,
            PYTHONPATH: `${path.dirname(dapPath)}:${soldbPath}/src:${process.env.PYTHONPATH || ''}`
        };


        return new vscode.DebugAdapterExecutable(pythonPath, ['-m', 'dap_server'], {
            env: env,
            cwd: path.dirname(dapPath)
        });
        
    }
}
