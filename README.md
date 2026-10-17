# The Vantage, Gedling

Clean export of the latest Sites source, 22 September 2026.

## GitHub Desktop

1. Extract this ZIP.
2. Open your existing website repository folder using GitHub Desktop: Repository > Show in Explorer.
3. Replace the old website files with the contents of this extracted folder. Keep the existing .git folder. Remove old website assets first so unused files are not left behind.
4. Commit the changes and click Push origin.

The index.html file must be at the repository root, beside style.css, app.js, assets and uploads.

## Vercel

Use Framework Preset: Other, Root Directory: repository root, no build command and Output Directory: .

This is a static website with no installation or build required. Both current videos and all referenced images and PDF downloads are included at their original quality. 21 unused assets were excluded. No Git history, credentials or dependencies are included.

## Automated checks

The `Vantage static site checks` GitHub workflow runs on pull requests and pushes to `main`, on Linux and Windows. There is no compilation step: deployment readiness is checked through JavaScript syntax and four offline site tests.

Run `node --check app.js` and `python -m unittest discover -s tests -v`. Tests verify local media/download/CSS paths (including exact filename casing), section links and unique ids, JavaScript element hooks and media-viewer controls. No third-party packages, production credentials or network calls are needed.

These checks do not exercise browser interactions, video playback, responsive layouts or external links. They do not deploy the site or change its content.
