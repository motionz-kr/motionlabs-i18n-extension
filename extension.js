const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const jsonc = require("jsonc-parser");

let translations = {};
let translationFilePath;
let activeEditor = vscode.window.activeTextEditor;

const inlineDecorationType = vscode.window.createTextEditorDecorationType({
  after: {
    margin: "0 0 0 1em",
    fontStyle: "italic",
    color: new vscode.ThemeColor("editorCodeLens.foreground"),
  },
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
});

function updateDecorations() {
  if (!activeEditor) {
    return;
  }

  const document = activeEditor.document;
  if (
    ![
      "typescript",
      "typescriptreact",
      "javascript",
      "javascriptreact",
    ].includes(document.languageId)
  ) {
    activeEditor.setDecorations(inlineDecorationType, []);
    return;
  }

  const text = document.getText();
  const decorationsArray = [];
  const regex = /t\(([^)]+)\)/g;
  const keyRegex = /['"`]([^'"`]+)['"`]/;
  let match;

  while ((match = regex.exec(text))) {
    const innerMatch = match[1].match(keyRegex);
    if (!innerMatch) continue;

    const key = innerMatch[1];
    const translation = getTranslation(key);

    if (translation && typeof translation.ko === "string") {
      const translationText = translation.ko;
      const endOfTFunction = match.index + match[0].length;
      const position = document.positionAt(endOfTFunction);

      const range = new vscode.Range(position, position);

      const decoration = {
        range,
        renderOptions: {
          after: {
            contentText: `  // ${translationText}`,
          },
        },
      };
      decorationsArray.push(decoration);
    }
  }
  activeEditor.setDecorations(inlineDecorationType, decorationsArray);
}

// #region Helper Functions
function getTranslationKeysFirst(key) {
  const keys = key.split(".");
  let result = translations;
  for (const k of keys) {
    if (result && typeof result === "object" && k in result) {
      result = result[k];
    } else {
      return null;
    }
  }

  if (result && typeof result === "object") {
    return result;
  }
  if (typeof result === "string") {
    return result;
  }
  return null;
}

