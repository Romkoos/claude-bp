# Rules Co-location with Target Nodes

## Problem

Rules files export to root/subfolder paths regardless of connections. They should be co-located with the nodes they're linked to.

## Solution

### Export

- Rules linked to Skill "deploy" → `.claude/skills/deploy/{slug}.md`
- Rules linked to Subagent "reviewer" → `.claude/agents/{slug}.md`
- Rules linked to N targets → N copies, one per target folder
- Rules linked to nothing → root/subfolder (current behavior via scope/path)
- When linked, `scope`/`path` fields are ignored — placement determined by edges

### Integration section update

Change rules reference in skill/subagent files from:
```
You MUST load and follow all rules from: "Backend Rules".
```
To:
```
You MUST load and follow all rules from file: "backend-rules.md" (co-located in this directory).
```

### Validation

New rule: two Rules nodes with the same `label` connected to the same target node → error on both Rules nodes: `"Duplicate rules name '{label}' targeting '{target name}'"`.
