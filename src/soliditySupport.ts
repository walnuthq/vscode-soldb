import * as vscode from 'vscode';

/**
 * Provides CodeLens for Solidity functions, allowing users to debug functions directly from the editor
 */
export class SolidityCodeLensProvider implements vscode.CodeLensProvider {
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

