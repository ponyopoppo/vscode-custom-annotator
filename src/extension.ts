import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface Annotation {
    path: string;
    line: number;
    text: string;
    hoverMessage: string;
    color?: string;
    backgroundColor?: string;
}

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
    const lineInfoDecorationType = vscode.window.createTextEditorDecorationType(
        {
            overviewRulerColor: '#ECD662',
            overviewRulerLane: vscode.OverviewRulerLane.Full,
            after: {
                margin: '1rem',
            },
        }
    );

    let activeEditor = vscode.window.activeTextEditor;
    let lineDecoratorFile: string | null = null;
    let lastLineDecoratorFile: string | null = null;

    function parseFile(filename: string): Annotation[] {
        const dirname = path.dirname(filename);
        const currentFile =
            vscode.window.activeTextEditor?.document.uri.fsPath || '/';
        const original: Annotation[] = JSON.parse(
            fs.readFileSync(filename).toString('utf-8')
        );
        return original.filter(
            (annotation) =>
                path.normalize(path.resolve(dirname, annotation.path)) ===
                path.normalize(currentFile)
        );
    }

    function clearDecorations() {
        lineDecoratorFile = null;
        if (!activeEditor) {
            return;
        }
        activeEditor.setDecorations(lineInfoDecorationType, []);
    }

    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        if (!lineDecoratorFile) {
            return;
        }
        const annotations = parseFile(lineDecoratorFile);
        activeEditor.setDecorations(
            lineInfoDecorationType,
            annotations.map(
                ({ text, line, hoverMessage, color, backgroundColor }) => ({
                    renderOptions: {
                        after: {
                            contentText: text,
                            color,
                            backgroundColor,
                        },
                    },
                    range: new vscode.Range(
                        new vscode.Position(line - 1, 1024),
                        new vscode.Position(line - 1, 1024)
                    ),
                    hoverMessage,
                })
            )
        );
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('custom-annotator.load', async () => {
            const uris = await vscode.window.showOpenDialog({
                defaultUri: vscode.window.activeTextEditor?.document.uri.fsPath
                    ? vscode.Uri.parse(
                          vscode.window.activeTextEditor?.document.uri.fsPath
                      )
                    : undefined,
            });
            lineDecoratorFile = uris?.map((uri) => uri.path).join('\n') || null;
            if (!lineDecoratorFile) {
                vscode.window.showInformationMessage('No file is selected');
                return;
            }
            lastLineDecoratorFile = lineDecoratorFile;
            vscode.window.showInformationMessage('Using ' + lineDecoratorFile);
            updateDecorations();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('custom-annotator.reload', async () => {
            lineDecoratorFile = lastLineDecoratorFile;
            updateDecorations();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('custom-annotator.clear', async () => {
            clearDecorations();
        })
    );

    vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
            activeEditor = editor;
            updateDecorations();
        },
        null,
        context.subscriptions
    );

    vscode.workspace.onDidChangeTextDocument(
        (event) => {
            if (activeEditor && event.document === activeEditor.document) {
                clearDecorations();
            }
        },
        null,
        context.subscriptions
    );
}
