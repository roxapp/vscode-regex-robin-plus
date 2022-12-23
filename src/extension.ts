import * as vscode from "vscode";
// TODO: Rename. Refactor. This was copied from https://github.com/lokalise/i18n-ally/blob/main/src/editor/annotation.ts
import { EXTENSION_NAME, getConfig, Rule } from "./config";
import {
  LinkDefinitionProvider,
  TerminalLinkDefintionProvider as TerminalLinkDefinitionProvider,
} from "./LinkDefinitionProvider";
import { testRules } from "./testRules";
import {
  textMatcher,
  rangesOverlapLines,
  replaceMatches,
  documentMatcher,
} from "./util";

const log = vscode.window.createOutputChannel("Patterns");

// TODOL What is this - when is it used?
let activeRules: vscode.Disposable[] = [];

// TODO: See how they do it here: https://github.com/Gruntfuggly/todo-tree/blob/master/src/extension.js
export function activate(context: vscode.ExtensionContext): void {
  initFromConfig(context);

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(EXTENSION_NAME)) {
      initFromConfig(context);
    }
  });

  // TODO: Add throttling
  // TODO: Dispose
  update();
  vscode.workspace.onDidChangeTextDocument(update);
  vscode.window.onDidChangeTextEditorSelection(update, null, []);

  // TODO: Implement disposing these and re-init on config change. Same with the colours above.
  activeRules.push(
    ...testRules.flatMap((rule) => {
      // TODO: Terminal links, too
      // TODO: Custom link text for hover
      return [
        vscode.languages.registerDocumentLinkProvider(
          rule.languages.map((language) => ({ language })),
          new LinkDefinitionProvider(rule)
        ),
        vscode.window.registerTerminalLinkProvider(
          new TerminalLinkDefinitionProvider(rule)
        ),
      ];
    })
  );
}

// const config = getConfig();

const allColorDecorations = new Set<vscode.TextEditorDecorationType>();

const disappearDecoration = vscode.window.createTextEditorDecorationType({
  textDecoration: "none; display: none;", // a hack to inject custom style
});

const decoratedRules = testRules.map((rule) => {
  const decoration = rule.color
    ? vscode.window.createTextEditorDecorationType({
        // TODO: Make underline an option
        // textDecoration: `none; color: ${rule.color}; text-decoration: underline;`,
        textDecoration: `none; color: ${rule.color};`,
      })
    : null;

  if (decoration) {
    allColorDecorations.add(decoration);
  }

  return {
    ...rule,
    decoration,
  };
});

// TODO: Throttle
function update() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;

  if (!editor || !document) return;

  const matches = decoratedRules.flatMap((rule) => {
    return documentMatcher(document, rule).map((match) => {
      return { ...match, rule };
    });
  });

  // const disappearDecorationType =
  //   vscode.window.createTextEditorDecorationType({
  //     textDecoration: "none; display: none;", // a hack to inject custom style
  //   });

  const decorationMap = new Map<
    vscode.TextEditorDecorationType,
    typeof matches
  >();

  // Group matches by decoration
  for (const match of matches) {
    if (match.rule.decoration) {
      if (decorationMap.has(match.rule.decoration)) {
        decorationMap.get(match.rule.decoration)?.push(match);
      } else {
        decorationMap.set(match.rule.decoration, [match]);
      }
    }
  }

  const selection = editor.selection;
  const hideRanges: vscode.Range[] = [];
  // Apply decoration

  for (const decoration of allColorDecorations) {
    const relevantMatches = decorationMap.get(decoration) ?? [];

    editor.setDecorations(
      decoration,
      relevantMatches.map(
        ({ match, range, rule }): vscode.DecorationOptions => {
          const lineIsInSelection = rangesOverlapLines(selection, range);
          let replacementText = "";

          if (!lineIsInSelection && rule.replaceWith) {
            replacementText = replaceMatches(rule.replaceWith, match);
            hideRanges.push(range);
          }

          const hoverMessage =
            rule.hoverMessage && replaceMatches(rule.hoverMessage, match);

          return {
            range,
            hoverMessage,
            renderOptions: {
              before: {
                color: rule.color,
                contentText: replacementText,
                fontStyle: "normal",
                // textDecoration: "underline",
                // backgroundColor: replacementText ? "#ffffff10" : "",
                // border: replacementText
                //   ? `0.5px solid ${match.data.color}; border-radius: 2px;`
                //   : "",
              },
            },
          };
        }
      )
    );
  }

  editor.setDecorations(disappearDecoration, hideRanges);
}

function initFromConfig(context: vscode.ExtensionContext): void {
  const config = getConfig();

  for (const rule of activeRules) {
    rule.dispose();
  }

  for (const rule of activeRules) {
    context.subscriptions.push(rule);
  }
}
