---
experience_coding: experienced
experience_plan_first: familiar
pacing_preference: concise_batched
build_mode: learn
---

# Learner Profile

## Background & Workflow
- Experienced software builder comfortable with JavaScript/TypeScript, React, Vite, Git workflows, and terminal-based AI coding agents (OpenCode / Claude Code).
- Familiar with spec-driven planning; prefers concise explanations and batched questions without unnecessary hand-holding.

## Project Idea Introduction
- **Project Name:** DiffStory
- **One-Line Pitch:** A post-prompt receipt for AI coding agents that compares the prompt you typed against the `git diff` the agent handed back—deterministically flagging every diff hunk as either **Mentioned in your prompt** or **Not mentioned in your prompt**, explaining the impact of unrequested edits, and generating a one-click restore prompt.

## Learning Takeaway Goal
- **Target Practice:** Designing a deterministic + LLM hybrid architecture where verifiable truth (whether a code change matches any words in the user's prompt) is handled by a 100% deterministic token matcher, while the live LLM call is strictly bounded to explaining the impact of unmentioned hunks and writing the copyable restore prompt.
