---
status: approved
project_name: DiffStory
---

# Product Requirements Document (PRD) — DiffStory

## 1. User Journey & Single-Screen Layout
DiffStory is a single-screen workbench divided into two clear zones:

### Zone A: Top/Left Input Workbench
- **Prompt Field:** Clean text input labeled **"1. What you asked your coding agent"** (e.g., `Change the submit button color to blue`).
- **Unified Diff Field:** Monospace textarea labeled **"2. What your coding agent changed (`git diff`)"**.
- **Preset Selector Bar:** Two instant-load preset pills for fast testing and live demo verification:
  - **Preset 1 (Primary Demo):** *Blue Submit Button vs. Deleted Email Validation (`SignupForm.jsx`)*
  - **Preset 2:** *Add Clear Completed Button vs. Deleted Error Boundary Check (`TaskList.jsx`)*
- **Primary Action Button:** **"Generate Post-Prompt Receipt"** (triggers instant deterministic hunk classification + live LLM impact/restore call with a visible loading indicator on the AI fields).

### Zone B: Right/Main Receipt Feed
- **Receipt Summary Header:** High-contrast status bar showing exact counts:
  - Example: `2 Hunks Analyzed · 1 NOT mentioned in your prompt · 1 Mentioned in your prompt`
- **Sorted Hunk Cards (Amber Unmentioned Hunks First):**
  1. **Amber Card (`NOT MENTIONED IN YOUR PROMPT`):**
     - **Badge:** Bold amber pill `NOT MENTIONED IN YOUR PROMPT` + line delta badge (`Removed 3 lines · Added 0 lines`).
     - **Literal Token Receipt (Deterministic):** `"Your prompt mentions 'submit', 'button', 'color', 'blue'. Nothing in your prompt mentions 'email', 'includes', 'set', 'error'."`
     - **Diff Code View:** Monospace hunk view highlighting deleted lines in crisp red (`-`) and added lines in green (`+`).
     - **Live AI Impact Line:** 1-sentence explanation of what the unmentioned edit broke or changed (e.g., *"Removed the '@' check on email, allowing invalid email addresses to submit without triggering setError."*).
     - **Copyable Restore Prompt Box:** Pre-formatted prompt instruction with a **"Copy Restore Prompt"** button (changes to `"Copied Receipt Prompt ✓"` on click).
  2. **Green Card (`MENTIONED IN YOUR PROMPT`):**
     - **Badge:** Crisp forest-green pill `MENTIONED IN YOUR PROMPT` + line delta badge (`Removed 1 line · Added 1 line`).
     - **Literal Token Receipt (Deterministic):** `"Matches your prompt words: 'submit', 'button', 'blue'."`
     - **Collapsible/Compact Diff Code View:** Shows the requested line change (`bg-gray-800` → `bg-blue-600`).

## 2. Visual Style & Aesthetic Direction (Non-Generic UI)
- **Theme:** **Tactile Engineering Audit & Thermal Receipt Studio** (explicitly avoiding generic dark-purple AI gradients).
- **Palette:**
  - Background Canvas: Warm archival paper `#FAF8F5`
  - Card Surface: Crisp white `#FFFFFF` with `1px solid #E5E0D8` structural borders
  - Primary Ink: Deep carbon `#111315`
  - Unmentioned / Collateral Alert (Amber): Border `#D97706`, Header Fill `#FFFBEB`, Badge `#B45309`
  - Mentioned / Verified (Green): Border `#15803D`, Header Fill `#F0FDF4`, Badge `#166534`
  - Diff Deletions: Background `#FEF2F2`, Text `#991B1B`
  - Diff Additions: Background `#F0FDF4`, Text `#166534`
- **Typography:** Clean geometric sans-serif (`Inter` / system-ui) for receipt headers and explanations; crisp monospace (`JetBrains Mono` / `Fira Code` / monospace) for diffs, hunk headers, and token pills.

## 3. Edge Cases & Behavior Rules
1. **Empty Prompt or Missing `@@` Diff Headers:** Display a clear inline validation banner explaining that a prompt and a valid unified diff containing `@@ -line,count +line,count @@` headers are required, with a 1-click button to load Preset 1.
2. **All Hunks Mentioned in Prompt:** Render a clean all-green receipt summary (`0 hunks outside your prompt`) without firing an unnecessary LLM restore-prompt call.
3. **Live Model API Error or Missing API Key:** Never fake or silently mock the LLM output. The deterministic token receipt and amber/green hunk cards still render 100% accurately, while the AI Impact box displays a transparent status banner: `"Live model unavailable — deterministic token receipt above is complete."`

## 4. Firm Now vs. Later Boundary
| Build Now (In Scope) | Park for Later (Out of Scope) |
| :--- | :--- |
| Prompt + Unified Diff input & 2 real-world presets | Direct GitHub PR URL fetching / OAuth integration |
| Deterministic tokenizer & hunk-level `MENTIONED` vs `NOT MENTIONED` classifier | AST-level cross-file call graph analysis |
| Amber/Green sorted Receipt Cards with literal word-match proof | Multi-step architecture walkthrough timelines |
| Live LLM call for 1-sentence impact + 1-click Copy Restore Prompt | Automated `git apply --reverse` local CLI execution |
