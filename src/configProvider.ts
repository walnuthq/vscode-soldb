import * as vscode from 'vscode';

export class SoldbDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken): vscode.DebugConfiguration[] {
        return [
            {
                name: 'Debug Solidity Function',
                type: 'soldb',
                request: 'launch',
                pythonPath: 'python3',
                soldbPath: '',
                dapServerPath: '',
                function: '',
                functionArgs: [],
                contracts: '',
                ethdebugDir: '',
                from_addr: '',
                contractAddress: '',
                source: '${file}',
                workspaceRoot: '${workspaceFolder}'
            }
        ];
    }

    resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): vscode.DebugConfiguration | null {
        // If no configuration is provided, return null to cancel debug session
        if (!config.type && !config.request && !config.name) {
            return null;
        }

        config.type = 'soldb';
        config.request = config.request || 'launch';
        
        // Allow launch.json to override workspace settings
        const workspaceConfig = vscode.workspace.getConfiguration('soldb');
        config.pythonPath = config.pythonPath || workspaceConfig.get<string>('pythonPath') || 'python3';
        config.soldbPath = config.soldbPath || workspaceConfig.get<string>('soldbPath') || '';
        config.dapServerPath = config.dapServerPath || workspaceConfig.get<string>('dapServerPath') || '';
        config.functionArgs = config.functionArgs || workspaceConfig.get<string[]>('functionArgs') || [];
        config.contracts = config.contracts || workspaceConfig.get<string>('contracts') || '';
        config.ethdebugDir = config.ethdebugDir || workspaceConfig.get<string>('ethdebugDir') || '';
        config.from_addr = config.from_addr || workspaceConfig.get<string>('from_addr') || "";
        config.contractAddress = config.contractAddress || workspaceConfig.get<string>('contractAddress') || "";
        config.source = config.source || vscode.window.activeTextEditor?.document.uri.fsPath || '';
        config.workspaceRoot = config.workspaceRoot || folder?.uri.fsPath || '';

        // Validate required configuration
        if (!config.soldbPath) {
            vscode.window.showErrorMessage('soldb path not configured. Please set soldb.soldbPath in settings or launch.json.');
            return null;
        }

        return config;
    }

    resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): vscode.DebugConfiguration | null {
        // Additional validation
        return config;
    }
}