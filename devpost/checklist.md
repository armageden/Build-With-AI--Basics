---
status: completed
build_mode: learn
project_name: DiffStory
---

# Build Checklist — DiffStory

## Planned Vertical Slices
- [x] **Slice 1 — Project Scaffold, Root MIT License & Deterministic Receipt Engine (`src/lib/receiptEngine.js` + `src/lib/presets.js`):** Initialize Vite + React + Tailwind project, add root `LICENSE` file (MIT), implement `extractTokens()` and `analyzePromptAgainstDiff()`, and verify Preset 1 classifies the email-validation deletion as `NOT_MENTIONED_IN_PROMPT` and the blue button change as `MENTIONED_IN_PROMPT`.
  - *Hands-on checkpoint:* Inspect `analyzePromptAgainstDiff()` output in the browser console/UI to confirm deterministic token receipts before adding styling or LLM calls.
- [x] **Slice 2 — Tactile Receipt Workbench UI (`src/App.jsx`):** Build the warm-paper (`#FAF8F5`) single-screen workbench with Prompt input, Unified Diff input, Preset 1 & 2 buttons, Receipt Summary banner, and sorted Amber (`NOT MENTIONED IN YOUR PROMPT`) and Green (`MENTIONED IN YOUR PROMPT`) hunk cards.
  - *Hands-on checkpoint:* Test empty/invalid input validation and verify the Amber hunk card sits above the Green hunk card at 1080p with zero horizontal overflow.
- [x] **Slice 3 — Live Model Call & Copyable Restore Prompt (`src/lib/liveModel.js`):** Wire the live LLM API call exclusively for `NOT_MENTIONED_IN_PROMPT` hunks to generate the 1-sentence `impactSummary` and `restorePrompt`, plus the one-click `"Copy Restore Prompt"` button and transparent error handling if the API key is missing.
  - *Hands-on checkpoint:* Trigger a live model call on Preset 1, verify the spinner and live response, click "Copy Restore Prompt," and test fallback behavior when offline.
- [x] **Slice 4 — Final Review & Revisions:** End-to-end polish of typography, diff line highlighting, and responsive layout for the 70-second 1080p video recording.

## Code Tour and App Map
- [x] **Learning Wrap-Up & App Map (`devpost/app-map.html`):** Trace a single user click on `"Generate Post-Prompt Receipt"` across 3 code locations (`src/App.jsx` → `src/lib/receiptEngine.js` → `src/lib/liveModel.js`) and generate `devpost/app-map.html` documenting the deterministic-first, bounded-LLM pattern.
