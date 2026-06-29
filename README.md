# Local LLM Writing Assistant

A WordPress Gutenberg plugin that adds an AI writing assistant to the block editor sidebar. Runs entirely on your own machine — no internet connection or third-party API required.

---

## How it works

- A local AI model runs via a Python Flask server (`app.py`) using `llama-cpp-python`
- The WordPress plugin (`local-llm`) adds a sidebar panel to the Gutenberg editor
- The user clicks **"Use my post"** to send their draft to the assistant, then uses the quick buttons or types a question
- Responses can be added directly to the post with **"Add to post"**

---

## Requirements

- Docker and Docker Compose
- Node.js (for building the plugin)
- Python 3.9+ with `llama-cpp-python` and Flask
- A `.gguf` model file (this project uses `Qwen2.5-0.5B-Instruct-Q4_K_M.gguf`)

---

## Setup

### 1. Start WordPress

```bash
docker-compose up -d
```

WordPress will be available at `http://localhost:8080`. Complete the one-time setup if this is your first run.

### 2. Start the Flask server

```bash
pip install flask flask-cors llama-cpp-python
python app.py
```

The server runs on port `3000`. Make sure your model file is at `./models/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf`.

### 3. Build the plugin

```bash
cd local-llm
npm install
npm run build
```

### 4. Activate the plugin

Log in to WordPress at `http://localhost:8080/wp-admin`, go to **Plugins**, and activate **Local LLM Writing Assistant**.

---

## Using the assistant

1. Open or create a post in the block editor
2. Click the **Writing Assistant** icon in the top-right toolbar to open the sidebar
3. Click **"Use my post"** to load your draft into the assistant
4. Choose a quick action or type your own question:
   - **✏️ Fix my writing** — corrects spelling and grammar while keeping your voice
   - **💬 Simplify it** — rewrites in plain, friendly language
   - **📋 Summarise** — creates a short 2–3 sentence summary
5. Click **"Add to post"** under any response to insert it as a new paragraph

---

## Customising the quick action buttons

Open `local-llm/src/index.js` and edit the `PROMPTS` array near the top of the file:

```js
const PROMPTS = [
  { label: '✏️ Fix my writing',  text: 'Fix any spelling or grammar mistakes...' },
  { label: '💬 Simplify it',     text: 'Rewrite this post in warm, simple language...' },
  { label: '📋 Summarise',       text: 'Write a friendly 2–3 sentence summary...' },
];
```

After saving, run `npm run build` in the `local-llm` folder to apply the changes.

---

## Changing the server address

If the Flask server is running on a different machine or port, update this line in `local-llm/src/index.js`:

```js
const LLM_URL = 'http://192.168.1.177:3000';
```

Then rebuild with `npm run build`.

---

## Project structure

```
├── docker-compose.yml        # WordPress + MariaDB
├── app.py                    # Flask server serving the local LLM
├── models/                   # Place your .gguf model file here
├── wp-data/                  # Persisted WordPress installation
└── local-llm/
    ├── local-llm.php         # Plugin entry point
    ├── package.json
    └── src/
        └── index.js          # Sidebar UI (edit prompts and LLM_URL here)
```

---

## Troubleshooting

**"The writing assistant is not available right now"**
The Flask server is not running or is unreachable. Check that `python app.py` is running and that `LLM_URL` in `index.js` matches the server's address.

**Sidebar not appearing**
Make sure the plugin is activated in WordPress and that you have run `npm run build` after any code changes.

**"Use my post" shows 0 words synced**
Gutenberg may not be returning content yet. Open the browser console and check the value of `postContent`. If it is empty, try switching the selector in `index.js` from `getEditedPostAttribute('content')` to `getCurrentPost().content`.
