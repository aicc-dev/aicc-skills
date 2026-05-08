# Unify Skills Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `npx skills add` the only documented and supported installation path.

**Architecture:** The repository becomes a GitHub-hosted skill source with `skills/aicc-skills/SKILL.md` as the installable artifact. `package.json` remains only for local tests and is no longer an npm CLI package.

**Tech Stack:** Node.js test runner, Vercel `skills` CLI conventions, Markdown documentation.

---

### Task 1: Remove Custom npm Installer

**Files:**
- Modify: `package.json`
- Delete: `bin/aicc-skills.js`
- Modify: `test/cli.test.js`
- Create: `README.md`

- [ ] **Step 1: Write failing tests**

Replace CLI install tests with structure tests that assert there is no `package.json` `bin`, no `bin/aicc-skills.js`, valid `skills/aicc-skills/SKILL.md` metadata, and README examples use `npx skills add`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL because the old `bin` entry and `bin/aicc-skills.js` still exist, and README is missing.

- [ ] **Step 3: Write minimal implementation**

Remove the `bin` entry from `package.json`, delete `bin/aicc-skills.js`, and add README examples for:

```bash
npx skills add <github-owner>/<repo> -a codex -g -y
npx skills add <github-owner>/<repo> -a claude-code -g -y
npx skills add <github-owner>/<repo> -a codebuddy -g -y
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Verify skills CLI discovery**

Run: `npx --yes skills add . --list`

Expected: output lists `aicc-skills`.
