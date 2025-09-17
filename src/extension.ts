import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    // Register the soldb debug configuration provider
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('soldb', {
            resolveDebugConfiguration(folder, config) {
                config.type = 'soldb';
                config.request = config.request || 'launch';
                
                // Allow launch.json to override workspace settings
                const workspaceConfig = vscode.workspace.getConfiguration('soldb');
                config.pythonPath = config.pythonPath || workspaceConfig.get<string>('pythonPath') || 'python3';
                config.soldbPath = config.soldbPath || workspaceConfig.get<string>('soldbPath') || '';
                config.functionArgs = config.functionArgs || workspaceConfig.get<string[]>('functionArgs') || [];
                config.source = vscode.window.activeTextEditor?.document.uri.fsPath || '';
                return config;
            }
        })
    );
    
    // Register the soldb debug adapter descriptor factory
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('soldb', {
            createDebugAdapterDescriptor(session) {                
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
        })
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
            
            // Check if there are any soldb debug configurations in launch.json
            const launchConfig = vscode.workspace.getConfiguration('launch');
            const configurations = launchConfig.get<any[]>('configurations') || [];
            const soldbConfig = configurations.find(config => config.type === 'soldb');
            
            if (soldbConfig && soldbConfig.soldbPath) {
                soldbPath = soldbConfig.soldbPath;
                pythonPath = soldbConfig.pythonPath;
                contractsPath = soldbConfig.contracts || contractsPath;
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

class SolidityCodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void>;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
            const regexFunc = /function\s+(\w+)\s*\(([^)]*)\)/g;

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const matchFunc = regexFunc.exec(line.text);
                if (matchFunc) {
                    const functionName = matchFunc[1];
                    const params = matchFunc[2].trim();
                    // Extract parameter types
                    let types: string[] = [];
                    if (params.length > 0) {
                        types = params.split(',').map(param => {
                            let type = param.trim().split(/\s+/)[0];
                            return type;
                        });
                    }
                    const signature = `${functionName}(${types.join(',')})`;
                    const args_cnt = types.length;
                    const range = new vscode.Range(i, 0, i, line.text.length);
                    codeLenses.push(new vscode.CodeLens(range, {
                        title: 'Debug',
                        command: 'wn.runFunction',
                        arguments: [signature, args_cnt]
                    }));
                }
                regexFunc.lastIndex = 0; // Reset regex for next line
            }
            return codeLenses;
    }
}

