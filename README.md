# AICC Skills

AICC agent skills package for agents that support the `skills` CLI ecosystem.

## Install

Replace `<github-owner>/<repo>` with the GitHub repository that hosts this package.

```bash
npx skills add <github-owner>/<repo> -a codex -g -y
npx skills add <github-owner>/<repo> -a claude-code -g -y
npx skills add <github-owner>/<repo> -a codebuddy -g -y
```

For WorkBuddy, use the `skills` CLI agent id `codebuddy`.

For local development, run from the repository root:

```bash
npx skills add . --list
npx skills add . -a codex -g -y
```

## Contents

```text
skills/aicc-skills/SKILL.md
skills/aicc-skills/agents/openai.yaml
```
