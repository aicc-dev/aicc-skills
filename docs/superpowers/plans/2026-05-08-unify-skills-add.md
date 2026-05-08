# Unify Skills Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `npx skills add` the only documented and supported installation path, with a separate init skill for platform-specific executable setup.

**Architecture:** The repository becomes a GitHub-hosted skill source with `skills/aicc-skills/SKILL.md` and `skills/aicc-init/SKILL.md` as installable artifacts. `package.json` remains only for local tests and is no longer an npm CLI package.

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

### Task 2: Add AICC Init Skill

**Files:**
- Create: `skills/aicc-init/SKILL.md`
- Create: `skills/aicc-init/scripts/setup.js`
- Create: `skills/aicc-init/scripts/setup.sh`
- Create: `skills/aicc-init/scripts/setup.ps1`
- Modify: `README.md`
- Modify: `test/repo.test.js`

- [ ] **Step 1: Write failing tests**

Add tests asserting `aicc-init` has valid frontmatter, all three setup scripts exist, Node and shell setup support dry-run platform mapping, PowerShell includes Windows asset mapping, and README documents init usage.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL because `skills/aicc-init` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add `aicc-init` with setup scripts that resolve these assets:

```text
aicc-darwin-arm64
aicc-darwin-x64
aicc-linux-arm64
aicc-linux-x64
aicc-win32-x64.exe
```

Scripts download from:

```text
https://github.com/aicc-dev/aicc-skills/releases/latest/download/<asset>
```

Set `AICC_VERSION=v0.1.0` to pin:

```text
https://github.com/aicc-dev/aicc-skills/releases/download/v0.1.0/<asset>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Verify skills CLI discovery**

Run: `npx --yes skills add . --list`

Expected: output lists `aicc-init` and `aicc-skills`.
