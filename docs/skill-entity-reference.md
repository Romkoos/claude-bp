# Skill Entity — Documentation Summary

> Based on: https://code.claude.com/docs/en/skills

## Overview

Skills are on-demand capabilities invoked by Claude or users via slash commands. Each skill has a `SKILL.md` file with YAML frontmatter and markdown instructions. Skills can run inline in the current conversation or in a forked subagent context.

Key properties:
- **Skills follow the Agent Skills open standard** (agentskills.io)
- Each skill is a directory with `SKILL.md` as the entrypoint
- Files stored at `.claude/skills/{skill-name}/SKILL.md`
- Supporting files (templates, examples, scripts) can be co-located in the skill directory

## Frontmatter Fields

### Required

No fields are strictly required, but `description` is strongly recommended.

### Optional

| Field                        | Type             | Default           | Description                                                        |
|------------------------------|------------------|-------------------|--------------------------------------------------------------------|
| `name`                       | string           | directory name    | Display name, lowercase letters/numbers/hyphens (max 64 chars)     |
| `description`                | string           | first paragraph   | When Claude should use this skill (recommended)                    |
| `argument-hint`              | string           | —                 | Hint for autocomplete (e.g. `[issue-number]`)                      |
| `disable-model-invocation`   | boolean          | `false`           | `true` prevents Claude from auto-loading the skill                 |
| `user-invocable`             | boolean          | `true`            | `false` hides the skill from the `/` menu                          |
| `allowed-tools`              | string (CSV)     | inherits all      | Tools Claude can use without permission                            |
| `model`                      | string           | `inherit`         | Model override (`sonnet`, `opus`, `haiku`, or full model ID)       |
| `context`                    | `fork`           | —                 | Set to `fork` to run in isolated subagent context                  |
| `agent`                      | string           | `general-purpose` | Subagent type when `context: fork` (Explore, Plan, general-purpose, or custom) |
| `hooks`                      | object           | —                 | Lifecycle hooks scoped to this skill                               |

## Invocation Control

| Frontmatter                          | User can invoke | Claude can invoke | When loaded                                    |
|--------------------------------------|-----------------|-------------------|------------------------------------------------|
| (default)                            | Yes             | Yes               | Description in context, full content on invoke  |
| `disable-model-invocation: true`     | Yes             | No                | Not in context                                  |
| `user-invocable: false`              | No              | Yes               | Description in context                          |

## Context Modes

- **Inline** (default, no `context` field): Runs in the current conversation context. The skill instructions are injected directly into the ongoing conversation.
- **Fork** (`context: fork`): Runs in an isolated subagent context. The skill content becomes the task prompt. The `agent` field controls which subagent type is used.

## String Substitutions (runtime)

| Placeholder              | Replaced with                     |
|--------------------------|-----------------------------------|
| `$ARGUMENTS`             | All arguments passed to the skill |
| `$ARGUMENTS[N]` / `$N`  | Specific argument by index        |
| `${CLAUDE_SESSION_ID}`   | Current session ID                |
| `${CLAUDE_SKILL_DIR}`    | Skill directory path              |

## Dynamic Injections

The `` !`command` `` syntax runs shell commands before the skill content is sent to the model. The command output replaces the placeholder inline. This is preprocessing — the command is not executed by Claude.

Example:
```markdown
Current git status:
!`git status --short`
```

## Supporting Files

- `SKILL.md` is the entrypoint (required)
- Other files in the directory can include templates, examples, and scripts
- Reference supporting files from `SKILL.md` so Claude knows when to load them
- Keep `SKILL.md` under 500 lines

## Export Format Example

```markdown
---
name: my-skill
description: What this skill does
argument-hint: "[issue-number]"
disable-model-invocation: true
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
model: sonnet
---

Skill instructions here...
```

### Export Rules (our implementation)

- `name` included when non-empty
- Optional fields omitted when empty/default
- `allowed-tools` exported as comma-separated string (kebab-case key)
- `context` only exported when `'fork'`
- `agent` only exported when context is fork
- `user-invocable` only exported when `false`
- `disable-model-invocation` only exported when `true`
- Integration section appended from edge connections

## Interaction with Other Entities

| From   | To       | Connection Type | Effect                                  |
|--------|----------|-----------------|-----------------------------------------|
| Rules  | Skill    | context         | Rules co-located in skill directory      |
| Hook   | Skill    | trigger         | Hook triggers skill activation           |
| Skill  | Subagent | delegation      | Skill delegates work to subagent         |
| Skill  | Tool     | tool-access     | Tool granted to skill                    |
| Skill  | Skill    | exec            | Sequential pipeline                      |

## Built-in / Bundled Skills

| Skill        | Purpose                                        |
|--------------|------------------------------------------------|
| `/batch`     | Orchestrate large-scale changes in parallel    |
| `/claude-api`| Claude API reference material                  |
| `/debug`     | Troubleshoot session via debug log             |
| `/loop`      | Run prompt on recurring interval               |
| `/simplify`  | Review changed code for quality                |

## Skill Locations & Priority

| Location   | Path                                    | Applies to         |
|------------|-----------------------------------------|--------------------|
| Enterprise | managed settings                        | All org users      |
| Personal   | `~/.claude/skills/{name}/SKILL.md`      | All your projects  |
| Project    | `.claude/skills/{name}/SKILL.md`        | This project only  |
| Plugin     | `{plugin}/skills/{name}/SKILL.md`       | Where plugin enabled |

Priority: enterprise > personal > project. Plugin skills use namespace prefixing.

When multiple skills share the same name, the higher-priority location wins.
