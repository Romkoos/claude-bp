# Claude Code Blueprint Editor — Architecture Concept

## 1. Product Philosophy

**Blueprint Editor for the Claude Code ecosystem** — a visual configuration editor
inspired by UE Blueprints, Blender Shader Nodes, and n8n.

The user starts with a blank canvas or loads an existing configuration.
Creates nodes of different types, connects pins, edits parameters inline —
and gets a complete working Claude Code configuration.

### Core Principles:
- **Blueprint-first**: typed pins, execution flows, color-coded connections
- **Full inline editor**: each node contains all of its parameters
- **Modular export**: JSON → (later) `.claude/` file system
- **Validation**: basic at launch, extensible over time

---

## 2. Node Types

### 2.1 CLAUDE.md (Rules)
**Color**: Slate/gray-blue
**Icon**: 📋 (document)
**Role**: Always-on project context. Root rules and conventions.

**Parameters (inline editor):**
- `scope`: root | subfolder (dropdown)
- `path`: string (if subfolder, e.g. `/frontend/CLAUDE.md`)
- `content`: textarea with markdown editor (rules, structure, conventions)
- `priority`: number (loading order for multiple files)

**Pins:**
- OUT: `provides context →` (type: context, color: gray)

---

### 2.2 Skill
**Color**: Emerald/green
**Icon**: ⚡ (lightning)
**Role**: On-demand context. Loaded by description match or slash command.

**Parameters (inline editor):**
Section "Frontmatter":
- `name`: string (skill name, defines the slash command)
- `description`: textarea (when to load — critical for auto-discovery)
- `context`: dropdown [conversation | fork]
- `agent`: dropdown [inherit | Explore | Plan | general-purpose | custom...]
- `allowed-tools`: multi-select checklist [Read, Write, Edit, Bash, Glob, Grep, WebSearch, Task, Agent] + patterns like `Bash(git:*)`
- `model`: dropdown [inherit | claude-opus-4 | claude-sonnet-4 | ...]
- `version`: string (semver)

Section "Hooks (scoped)":
- Nested mini hook editor (PreToolUse, PostToolUse, etc.)
- Each: event → matcher → command

Section "Content":
- `instructions`: large textarea (markdown — instructions for Claude)
- `dynamic_injections`: list of `!command` insertions (shell → result injected into prompt)

Section "References":
- `reference_files`: list of paths to additional files (FORMS.md, tables.md, etc.)

**Pins:**
- IN: `← receives context` (type: context, color: gray)
- IN: `← triggered by` (type: trigger, color: yellow)
- OUT: `delegates to →` (type: delegation, color: blue)
- OUT: `uses tools →` (type: tool-access, color: orange)
- OUT: `provides context →` (type: context, color: gray)

---

### 2.3 Subagent
**Color**: Violet/purple
**Icon**: 🤖 (robot)
**Role**: Isolated worker with a separate context window.

**Parameters (inline editor):**
Section "Identity":
- `name`: string
- `description`: textarea
- `type`: dropdown [Explore | Plan | general-purpose | custom]

Section "Configuration":
- `model`: dropdown [inherit | claude-opus-4 | claude-sonnet-4 | ...]
- `allowed-tools`: multi-select + patterns (same as Skill)
- `max_turns`: number (optional)