function getTranslationLanguageFirst(key) {
  const keys = key.split(".");
  const result = {};

  for (const lang in translations) {
    if (Object.prototype.hasOwnProperty.call(translations, lang)) {
      let value = translations[lang];
      let found = true;

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          found = false;
          break;
        }
      }

      if (found && typeof value === "string") {
        result[lang] = value;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function findPositionOfKeyKeysFirst(key) {
  if (!translationFilePath) return null;

  try {
    const text = fs.readFileSync(translationFilePath, "utf8");
    const tree = jsonc.parseTree(text);
    if (!tree) return null;

    const path = key.split(".");
    const node = jsonc.findNodeAtLocation(tree, path);

    if (node && node.parent && node.parent.children) {
      const propertyNode = node.parent;
      const keyNode = propertyNode.children[0];
      if (keyNode) {
        const positionAt = (offset) => {
          const lines = text.substring(0, offset).split("\n");
          const line = lines.length - 1;
          const character = lines[lines.length - 1].length;
          return new vscode.Position(line, character);
        };
        const startPosition = positionAt(keyNode.offset + 1);
        const endPosition = positionAt(keyNode.offset + keyNode.length - 1);
        return new vscode.Range(startPosition, endPosition);
      }
    }
    return null;
  } catch (e) {
    console.error("Error finding key position:", e);
    return null;
  }
}

function findPositionOfKeyLanguageFirst(key) {
  if (!translationFilePath) return null;

  try {
    const text = fs.readFileSync(translationFilePath, "utf8");
    const tree = jsonc.parseTree(text);
    if (!tree) return null;

    const keyPath = key.split(".");

    if (tree.children) {
      for (const langNode of tree.children) {
        if (langNode.children && langNode.children.length > 1) {
          const langValueNode = langNode.children[1];
          const node = jsonc.findNodeAtLocation(langValueNode, keyPath);

          if (node && node.parent && node.parent.children) {
            const propertyNode = node.parent;
            const keyNode = propertyNode.children[0];
            if (keyNode) {
              const positionAt = (offset) => {
                const lines = text.substring(0, offset).split("\n");
                const line = lines.length - 1;
                const character = lines[lines.length - 1].length;
                return new vscode.Position(line, character);
              };
              const startPosition = positionAt(keyNode.offset + 1);
              const endPosition = positionAt(
                keyNode.offset + keyNode.length - 1
              );
              return new vscode.Range(startPosition, endPosition);
            }
          }
        }
      }
    }
    return null;
  } catch (e) {
    console.error("Error finding key position:", e);
    return null;
  }
}
// #endregion

async function loadTranslations() {
  const config = vscode.workspace.getConfiguration("motionlabs-i18n");
  const translationFilePattern = config.get("translationFilePath");

  if (!translationFilePattern) {
    vscode.window.showErrorMessage("Translation file path is not configured.");
    return;
  }

  const translationFiles = await vscode.workspace.findFiles(
    translationFilePattern,
    "**/node_modules/**",
    1
  );

  if (translationFiles.length > 0) {
    translationFilePath = translationFiles[0].fsPath;
  } else {
    vscode.window.showInformationMessage(
      `No translation file found matching the pattern: ${translationFilePattern}`
    );
    translationFilePath = undefined;
    translations = {};
    updateDecorations();
    return;
  }

  try {
    const data = fs.readFileSync(translationFilePath, "utf8");
    translations = jsonc.parse(data);
    console.log("Translations loaded successfully.");
  } catch (error) {
    console.error("Error loading or parsing translations.json:", error);
    vscode.window.showErrorMessage(
      `Failed to load translations: ${error.message}`
    );
    translations = {};
    translationFilePath = undefined;
  }
  updateDecorations();
}

function findPositionOfKey(key) {
  const config = vscode.workspace.getConfiguration("motionlabs-i18n");
  const structure = config.get("translationFileStructure");

  if (structure === "languageFirst") {
    return findPositionOfKeyLanguageFirst(key);
  } else {
    return findPositionOfKeyKeysFirst(key);
  }
}

function getTranslation(key) {
  const config = vscode.workspace.getConfiguration("motionlabs-i18n");
  const structure = config.get("translationFileStructure");

  if (structure === "languageFirst") {
    return getTranslationLanguageFirst(key);
  } else {
    return getTranslationKeysFirst(key);
  }
}

function activate(context) {
  console.log(
    'Congratulations, your extension "motionlabs-i18n" is now active!'
  );

  loadTranslations();

  const config = vscode.workspace.getConfiguration("motionlabs-i18n");
  let translationFilePattern = config.get("translationFilePath");

  let fileWatcher = vscode.workspace.createFileSystemWatcher(
    translationFilePattern
  );
  fileWatcher.onDidChange(loadTranslations);
  fileWatcher.onDidCreate(loadTranslations);
  fileWatcher.onDidDelete(() => {
    translations = {};
    translationFilePath = undefined;
    updateDecorations();
  });
  context.subscriptions.push(fileWatcher);

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (
      e.affectsConfiguration("motionlabs-i18n.translationFilePath") ||
      e.affectsConfiguration("motionlabs-i18n.translationFileStructure")
    ) {
      loadTranslations();

      if (e.affectsConfiguration("motionlabs-i18n.translationFilePath")) {
        // Re-create the file watcher with the new path
        fileWatcher.dispose();
        const newConfig = vscode.workspace.getConfiguration("motionlabs-i18n");
        translationFilePattern = newConfig.get("translationFilePath");
        fileWatcher = vscode.workspace.createFileSystemWatcher(
          translationFilePattern
        );
        fileWatcher.onDidChange(loadTranslations);
        fileWatcher.onDidCreate(loadTranslations);
        fileWatcher.onDidDelete(() => {
          translations = {};
          translationFilePath = undefined;
          updateDecorations();
        });
        context.subscriptions.push(fileWatcher);
      }
    }
  });

  let timeout;
  function triggerUpdateDecorations() {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(updateDecorations, 500);
  }

  if (activeEditor) {
    triggerUpdateDecorations();
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  let hoverProvider = vscode.languages.registerHoverProvider(
    ["typescript", "typescriptreact", "javascript", "javascriptreact"],
    {
      provideHover(document, position) {
        const regex = /t\(([^)]+)\)/g;
        const keyRegex = /['"`]([^'"`]+)['"`]/;
        const text = document.getText();
        let match;

        while ((match = regex.exec(text))) {
          const start = document.positionAt(match.index);
          const end = document.positionAt(match.index + match[0].length);
          const range = new vscode.Range(start, end);

          if (range.contains(position)) {
            const innerMatch = match[1].match(keyRegex);
            if (!innerMatch) continue;

            const key = innerMatch[1];
            const translation = getTranslation(key);
            if (translation) {
              const markdownString = new vscode.MarkdownString("", true);

              if (typeof translation === "object" && translation !== null) {
                const lines = [];
                if (translation.ko) lines.push(`KO: ${translation.ko}`);
                if (translation.en) lines.push(`EN: ${translation.en}`);
                if (translation.vi) lines.push(`VI: ${translation.vi}`);
                if (lines.length > 0) {
                  markdownString.appendCodeblock(lines.join("\n"), "text");
                }
              } else if (typeof translation === "string") {
                markdownString.appendCodeblock(translation, "text");
              }

              return new vscode.Hover(markdownString, range);
            }
          }
        }
        return null;
      },
    }
  );
  context.subscriptions.push(hoverProvider);

  let definitionProvider = vscode.languages.registerDefinitionProvider(
    ["typescript", "typescriptreact", "javascript", "javascriptreact"],
    {
      provideDefinition(document, position, token) {
        const regex = /t\(([^)]+)\)/g;
        const keyRegex = /['"`]([^'"`]+)['"`]/;
        const text = document.getText();
        let match;

        while ((match = regex.exec(text))) {
          const start = document.positionAt(match.index);
          const end = document.positionAt(match.index + match[0].length);
          const range = new vscode.Range(start, end);

          if (range.contains(position)) {
            const innerMatch = match[1].match(keyRegex);
            if (!innerMatch) continue;

            const key = innerMatch[1];
            const keyRangeInJson = findPositionOfKey(key);

            if (keyRangeInJson && translationFilePath) {
              return new vscode.Location(
                vscode.Uri.file(translationFilePath),
                keyRangeInJson
              );
            }
          }
        }
        return null;
      },
    }
  );
  context.subscriptions.push(definitionProvider);
}

function deactivate() {
  inlineDecorationType.dispose();
}

module.exports = {
  activate,
  deactivate,
};
