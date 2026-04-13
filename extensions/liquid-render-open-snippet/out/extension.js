"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const LIQUID_LANGUAGE_IDS = new Set([
    'liquid',
    'liquid-html',
]);
const COMMAND_OPEN_AT_CURSOR = 'shopivibe.liquid-render-open-snippet.openAtCursor';
/** Shopify theme snippet path glob; name must not contain glob metacharacters. */
function snippetGlobPattern(snippetName) {
    const safe = snippetName.replace(/[*?[\]{}]/g, '\\$&');
    return `**/snippets/${safe}.liquid`;
}
function isLiquidDocument(doc) {
    if (doc.uri.scheme !== 'file') {
        return false;
    }
    if (LIQUID_LANGUAGE_IDS.has(doc.languageId)) {
        return true;
    }
    return doc.fileName.endsWith('.liquid');
}
/**
 * Quoted first argument: {% render 'foo' %} or {% render "foo" %}
 * Same-line only (typical for render tags).
 */
function quotedRenderSnippetRanges(line) {
    const out = [];
    const re = /\{%-?\s*render\s+(['"])([^'"]+)\1/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        const name = m[2];
        const nameStart = m.index + m[0].indexOf(name);
        out.push({
            name,
            startChar: nameStart,
            endChar: nameStart + name.length,
        });
    }
    return out;
}
function snippetNameAtPosition(document, position) {
    const line = document.lineAt(position.line).text;
    const ranges = quotedRenderSnippetRanges(line);
    for (const r of ranges) {
        if (position.character >= r.startChar && position.character < r.endChar) {
            return r.name;
        }
    }
    return undefined;
}
const RENDER_SNIPPET_HOVER = new vscode.MarkdownString('**Snippet** — Cmd+Click or F12 (Go to Definition). Command: *Open Liquid render snippet at cursor*.');
RENDER_SNIPPET_HOVER.isTrusted = false;
/** `endChar` is exclusive (Range-compatible). */
function renderSnippetDecorationOptions(doc) {
    const out = [];
    for (let line = 0; line < doc.lineCount; line++) {
        const text = doc.lineAt(line).text;
        for (const r of quotedRenderSnippetRanges(text)) {
            out.push({
                range: new vscode.Range(line, r.startChar, line, r.endChar),
                hoverMessage: RENDER_SNIPPET_HOVER,
            });
        }
    }
    return out;
}
function applyRenderSnippetDecorations(editor, decorationType) {
    if (!isLiquidDocument(editor.document)) {
        editor.setDecorations(decorationType, []);
        return;
    }
    editor.setDecorations(decorationType, renderSnippetDecorationOptions(editor.document));
}
function refreshAllLiquidRenderSnippetDecorations(decorationType) {
    for (const editor of vscode.window.visibleTextEditors) {
        applyRenderSnippetDecorations(editor, decorationType);
    }
}
function registerRenderSnippetDecorations(context) {
    const decorationType = vscode.window.createTextEditorDecorationType({
        light: {
            backgroundColor: 'rgba(0, 92, 185, 0.09)',
        },
        dark: {
            backgroundColor: 'rgba(120, 180, 255, 0.14)',
        },
        after: {
            contentText: '↗',
            color: new vscode.ThemeColor('descriptionForeground'),
            fontWeight: '600',
            margin: '0 0 0 4px',
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    context.subscriptions.push(decorationType);
    const pendingByUri = new Map();
    function scheduleRefresh(doc) {
        const key = doc.uri.toString();
        const prev = pendingByUri.get(key);
        if (prev !== undefined) {
            clearTimeout(prev);
        }
        pendingByUri.set(key, setTimeout(() => {
            pendingByUri.delete(key);
            for (const editor of vscode.window.visibleTextEditors) {
                if (editor.document.uri.toString() === key) {
                    applyRenderSnippetDecorations(editor, decorationType);
                }
            }
        }, 80));
    }
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        if (!isLiquidDocument(e.document)) {
            return;
        }
        scheduleRefresh(e.document);
    }));
    context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => {
        refreshAllLiquidRenderSnippetDecorations(decorationType);
    }));
    refreshAllLiquidRenderSnippetDecorations(decorationType);
}
async function resolveSnippetUri(snippetName, token) {
    const pattern = snippetGlobPattern(snippetName);
    const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 8, token);
    if (files.length === 0) {
        return undefined;
    }
    files.sort((a, b) => a.fsPath.length - b.fsPath.length);
    return files[0];
}
async function openSnippetForName(name) {
    const uri = await resolveSnippetUri(name);
    if (!uri) {
        void vscode.window.showWarningMessage(`No snippet file found for "${name}" (expected **/snippets/${name}.liquid).`);
        return;
    }
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: true });
}
function registerDefinitionProvider(context) {
    const selector = [
        { language: 'liquid', scheme: 'file' },
        { language: 'liquid-html', scheme: 'file' },
        { pattern: '**/*.liquid', scheme: 'file' },
    ];
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, {
        async provideDefinition(document, position, token) {
            if (!isLiquidDocument(document)) {
                return undefined;
            }
            const name = snippetNameAtPosition(document, position);
            if (!name) {
                return undefined;
            }
            const uri = await resolveSnippetUri(name, token);
            if (!uri) {
                return undefined;
            }
            return new vscode.Location(uri, new vscode.Position(0, 0));
        },
    }));
}
function registerOpenAtCursorCommand(context) {
    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_OPEN_AT_CURSOR, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !isLiquidDocument(editor.document)) {
            return;
        }
        const name = snippetNameAtPosition(editor.document, editor.selection.active);
        if (!name) {
            void vscode.window.showInformationMessage('Put the cursor on the snippet name inside {% render \'…\' %}.');
            return;
        }
        await openSnippetForName(name);
    }));
}
function activate(context) {
    registerDefinitionProvider(context);
    registerOpenAtCursorCommand(context);
    registerRenderSnippetDecorations(context);
}
