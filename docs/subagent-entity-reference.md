# Subagent Entity — Documentation Summary

> Based on: https://code.claude.com/docs/en/sub-agents

## Overview

Subagents are specialized AI assistants that handle specific types of tasks. Each subagent runs in **its own context window** with a custom system prompt, specific tool access, and independent permissions. When Claude encounters a task that matches a subagent's description, it delegates to that subagent, which works independently and returns results.

Key properties:
- **Subagents cannot spawn other subagents** — no nesting
- Subagents receive **only their system prompt** (+ basic env details), not the full Claude Code system prompt
- Files stored as Markdown with YAML frontmatter at `.claude/agents/{name}.md`

## Frontmatter Fields

### Required

| Field         | Type   | Description                                            |
|---------------|--------|--------------------------------------------------------|
| `name`        | string | Unique identifier, lowercase letters and hyphens       |
| `description` | string | When Claude should delegate to this subagent            |

### Optional (Advanced)

| Field              | Type                    | Default     | Description                                                             |
|--------------------|-------------------------|-------------|-------------------------------------------------------------------------|
| `model`            | string                  | `inherit`   | `sonnet`, `opus`, `haiku`, full model ID (e.g. `claude-opus-4-6`), or `inherit` |
| `tools`            | string[] or CSV string  | inherits all| Allowlist of tools the subagent can use                                 |
| `disallowedTools`  | string[] or CSV string  | `[]`        | Tools to deny — removed from inherited or specified list                |
| `permissionMode`   | enum                    | —           | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`        |
| `maxTurns`         | number                  | —           | Maximum agentic turns before subagent stops                             |
| `background`       | boolean                 | `false`     | Always run as background task                                           |
| `isolation`        | `"worktree"`            | —           | Run in temporary git worktree for isolated repo copy                    |
| `skills`           | string[]                | `[]`        | Skills preloaded into context at startup (full content injected)        |
| `mcpServers`       | array                   | `[]`        | MCP servers — string refs or inline definitions                         |
| `hooks`            | object                  | —           | Lifecycle hooks scoped to this subagent                                 |
| `memory`           | `user`/`project`/`local`| —           | Persistent memory scope (not implemented in our system yet)             |

## Permission Modes

| Mode                | Behavior                                                           |
|---------------------|--------------------------------------------------------------------|
| `default`           | Standard permission checking with prompts                          |
| `acceptEdits`       | Auto-accept file edits                                             |
| `dontAsk`           | Auto-deny permission prompts (explicitly allowed tools still work) |
| `bypassPermissions` | **DANGEROUS** — Skip ALL permission checks                         |
| `plan`              | Plan mode (read-only exploration)                                  |

> If the parent uses `bypassPermissions`, this takes precedence and cannot be overridden.

## Model Options

- **Aliases**: `sonnet`, `opus`, `haiku`
- **Full model IDs**: e.g. `claude-opus-4-6`, `claude-sonnet-4-6`
- **`inherit`**: Use the same model as the main conversation (default)

## Tools

- `tools` field = allowlist. If omitted, inherits all tools from main conversation
- `disallowedTools` field = denylist, removed from inherited/specified list
- Special syntax: `Agent(worker, researcher)` restricts which subagents can be spawned (only for main agents, not subagents)

## MCP Servers

`mcpServers` can contain:
1. **String references** — names of already-configured servers: `"github"`
2. **Inline definitions** — full server config scoped to this subagent:
```yaml
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github
```

Inline servers are connected when subagent starts and disconnected when it finishes.

## Skills Injection

Skills listed in the `skills` field are **fully injected** into the subagent's context at startup — not just made available for invocation. Subagents **do not inherit** skills from the parent conversation.

## Hooks

Subagent hooks are defined in the frontmatter using event-keyed structure:
```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/lint.sh"
```

Supported events in subagent frontmatter: `PreToolUse`, `PostToolUse`, `Stop` (auto-converted to `SubagentStop`).

## Background vs Foreground

- **Foreground**: Blocks main conversation. Permission prompts passed through to user.
- **Background**: Runs concurrently. Permissions pre-approved before launch. Questions auto-denied.

## Export Format Example

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
permissionMode: acceptEdits
maxTurns: 20
skills:
  - api-conventions
---

You are a code reviewer. Analyze code and provide specific, actionable feedback.
```

### Export Rules (our implementation)
- `name` always included in frontmatter
- Optional fields omitted when empty/default (model=inherit, tools=[], etc.)
- `tools` exported as YAML array (not comma-separated string)
- `mcpServers` derived from connected MCP nodes on the graph
- Integration section appended from edge connections

## Interaction with Other Entities

| From        | To        | Connection Type | Effect                                      |
|-------------|-----------|-----------------|---------------------------------------------|
| Rules       | Subagent  | context         | Rules co-located in `.claude/agents/`        |
| MCP         | Subagent  | context         | MCP added to `mcpServers` frontmatter        |
| Skill       | Subagent  | delegation      | Skill delegates work to subagent             |
| Subagent    | Subagent  | delegation      | Subagent spawns child (main agent only)      |
| Subagent    | Tool      | tool-access     | Tool granted to subagent                     |
| Subagent    | Skill     | exec            | Sequential pipeline: subagent → skill        |

## Built-in Subagents (not configurable via files)

| Agent              | Model    | Purpose                                |
|--------------------|----------|----------------------------------------|
| Explore            | Haiku    | Read-only codebase search              |
| Plan               | Inherit  | Research for plan mode                 |
| general-purpose    | Inherit  | Complex multi-step tasks               |
| Bash               | Inherit  | Terminal commands in separate context   |
| statusline-setup   | Sonnet   | `/statusline` configuration            |
| Claude Code Guide  | Haiku    | Questions about Claude Code features   |

## Scoping & Priority

| Location                     | Priority    |
|------------------------------|-------------|
| `--agents` CLI flag          | 1 (highest) |
| `.claude/agents/`            | 2           |
| `~/.claude/agents/`          | 3           |
| Plugin's `agents/` directory | 4 (lowest)  |

When multiple subagents share the same name, the higher-priority location wins.

## Plugin Subagent Restrictions

Plugin subagents **do not support**: `hooks`, `mcpServers`, `permissionMode`. These fields are ignored when loading agents from a plugin.
