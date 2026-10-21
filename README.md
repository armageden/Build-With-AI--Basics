# DiffStory — The Post-Prompt Receipt for AI Coding Agents

> A post-prompt receipt for AI coding agents that compares the prompt you typed against the `git diff` the agent handed back—deterministically flagging every diff hunk as either **Mentioned in your prompt** or **Not mentioned in your prompt**, explaining the impact of unrequested edits, and generating a 1-click restore prompt.

---

## ⚡ The Core Problem & Philosophy
When using modern AI coding agents (Claude Code, OpenCode, Cursor, Copilot, Codex), asking for a simple edit (*"Change the submit button color to blue"*) often results in silent collateral damage (e.g., an email validation routine 15 lines above gets deleted).

**DiffStory** solves this with a **verifiable deterministic + bounded LLM hybrid architecture**:
1. **100% Deterministic Token Matcher:** A pure JavaScript token intersection engine compares your prompt against mutated lines in each hunk. It splits `camelCase`, filters syntax/JSX boilerplate, and deterministically sorts unmentioned warning hunks to the top. **Zero hallucinations in classification.**
2. **Bounded Live AI Receipt:** Gemini (`gemini-3.5-flash-lite`) is queried **strictly** for unmentioned hunks to generate a 1-sentence impact statement and a 1-click copyable restore prompt.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file or export your Gemini API key:
```bash
cp .env.example .env
# Edit .env and supply your VITE_GEMINI_API_KEY
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

### 4. Run Test Suite
```bash
npm test
```
Runs both the deterministic engine test suite and the live model integration test.

---

## 🏗️ Architectural Flow (3-Location Code Tour)

1. **Trigger & UI State:** [`src/App.jsx`](file:///home/farhan/Build%20With%20AI:%20Basics/src/App.jsx)
   - Captures user prompt & unified diff.
   - Instantly renders sorted receipt cards using the deterministic engine.
   - Dispatches async Gemini requests for unmentioned hunks.
2. **Deterministic Token Engine:** [`src/lib/receiptEngine.js`](file:///home/farhan/Build%20With%20AI:%20Basics/src/lib/receiptEngine.js)
   - Splits unified diff on `@@ -X,Y +A,B @@`.
   - Isolates mutated lines (`+` and `-`).
   - Computes intersection between prompt tokens and hunk tokens.
   - Generates literal token receipts (e.g., *"Your prompt mentions 'submit', 'button', 'color', 'blue'. Nothing in your prompt mentions 'email', 'includes', 'set', 'error'."*).
3. **Bounded Live Model:** [`src/lib/liveModel.js`](file:///home/farhan/Build%20With%20AI:%20Basics/src/lib/liveModel.js)
   - Queries Gemini with strict JSON schema: `{ impactSummary, restorePrompt }`.
   - Never fakes or silently mocks output on failure.

---

## 📄 License
MIT License &mdash; see [LICENSE](file:///home/farhan/Build%20With%20AI:%20Basics/LICENSE) for details.
