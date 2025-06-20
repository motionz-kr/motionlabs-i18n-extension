# Motionlabs i18n

A powerful VS Code extension designed to streamline your i18n workflow. It provides instant visibility into your translation keys with **inline previews**, **detailed hover information**, and **quick navigation to definitions**.

This extension is highly configurable and can be adapted to any project structure.

## Features

### 1. Inline Translation Preview

See the translation for a key displayed directly in your code as a subtle inline comment. This helps you understand the context without breaking your development flow.

**Before:**

```typescript
const title = t('page.home.title');
```

**After:**

```typescript
const title = t('page.home.title'); // 홈 화면
```

### 2. Multi-language Hover Information

Hover over a translation key to see all available translations (e.g., Korean, English, Vietnamese) in a convenient tooltip.

![Hover Preview](https://i.imgur.com/example.png)

> **Hovering over `t('navbar.reception.title')` would show:**
>
> ```text
> KO: 내원관리
> EN: Reception Management
> VI: Quản lý lễ tân
> ```

### 3. Go to Definition

`Ctrl+Click` (or `Cmd+Click` on macOS) on any translation key to jump directly to its definition in your JSON translation file. This makes editing translations faster than ever.

### 4. Fully Configurable

Easily point the extension to your project's translation file, no matter its location, by setting the path in your VS Code settings.

## Quick Setup

1.  **Install the extension.**
2.  **Configure the extension settings.** Open your VS Code settings (`Ctrl/Cmd + ,`) and search for **"Motionlabs i18n"**. You will find two settings to configure:

    - **Translation File Path**: Set the [glob pattern](https://code.visualstudio.com/api/references/vscode-api#GlobPattern) for your translation file's location.
    - **Translation File Structure**: Choose the structure of your JSON file.
      - `keysFirst`: Use this if your file looks like `{ "key": { "en": "..." } }`.
      - `languageFirst`: Use this if your file looks like `{ "en": { "key": "..." } }`.

    **Example `.vscode/settings.json**:\*\*

    ```json
    {
      "motionlabs-i18n.translationFilePath": "src/locales/translations.json",
      "motionlabs-i18n.translationFileStructure": "languageFirst"
    }
    ```

3.  **Done!** Open any file that uses your translation function (e.g., `t('key')`) and enjoy the new features.

## For Extension Developers: How to Run and Test

1.  **Open this project folder** in VS Code.
2.  **Install dependencies**: `npm install`
3.  **Start the extension**: Press `F5`. This will open a new VS Code window titled "[Extension Development Host]".
4.  **Test the features**:
    - In the new window, open any project that contains a translation file.
    - Configure the `motionlabs-i18n.translationFilePath` in the settings of the new window to match the project's structure.
    - Open a code file and verify that all features (inline decoration, hover, go-to-definition) work correctly.
