# cascade-prompt
Cascading prompts on spreadsheet to automate advanced LLM and Image generation.

-------

### How to Run with PHP

#### For Development with php (Hot Reloading)
1.  Open your terminal in the project folder.
2.  Run the Vite server:
    ```bash
    npm run dev
    ```
3.  Open your browser to your **Apache URL**: `http://localhost/cascade-prompt/`.
    *   The PHP loader will detect the dev server.
    *   It will load scripts from `http://localhost:5173/cascade-prompt/src/main.js`.
    *   Changes to JS/CSS files will update instantly.

#### For Production (Deployment)
1.  Stop the `npm run dev` process.
2.  Build the assets:
    ```bash
    npm run build
    ```
    *(This creates a `dist` folder with compiled CSS and JS).*
3.  Refresh `http://localhost/cascade-prompt/`.
    *   The PHP loader will see the `dist/manifest.json` and load the compiled files.

### For running without PHP
```bash
npm run dev:node
```
Open your browser: `http://localhost:[port]/cascade-prompt/index.html`
