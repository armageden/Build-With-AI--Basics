---
status: approved
project_name: DiffStory
---

# Scope — DiffStory (The Post-Prompt Receipt)

## 1. The Problem & Real Audience
- **Who It's For:** Developers, students, and hackathon builders using AI coding agents (Claude Code, OpenCode, Cursor, Copilot, Codex).
- **The Pain Point:** You ask a coding agent for one small change (e.g., *"Change the submit button color to blue"*), and the agent hands back a diff that makes your button blue—while quietly deleting an email validation check 15 lines above. Builders either blindly commit broken code or waste time hunting through diffs line-by-line.

## 2. The Core Kernel (What It Does End-to-End)
1. **Input:** The user enters (a) the exact prompt they gave their coding agent and (b) the unified `git diff` the agent produced (or clicks the built-in real-world preset).
2. **Deterministic Classification:** A pure JavaScript parser splits the diff into hunks (`@@ ... @@`), extracts meaningful tokens from both the prompt and each hunk (splitting `camelCase` and stripping stopwords/syntax boilerplate), and labels each hunk:
   - **`MENTIONED IN YOUR PROMPT`** — at least one meaningful prompt token appears in the changed lines.
   - **`NOT MENTIONED IN YOUR PROMPT`** — zero prompt tokens appear in the changed lines, accompanied by a literal word-level receipt: *"Your prompt mentions 'submit', 'button', 'color', 'blue'. Nothing in your prompt mentions 'email', 'includes', 'set', 'error'."*
3. **Bounded Live AI Receipt:** For any hunk labeled `NOT MENTIONED IN YOUR PROMPT`, a live LLM call generates:
   - A **1-sentence plain-English impact statement** describing what the deleted/modified lines actually do.
   - A **1-click copyable Restore Prompt** the user can paste right back into their coding agent to revert the collateral edit while keeping the requested change.

## 3. What Was Deliberately Cut (Scope Discipline)
- **Cut #1 — Multi-file 3-step causal architecture walkthrough:** Originally considered reordering 400-line multi-file PRs into a 3-stage causal graph. Cut because LLM causal ordering across large diffs is prone to hallucination and buries the core value proposition.
- **Cut #2 — Semantic "Silent Assumption" guessing:** Cut because semantic claims about hidden assumptions cannot be verified on camera in 5 seconds. Replaced with literal, verifiable token matching ("Not mentioned in your prompt").
- **Cut #3 — GitHub OAuth, repo cloning, and database history:** Cut completely to keep the app a zero-friction, single-screen proof of concept.

## 4. Definition of "Done"
- A working single-screen web application where pasting a prompt + unified diff renders sorted hunk receipt cards (amber `NOT MENTIONED IN YOUR PROMPT` cards at the top, green `MENTIONED IN YOUR PROMPT` cards below), makes a live model call to populate the 1-sentence impact and restore prompt for unmentioned hunks, and lets the user copy the restore prompt in one click.
