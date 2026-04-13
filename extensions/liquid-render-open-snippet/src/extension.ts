import * as vscode from 'vscode';

const LIQUID_LANGUAGE_IDS = new Set([
  'liquid',
  'liquid-html',
]);

/** Shopify theme snippet path glob; name must not contain glob metacharacters. */
function snippetGlobPattern(snippetName: string): string {
  const safe = snippetName.replace(/[*?[\]{}]/g, '\\$&');
  return `**/snippets/${ safe }.liquid`;
}

function isLiquidDocument(doc: vscode.TextDocument): boolean {
  if (doc.uri.scheme !== 'file') {
    return false;
  }
  if (LIQUID_LANGUAGE_IDS.has(doc.languageId)) {
    return true;
  }
  return doc.fileName.endsWith('.liquid');
}

interface RenderSnippetRange {
  name: string;
  startChar: number;
  endChar: number;
}

/**
 * Quoted first argument: {% render 'foo' %} or {% render "foo" %}
 * Same-line only (typical for render tags).
 */
function quotedRenderSnippetRanges(line: string): RenderSnippetRange[] {
  const out: RenderSnippetRange[] = [];
  const re = /\{%-?\s*render\s+(['"])([^'"]+)\1/g;
  let m: RegExpExecArray | null;
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

function snippetNameFromSelection(
  doc: vscode.TextDocument,
  sel: vscode.Selection,
): string | undefined {
  if (sel.start.line !== sel.end.line) {
    return undefined;
  }
  const lineText = doc.lineAt(sel.start.line).text;
  const ranges = quotedRenderSnippetRanges(lineText);
  const selected = doc.getText(sel);
  const normalized = selected.replace(/^['"]|['"]$/g, '');
  for (const r of ranges) {
    const inside =
      sel.start.character >= r.startChar && sel.end.character <= r.endChar;
    if (!inside) {
      continue;
    }
    if (selected === r.name || normalized === r.name) {
      return r.name;
    }
  }
  return undefined;
}

async function resolveSnippetUri(
  snippetName: string,
  token?: vscode.CancellationToken,
): Promise<vscode.Uri | undefined> {
  const pattern = snippetGlobPattern(snippetName);
  const files = await vscode.workspace.findFiles(
    pattern,
    '**/node_modules/**',
    8,
    token,
  );
  if (files.length === 0) {
    return undefined;
  }
  files.sort((a, b) => a.fsPath.length - b.fsPath.length);
  return files[0];
}

function registerDefinitionProvider(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = [
    { language: 'liquid', scheme: 'file' },
    { language: 'liquid-html', scheme: 'file' },
    { pattern: '**/*.liquid', scheme: 'file' },
  ];

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(selector, {
      async provideDefinition(document, position, token) {
        if (!isLiquidDocument(document)) {
          return undefined;
        }
        const line = document.lineAt(position.line).text;
        const ranges = quotedRenderSnippetRanges(line);
        for (const r of ranges) {
          if (position.character >= r.startChar && position.character < r.endChar) {
            const uri = await resolveSnippetUri(r.name, token);
            if (!uri) {
              return undefined;
            }
            return new vscode.Location(uri, new vscode.Position(0, 0));
          }
        }
        return undefined;
      },
    }),
  );
}

/**
 * Double-click selects a word with the mouse; VS Code does not expose double-click,
 * so we open when a mouse-driven selection stabilizes on a render snippet name.
 */
function registerDoubleClickOpen(context: vscode.ExtensionContext): void {
  let debounce: ReturnType<typeof setTimeout> | undefined;

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (!isLiquidDocument(e.textEditor.document)) {
        return;
      }
      if (e.kind === vscode.TextEditorSelectionChangeKind.Keyboard) {
        return;
      }
      if (e.kind === vscode.TextEditorSelectionChangeKind.Command) {
        return;
      }

      if (debounce !== undefined) {
        clearTimeout(debounce);
      }

      debounce = setTimeout(async () => {
        debounce = undefined;
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor !== e.textEditor) {
          return;
        }
        const sel = editor.selection;
        if (sel.isEmpty) {
          return;
        }
        const name = snippetNameFromSelection(editor.document, sel);
        if (!name) {
          return;
        }
        const uri = await resolveSnippetUri(name);
        if (!uri) {
          void vscode.window.showWarningMessage(
            `No snippet file found for "${ name }" (expected **/snippets/${ name }.liquid).`,
          );
          return;
        }
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: true });
      }, 220);
    }),
  );
}

export function activate(context: vscode.ExtensionContext): void {
  registerDefinitionProvider(context);
  registerDoubleClickOpen(context);
}