Section "System Prompt":
- `system_prompt`: large textarea (markdown — this is NOT a user prompt, it's a system prompt)

Section "Hooks (scoped)":
- Same as Skill, but Stop → SubagentStop automatically

Section "Skills":
- `skills`: list of references to skills the subagent can use

**Pins:**
- IN: `← delegated from` (type: delegation, color: blue)
- IN: `← receives context` (type: context, color: gray)
- OUT: `returns result →` (type: result, color: green)
- OUT: `uses tools →` (type: tool-access, color: orange)
- OUT: `spawns →` (type: delegation, color: blue) — subagent can spawn subagents

---

### 2.4 Hook
**Color**: Amber/yellow
**Icon**: 🪝 (hook)
**Role**: Deterministic lifecycle event interceptor.

**Parameters (inline editor):**
- `event`: dropdown [SessionStart | UserPromptSubmit | PreToolUse | PostToolUse | PostToolUseFailure | PermissionRequest | Stop | SubagentStop | SubagentSpawn | PreCompact | ConfigChange | ContextUpdate]
- `matcher`: string (pattern, e.g. "Bash" or "Write|Edit" or "*")
- `type`: dropdown [command | http]
- `command`: string (shell command or URL)
- `timeout_ms`: number (default: 60000)

Section "Decision Logic":
- `decision_type`: dropdown [none | block | allow | deny | escalate]
- `reason`: string (message when blocking)
- `modify_input`: boolean + JSON editor (if tool_input modification needed)

Section "Output":
- `inject_system_message`: boolean + textarea
- `continue`: boolean (whether the agent should continue after the hook)

**Pins:**
- IN: `← listens to` (type: lifecycle-event, color: yellow)
- OUT: `blocks/allows →` (type: decision, color: red/green)
- OUT: `injects context →` (type: context, color: gray)

---

### 2.5 MCP Server
**Color**: Cyan/light blue
**Icon**: 🔌 (plug)
**Role**: External service connected via Model Context Protocol.

**Parameters (inline editor):**
- `name`: string
- `url`: string (SSE endpoint)
- `type`: dropdown [url | stdio]
- `command`: string (if stdio)
- `args`: string[] (if stdio)
- `env`: key-value editor

Section "Provided Tools":
- `tools`: dynamic list (name + description) — what the MCP exposes

**Pins:**
- OUT: `provides tools →` (type: tool-access, color: orange)
- OUT: `provides context →` (type: context, color: gray)

---

### 2.6 Tool
**Color**: Orange
**Icon**: 🔧 (wrench)
**Role**: Specific tool. Atomic unit.

**Parameters:**
- `name`: string [Read | Write | Edit | Bash | Glob | Grep | WebSearch | Task | Agent | ... | custom MCP tool]
- `pattern`: string (restriction, e.g. `Bash(git:*)`)
- `builtin`: boolean (built-in or from MCP)

**Pins:**
- IN: `← used by` (type: tool-access, color: orange)
- IN: `← provided by` (type: tool-access, color: orange) — from MCP

---

### 2.7 Plugin
**Color**: Rose/pink
**Icon**: 📦 (package)
**Role**: Bundle container. Groups skills, agents, hooks, commands.

**Parameters:**
- `name`: string
- `version`: string
- `description`: textarea
- `install_script`: textarea (shell)

**Visual behavior:**
- Works as a **group** (React Flow Group Node)
- Child nodes (Skills, Subagents, Hooks) visually inside the Plugin frame
- Frame with title and package icon

**Pins:**
- OUT: `exports →` (type: bundle, color: rose) — all contents as a single unit

---

### 2.8 Execution Flow (special type)
**Color**: White
**Role**: Execution line (like white exec wires in UE Blueprints)

This is not a node but a **special edge type**. Between nodes that execute
sequentially (Pipeline: Skill A → Subagent B → Skill C), a thick
white/light line is drawn — the execution flow.

---

## 3. Pin System

### 3.1 Pin Types (by color and purpose)

| Pin Type        | Color     | Description                                  |
|-----------------|-----------|----------------------------------------------|
| `exec`          | White     | Execution flow (sequencing)                   |
| `context`       | Gray      | Context transfer (CLAUDE.md → Skill)          |
| `delegation`    | Blue      | Task delegation (Skill → Subagent)            |
| `trigger`       | Yellow    | Event trigger (lifecycle → Hook)              |
| `tool-access`   | Orange    | Tool usage                                    |
| `result`        | Green     | Result return                                 |
| `decision`      | Red       | Hook decision (block/allow/deny)              |
| `bundle`        | Rose      | Plugin export                                 |

### 3.2 Connection Rules

Pins connect ONLY to compatible types:
- `context` → `context` ✅
- `delegation` → `delegation` ✅
- `context` → `delegation` ❌
- `tool-access` → `tool-access` ✅
- `exec` → `exec` ✅

When attempting to connect incompatible pins — the edge is not created +
visual feedback (red pin highlight).

### 3.3 Pin Placement

Following UE Blueprint conventions:
- **Input pins** — left side of node
- **Output pins** — right side of node
- **Exec In** — top-left
- **Exec Out** — top-right
- Each pin has a label next to it

---

## 4. Edge Types

### 4.1 Visual Styles

| Edge Type          | Style                           | Animation        |
|--------------------|---------------------------------|------------------|
| Execution flow     | Thick white line                | Pulse animation  |
| Context transfer   | Thin gray, dash-dot             | None             |
| Delegation         | Medium blue, solid              | Flow animation   |
| Trigger            | Medium yellow, dashed           | Pulse            |
| Tool access        | Thin orange, dashed             | None             |
| Result return      | Medium green, solid             | Flow (reverse)   |
| Decision           | Medium red/green                | Pulse            |
| Bundle             | Thick rose, double line         | None             |

### 4.2 Edge Data

Some edges carry data:
- **Trigger**: matcher pattern (displayed as label on the edge)
- **Decision**: decision type (allow/deny/block) — icon on the edge
- **Delegation**: task description (tooltip)

---

## 5. Application Interface

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar                                                     │
│  [💾 Save] [📂 Load] [📤 Export] [↩ Undo] [↪ Redo] [🔍 Search] │
├──────────┬──────────────────────────────────────┬───────────┤
│          │                                      │           │
│  Node    │                                      │ Properties│
│  Palette │        Canvas (React Flow)           │ Panel     │
│          │                                      │           │
│  ────────│                                      │ (appears  │
│  📋 Rules │                                      │ on node   │
│  ⚡ Skill │                                      │ click)    │
│  🤖 Agent │                                      │           │
│  🪝 Hook  │                                      │           │
│  🔌 MCP   │                                      │           │
│  🔧 Tool  │                                      │           │
│  📦 Plugin│                                      │           │
│          │                                      │           │
│  ────────│                                      │           │
│  Templates│                                      │           │
│  (preset │                                      │           │
│  configs)│                                      │           │
│          │                                      │           │
├──────────┴──────────────────────────────────────┴───────────┤
│  Status Bar: [Nodes: 12] [Edges: 8] [Validation: 2 warns]  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Node Palette (left panel)

- Node categories with icons and color labels
- **Drag & Drop** onto canvas to create a node
- **Templates**: presets of typical configurations:
  - "PR Review Pipeline" (Explore agent → Review skill → Hook)
  - "Code & Test" (Implement agent → Test skill → Lint hook)
  - "Research Pipeline" (3 parallel Explore agents → Merge skill)
- **Search**: filter by name/type

### 5.3 Canvas

- **React Flow** with Background (dots pattern, dark theme)
- **MiniMap** (bottom-right corner)
- **Controls** (zoom in/out/fit)
- **Context menu** (right-click on canvas): create node, paste, select all
- **Context menu** (right-click on node): duplicate, delete, disconnect all, group into plugin
- **Multi-select** (Shift+Click or selection box)
- **Snap to grid** (toggle)
- **Auto-layout** (toolbar button, dagre or ELK algorithm)

### 5.4 Properties Panel (right panel)

Appears on node selection. Contains the full editor for all parameters.
For long fields (system prompt, instructions) — expandable textarea.

**Sections are collapsible** (accordion) to avoid overload.

### 5.5 Inline Node Editor

Each node on the canvas displays:
- **Header**: icon + name + type
- **Compact fields**: key parameters visible directly on the node
- **Pins with labels**: inputs on left, outputs on right
- **Expand/collapse**: button to toggle between compact and expanded view

In **compact view**: only header + pins + 1-2 key parameters.
In **expanded view**: all fields editable inline (like in UE Blueprints).

---

## 6. Data Model (JSON Schema)

### 6.1 Graph (top level)

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "My Claude Config",
    "description": "...",
    "created": "2026-03-16T...",
    "modified": "2026-03-16T..."
  },
  "nodes": [...],
  "edges": [...],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "settings": {
    "theme": "dark",
    "snapToGrid": true,
    "gridSize": 20
  }
}
```

### 6.2 Node (common structure)

```json
{
  "id": "node_uuid",
  "type": "skill",
  "position": { "x": 200, "y": 300 },
  "data": {
    "label": "PR Review",
    "collapsed": false,
    "params": { ... },
    "validation": {
      "errors": [],
      "warnings": []
    }
  },
  "parentId": "plugin_uuid",
  "width": 320,
  "height": null
}
```

### 6.3 Edge (common structure)

```json
{
  "id": "edge_uuid",
  "source": "node_a",
  "sourceHandle": "out_delegation",
  "target": "node_b",
  "targetHandle": "in_delegation",
  "type": "delegation",
  "animated": true,
  "data": {
    "label": "Review task",
    "pinType": "delegation",
    "params": {}
  }
}
```

### 6.4 Type-specific params

**Skill params:**
```json
{
  "frontmatter": {
    "name": "pr-review",
    "description": "Review pull requests thoroughly",
    "context": "fork",
    "agent": "Explore",
    "allowed_tools": ["Read", "Grep", "Glob", "Bash(git:*)"],
    "model": "inherit",
    "version": "1.0.0"
  },
  "scoped_hooks": [
    {
      "event": "PreToolUse",
      "matcher": "Bash",
      "type": "command",
      "command": "./scripts/validate.sh"
    }
  ],
  "instructions": "## Review Process\n1. Check diff...",
  "dynamic_injections": [
    "!`gh pr diff`",
    "!`gh pr view --comments`"
  ],
  "reference_files": ["patterns.md", "checklist.md"]
}
```

**Subagent params:**
```json
{
  "name": "code-reviewer",
  "description": "Reviews code changes",
  "agent_type": "custom",
  "model": "claude-opus-4-20250514",
  "allowed_tools": ["Read", "Grep", "Glob", "Bash(git diff:*)"],
  "max_turns": 20,
  "system_prompt": "You are a senior code reviewer...",
  "scoped_hooks": [],
  "skills": ["pr-review", "style-guide"]
}
```

**Hook params:**
```json
{
  "event": "PreToolUse",
  "matcher": "Bash",
  "type": "command",
  "command": "./hooks/validate-bash.sh",
  "timeout_ms": 10000,
  "decision": {
    "type": "conditional",
    "deny_reason": "Dangerous command blocked",
    "modify_input": false
  },
  "inject_system_message": "",
  "continue": true
}
```

**MCP Server params:**
```json
{
  "name": "github",
  "connection": {
    "type": "url",
    "url": "https://mcp.github.com/sse"
  },
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  },
  "provided_tools": [
    { "name": "search_repos", "description": "Search GitHub repositories" },
    { "name": "create_issue", "description": "Create a GitHub issue" }
  ]
}
```

---

## 7. Validation (basic, extensible)

### 7.1 Level 1 — Structural (MVP)

- ❌ Skill with `context: fork` without specifying `agent`
- ❌ Hook without `event` or `command`
- ❌ Subagent without `system_prompt`
- ❌ Incompatible pin types connected
- ⚠️ Skill without `description` (won't be auto-discovered)
- ⚠️ Subagent with empty `allowed_tools` (inherits all — potential security hole)
- ⚠️ Circular dependencies in delegation chain

### 7.2 Level 2 — Semantic (later)

- Hook matcher doesn't match any tool in the graph
- Subagent references a skill that doesn't exist
- UserPromptSubmit hook that spawns subagents (infinite loop risk)
- Conflicting decision hooks on the same tool

### 7.3 Validation Display

- ⚠️/❌ icon on the node (top-right corner)
- Tooltip with problem description
- Status bar at bottom: error and warning count
- (Optional) Validation panel — clickable list of all issues with navigation

---

## 8. Export / Import Module

### 8.1 Architecture (modular)

```
GraphState (React state)
    │
    ▼
