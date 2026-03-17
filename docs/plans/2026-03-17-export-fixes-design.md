# Export Fixes: Rules Naming & Connection Awareness

## Problem

1. Rules nodes export as `CLAUDE.md` — should use the node's label as filename
2. Exported file content doesn't reflect blueprint connections (edges) — skills/subagents have no awareness of what rules they receive, what they delegate to, etc.

## Solution

### Fix 1: Rules filename from node label

- Replace hardcoded `CLAUDE.md` with `{slugify(label)}.md`
- Root scope: `{slug}.md` at project root
- Subfolder scope: `{path}/{slug}.md`
- Fallback if label is empty: `rules.md`

### Fix 2: Mandatory integration section for Skills and Subagents

Add a `## MANDATORY: Integration Requirements` section at the end of Skill and Subagent files based on connected edges.

Pass `edges` and `nodes` to `generateSkillFiles()` and `generateSubagentFiles()`.

For each node, resolve incoming/outgoing edges and generate directive lines:

| Edge type | Direction | Phrasing |
|---|---|---|
| Context (in) | Rules/MCP → this | `You MUST load and follow all rules from: "{source label}"` |
| Delegation (in) | caller → Subagent | `You are invoked by: "{source label}"` |
| Delegation (out) | this → Subagent | `You MUST delegate to the "{target label}" subagent when appropriate` |
| Exec (out) | this → next | `After completion, you MUST hand off execution to: "{target label}"` |
| Exec (in) | prev → this | `You receive execution from: "{source label}"` |
| Trigger (in) | Hook → Skill | `You are triggered by hook: "{source label}"` |
| ToolAccess (out) | this → Tool | `You have access to tool: "{target tool name}"` |
| Bundle (in) | Plugin → this | `You are part of plugin bundle: "{source label}"` |

- Section only added if at least one connection exists
- Rules nodes do NOT get this section
- Node labels resolved from full nodes list for human-readable names
