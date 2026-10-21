---
status: approved
project_name: DiffStory
---

# Technical Specification — DiffStory

## 1. Architecture & Stack
- **Frontend & Build Tool:** React 18 + Vite + Tailwind CSS (single-page application, zero external database required).
- **Deterministic Engine (`src/lib/receiptEngine.js`):** Pure client-side JavaScript module that parses unified diffs into hunks and performs deterministic token intersection between the user's prompt and each hunk's changed lines.
- **Live Model Integration (`src/lib/liveModel.js`):** Direct `fetch` call to the Gemini API (`gemini-2.5-flash` via `VITE_GEMINI_API_KEY` or OpenAI-compatible endpoint) using structured JSON output (`{ impactSummary: string, restorePrompt: string }`).
- **Repository Compliance:** Root `LICENSE` (MIT) file included for GitHub About-section detection, plus `devpost/` planning artifacts and `devpost/app-map.html`.

## 2. Deterministic Token Matching Specification (`src/lib/receiptEngine.js`)
The classification step **must never be delegated to the LLM**. It executes deterministically in 4 steps:
1. **Prompt Tokenization:**
   - Split camelCase/PascalCase (`setError` → `set error seterror`).
   - Lowercase and extract alphanumeric words (`/[a-z0-9@#_-]+/g`).
   - Remove English & prompt-instruction stopwords (`a`, `an`, `the`, `to`, `in`, `on`, `of`, `for`, `with`, `and`, `or`, `change`, `make`, `update`, `set`, `add`, `remove`, `fix`, `please`, `can`, `you`, `it`, `is`, `be`, `into`, `from`, `this`, `that`, `my`).
2. **Unified Diff Hunk Splitting:**
   - Split raw diff on `/(?=^@@\s-\d+)/m`.
   - For each hunk, isolate only mutated lines: lines starting with `+` (excluding `+++`) and lines starting with `-` (excluding `---`). Ignore unchanged context lines so surrounding boilerplate doesn't trigger false matches.
3. **Hunk Tokenization:**
   - Extract tokens from the mutated lines only, stripping language syntax keywords (`const`, `let`, `var`, `function`, `return`, `if`, `else`, `true`, `false`, `null`, `undefined`, `className`, `div`, `span`, `import`, `export`, `default`, `type`, `px`, `py`, `bg`, `text`, `rounded`).
   - Note: Keep color/domain words like `blue`, `gray`, `submit`, `button`, `email`, `error`, `valid`, `includes`.
4. **Intersection & Literal Receipt Generation:**
   - `matchedTokens = promptTokens.filter(pt => hunkTokens.some(ht => ht.includes(pt) || pt.includes(ht)))`
   - If `matchedTokens.length === 0`:
     - `status = "NOT_MENTIONED_IN_PROMPT"`
     - `literalReceipt = "Your prompt mentions " + formatList(promptTokens) + ". Nothing in your prompt mentions " + formatList(hunkTokens.slice(0, 4)) + "."`
   - Else:
     - `status = "MENTIONED_IN_PROMPT"`
     - `literalReceipt = "Matches your prompt words: " + formatList(matchedTokens) + "."`
5. **Deterministic Sorting:**
   - Sort `NOT_MENTIONED_IN_PROMPT` hunks to the top of the list so the amber warning card is always the first thing visible without scrolling.

## 3. Built-In Demo Presets (`src/lib/presets.js`)
### Preset 1 (Primary Demo — `SignupForm.jsx`)
- **Prompt:** `Change the submit button color to blue`
- **Unified Diff:**
  ```diff
  --- a/src/SignupForm.jsx
  +++ b/src/SignupForm.jsx
  @@ -10,7 +10,5 @@ export function SignupForm({ onSubmit }) {
     function handleSubmit(e) {
       e.preventDefault();
  -    if (!email.includes('@')) {
  -      return setError('Please enter a valid email address');
  -    }
       onSubmit({ email });
     }
  @@ -26,5 +24,5 @@ export function SignupForm({ onSubmit }) {
       <button
         type="submit"
  -      className="px-4 py-2 bg-gray-800 text-white rounded"
  +      className="px-4 py-2 bg-blue-600 text-white rounded"
       >
         Submit
  ```

## 4. Bounded Live LLM Prompt Contract (`src/lib/liveModel.js`)
For each `NOT_MENTIONED_IN_PROMPT` hunk, send this exact structured request to the model:
- **System Instruction:**
  `You are generating a concise post-prompt receipt for an unrequested code change. Return strict JSON with keys "impactSummary" (max 22 words, plain English stating what the deleted/changed code did) and "restorePrompt" (1-2 sentences the developer can paste into their coding agent to restore the unmentioned change while keeping their original prompt request). Never guess hidden motives; describe only the literal code lines provided.`
- **User Payload:**
  `Original User Prompt: "${promptText}"\nUnmentioned Diff Hunk (${hunk.header}):\n${hunk.rawBlock}`

## 5. Verification Plan
- **Unit Check:** Running `analyzePromptAgainstDiff` on Preset 1 must deterministically return 2 hunks, with Hunk #1 (`@@ -10,7 +10,5 @@`) marked `NOT_MENTIONED_IN_PROMPT` and sorted first, and Hunk #2 (`@@ -26,5 +24,5 @@`) marked `MENTIONED_IN_PROMPT`.
- **End-to-End UI Check:** Clicking "Generate Post-Prompt Receipt" renders the amber card immediately, shows a live loading state for the AI Impact/Restore fields, populates them from the live model call, and copies the restore prompt to the clipboard in one click.