SerializationLayer
    │
    ├── JSONExporter        ← MVP: saves/loads graph as JSON
    ├── FileSystemExporter  ← v2: generates .claude/ structure
    └── YAMLExporter        ← v3: individual SKILL.md, agents/*.md files
```

### 8.2 JSON Export (MVP)

- Save: `GraphState` → JSON file (download)
- Load: JSON file → `GraphState` (upload + schema validation)
- Auto-save: to `window.storage` (persistent across sessions)

### 8.3 File System Export (v2, future)

```
.claude/
├── CLAUDE.md                          ← from Rules nodes
├── settings.json                      ← hooks, permission rules
├── skills/
│   ├── pr-review/
│   │   ├── SKILL.md                   ← frontmatter + instructions
│   │   ├── patterns.md                ← reference files
│   │   └── checklist.md
│   └── newsletter-format/
│       └── SKILL.md
├── agents/
│   ├── code-reviewer.md               ← subagent system prompt + config
│   └── explore-codebase.md
└── plugins/
    └── my-plugin/
        └── ...
```

---

## 9. Visual Style

### 9.1 Theme: Dark Blueprint

Inspiration: UE5 Blueprints + n8n dark mode

- **Canvas background**: very dark (#0d1117 or similar) with dot-grid
- **Nodes**: dark gray cards (#1c2028) with colored stripe on top (by node type)
- **Pins**: colored circles with glow on hover
- **Edges**: colored Bezier curves, animated for exec/trigger
- **Text**: light gray (#e6edf3) for body, muted for labels
- **Selection accent**: bright outline in the node type color
- **Font**: monospace for code (JetBrains Mono), sans for UI (Geist)

### 9.2 Node Color Palette

| Type      | Header color | Hex       |
|-----------|-------------|-----------|
| Rules     | Slate       | #64748b   |
| Skill     | Emerald     | #10b981   |
| Subagent  | Violet      | #8b5cf6   |
| Hook      | Amber       | #f59e0b   |
| MCP       | Cyan        | #06b6d4   |
| Tool      | Orange      | #f97316   |
| Plugin    | Rose        | #f43f5e   |

---

## 10. Tech Stack

### 10.1 For React artifact (MVP in claude.ai)

```
@xyflow/react  — core (React Flow 12+)
React hooks    — state management (useNodesState, useEdgesState, useCallback)
Tailwind CSS   — styling (core utility classes)
lucide-react   — icons
```

**Artifact limitations:**
- Single JSX file
- No localStorage (use window.storage API from persistent_storage)
- Available libraries: React, @xyflow/react (MUST verify availability),
  lucide-react, lodash, d3

### 10.2 For full project (v2)

```
@xyflow/react          — core
zustand                — state management
dagre / elkjs          — auto-layout
@monaco-editor/react   — inline code editors
zod                    — schema validation
js-yaml                — YAML parsing/generation
file-saver             — file export
```

---

## 11. Templates

### 11.1 "PR Review Pipeline"

```
[CLAUDE.md: project rules]
    ↓ context
[Skill: fetch-pr-data] ──exec──→ [Subagent: Explore (read PR)] ──result──→ [Skill: write-review]
    ↑                                      │
    └── Hook: PreToolUse(Bash) ────────────┘
```

### 11.2 "Multi-Agent Research"

```
[Skill: research-topic]
    ├──delegates──→ [Subagent: Web Docs Agent] ──result──┐
    ├──delegates──→ [Subagent: StackOverflow Agent] ──result──┤──→ [Skill: merge-findings]
    └──delegates──→ [Subagent: Codebase Explorer] ──result──┘
```

### 11.3 "Safe Deployment"

```
[Hook: SessionStart] ──injects──→ context: "load env vars"
[Skill: deploy]
    ├── uses ──→ [Tool: Bash(deploy:*)]
    │              ↑
    │   [Hook: PreToolUse(Bash)] ──decision──→ allow/deny
    │
    └── delegates ──→ [Subagent: test-runner] ──result──→ [Hook: Stop] ──→ notification
```

---

## 12. Roadmap

### Phase 1 — MVP (first prompt)
- [ ] Canvas with React Flow, dark theme
- [ ] 4 node types: Skill, Subagent, Hook, CLAUDE.md
- [ ] Typed pins with color coding
- [ ] Inline parameter editing (compact + expanded)
- [ ] Drag & drop from palette
- [ ] Pin connection with type validation
- [ ] Basic validation
- [ ] JSON save/load (via state or download)

### Phase 2 — Expansion
- [ ] Tool + MCP Server nodes
- [ ] Plugin as group
- [ ] Auto-layout (dagre)
- [ ] Templates (presets)
- [ ] Undo/Redo
- [ ] Extended validation

### Phase 3 — Export
- [ ] File system structure .claude/
- [ ] YAML frontmatter generation
- [ ] Import from existing .claude/

### Phase 4 — Polish
- [ ] Monaco editor for code fields
- [ ] Minimap with colored nodes
- [ ] Search across nodes and parameters
- [ ] Keyboard shortcuts
- [ ] Animation flow visualization (execution demo)