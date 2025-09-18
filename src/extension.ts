import * as vscode from 'vscode';
import { SoldbDebugConfigurationProvider } from './configProvider';
import { SoldbDebugAdapterDescriptorFactory } from './debugAdapter';
import { SolidityCodeLensProvider } from './soliditySupport';

export function activate(context: vscode.ExtensionContext) {

    // Register the soldb debug configuration provider
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('soldb', new SoldbDebugConfigurationProvider())
    );
    
    // Register the soldb debug adapter descriptor factory
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('soldb', new SoldbDebugAdapterDescriptorFactory())
    );

    // Register CodeLens provider for Solidity
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'solidity' }, new SolidityCodeLensProvider())
    );

    // Register the command that CodeLens will trigger
    context.subscriptions.push(
        vscode.commands.registerCommand('wn.runFunction', async (functionName: string, args_cnt: number) => {

            let args: string[] = [];
            if (args_cnt > 0) {
                const argsInput = await vscode.window.showInputBox({
                    prompt: `Enter arguments for ${functionName} (comma separated) or leave empty to use contracts.json`
                });
                args = argsInput ? argsInput.split(',').map(s => s.trim()) : [];
                if (args.length === 0) {
                    vscode.window.showInformationMessage(`No arguments provided for ${functionName}, using contracts.json instead.`);
                }
                else if (args.length !== args_cnt) {
                    vscode.window.showErrorMessage(`Expected ${args_cnt} arguments, but got ${args.length}`);
                    return;
                }
            }

            // Get configuration settings (same as debug adapter descriptor)
            const workspaceConfig = vscode.workspace.getConfiguration('soldb');
            
            // Try to get soldbPath from launch.json configurations first, then workspace settings
            let soldbPath = workspaceConfig.get<string>('soldbPath') || '';
            let pythonPath = workspaceConfig.get<string>('pythonPath') || 'python3';
            let contractsPath = workspaceConfig.get<string>('contracts') || 'contracts.json';
            let from_addr = workspaceConfig.get<string>('from_addr') || "";
            
            // Check if there are any soldb debug configurations in launch.json
            const launchConfig = vscode.workspace.getConfiguration('launch');
            const configurations = launchConfig.get<any[]>('configurations') || [];
            const soldbConfig = configurations.find(config => config.type === 'soldb');
            
            if (soldbConfig && soldbConfig.soldbPath) {
                soldbPath = soldbConfig.soldbPath;
                pythonPath = soldbConfig.pythonPath;
                contractsPath = soldbConfig.contracts || contractsPath;
                from_addr = soldbConfig.from_addr || "";
            }
            // If args were not provided via input box, try to get from launch.json or workspace settings
            if (args.length !== args_cnt) {
                args = soldbConfig.functionArgs || [];
            }

            if (!soldbPath) {
                vscode.window.showErrorMessage('soldb path not configured. Please set soldbPath in launch.json.');
                return;
            }
            // Start a debug session with the function name and args
            const debugConfig: vscode.DebugConfiguration = {
                type: 'soldb',
                name: 'Debug Function',
                request: 'launch',
                soldbPath: soldbPath,
                function: functionName,
                functionArgs: args,
                pythonPath: pythonPath,
                contracts: contractsPath,
                from_addr: from_addr,
                source: vscode.window.activeTextEditor?.document.uri.fsPath || '',
                workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
            };            
            // Get the workspace folder for the debug session
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            
            try {
                const success = await vscode.debug.startDebugging(workspaceFolder, debugConfig);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start debugging: ${error}`);
            }
        })
    );
}

export function deactivate() {}

