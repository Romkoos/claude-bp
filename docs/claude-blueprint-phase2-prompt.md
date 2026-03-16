# IMPLEMENTATION PROMPT: Claude Code Blueprint Editor — Phase 2 (Expansion)

## Context

Phase 1 is complete and working. The app has a dark blueprint canvas with 4 node types (Rules, Skill, Subagent, Hook), typed pin system, inline editing, properties panel, JSON save/load, and validation.

Phase 2 adds **3 new node types** (Tool, MCP Server, Plugin), **auto-layout**, **templates**, **undo/redo**, and **extended validation**. All additions must integrate seamlessly with the existing codebase — same patterns, same store, same styling conventions.

**CRITICAL**: Do NOT rewrite existing components. Extend them. Add new files, modify store, register new node types, add new pin definitions. The existing 4 node types must continue working exactly as before.

---

## Phase 2 Scope

1. **Tool node** — atomic tool unit (Read, Write, Bash, etc.)
2. **MCP Server node** — external service via Model Context Protocol
3. **Plugin node** — group container that bundles skills, agents, hooks
4. **Auto-layout** — dagre-based automatic graph arrangement
5. **Templates** — preset configurations loaded from the palette
6. **Undo/Redo** — full history stack for all graph mutations
7. **Extended validation** — semantic checks beyond structural

---

## 1. Tool Node

### New File: `src/components/Nodes/ToolNode.tsx`

**Color**: Orange (#f97316)
**Icon**: `Wrench` from lucide-react
**Role**: Represents a specific tool that skills/subagents can use. Makes tool permissions visible as graph connections rather than hidden inside node config.

**Compact view:**
- Tool name as header (e.g. "Bash", "Read", "WebSearch")
- Pattern restriction badge if set (e.g. `git:*`)
- Built-in indicator (dot or badge)

**Expanded view:**
- `name`: dropdown with common tools [Read | Write | Edit | Bash | Glob | Grep | WebSearch | Task | Agent] + free-text for custom MCP tools
- `pattern`: text input for restrictions (e.g. `git status:*`, `npm:*`). Show placeholder "No restriction" when empty
- `builtin`: toggle (built-in vs MCP-provided)
- `description`: short text (optional, mainly for custom/MCP tools)

**Pin definitions** — add to `NODE_PIN_DEFINITIONS`:
```typescript
tool: [
  { id: 'in_used_by',    type: PinType.ToolAccess, direction: PinDirection.In,  label: 'used by' },
  { id: 'in_provided_by', type: PinType.ToolAccess, direction: PinDirection.In,  label: 'provided by' },
],
```

Tool nodes are **terminal** — they have only input pins, no outputs. They represent the "leaves" of the graph.

**Data type:**
```typescript
export interface ToolNodeData extends BaseNodeData {
  toolName: string;
  pattern: string;
  builtin: boolean;
  description: string;
}
```

**Default factory:**
```typescript
export function createToolData(): ToolNodeData {
  return {
    label: 'New Tool',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    toolName: 'Bash',
    pattern: '',
    builtin: true,
    description: '',
  };
}
```

**Properties editor**: `src/components/PropertiesPanel/ToolEditor.tsx`
- Tool name dropdown/input
- Pattern input with monospace font
- Built-in toggle
- Description textarea

### Visual Design
Tool nodes should be **smaller** than other nodes (min-width: 200px) since they carry less data. In compact mode they're essentially a colored pill with the tool name and an optional pattern badge.

---

## 2. MCP Server Node

### New File: `src/components/Nodes/McpNode.tsx`

**Color**: Cyan (#06b6d4)
**Icon**: `Plug` from lucide-react
**Role**: External service connected via MCP. Exposes tools that other nodes can use.

**Compact view:**
- Server name as header
- Connection type badge ("URL" or "stdio")
- Tool count badge (e.g. "4 tools")

**Expanded view:**
- `name`: text input
- `connectionType`: dropdown [url | stdio]
- If url: `url` text input
- If stdio: `command` text input + `args` text input (comma-separated)
- `env`: key-value editor (use existing `KeyValueEditor` component)
- `providedTools`: dynamic list editor — each item has `name` (string) and `description` (string). Add/remove buttons.

**Pin definitions:**
```typescript
mcp: [
  { id: 'out_tools',   type: PinType.ToolAccess, direction: PinDirection.Out, label: 'provides tools' },
  { id: 'out_context',  type: PinType.Context,   direction: PinDirection.Out, label: 'provides context' },
],
```

**Data type:**
```typescript
export interface McpNodeData extends BaseNodeData {
  serverName: string;
  connection: {
    type: 'url' | 'stdio';
    url: string;
    command: string;
    args: string[];
  };
  env: Record<string, string>;
  providedTools: Array<{ name: string; description: string }>;
}
```

**Default factory:**
```typescript
export function createMcpData(): McpNodeData {
  return {
    label: 'New MCP Server',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    serverName: '',
    connection: {
      type: 'url',
      url: '',
      command: '',
      args: [],
    },
    env: {},
    providedTools: [],
  };
}
```

**Properties editor**: `src/components/PropertiesPanel/McpEditor.tsx`
- Server name input
- Connection type dropdown with conditional fields
- Environment variables key-value editor
- Provided tools list with add/remove/edit

### Visual Design
MCP nodes should feel like "external sources" — give them a slightly different shape treatment. Add a subtle dashed border to distinguish from internal nodes. The provided tools list should show as small chips inside the expanded node.

---

## 3. Plugin Node (Group Container)

### New File: `src/components/Nodes/PluginNode.tsx`

**Color**: Rose (#f43f5e)
**Icon**: `Package` from lucide-react
**Role**: Visual grouping container. Child nodes inside a Plugin are visually enclosed.

**This uses React Flow's built-in group/parent mechanism:**
- Plugin node has `type: 'plugin'` and a larger size
- Child nodes have `parentId` set to the plugin node's ID
- Child positions become relative to the plugin node
- Plugin renders as a bordered container with a header

**Compact view:**
- Plugin name
- Version badge
- Child count badge (e.g. "3 skills, 1 agent, 2 hooks")

**Expanded view:**
- `name`: text input
- `version`: text input (semver)
- `description`: textarea
- `installScript`: textarea with monospace font (shell commands)
- Child node list (read-only summary — children are edited individually)

**Pin definitions:**
```typescript
plugin: [
  { id: 'out_bundle', type: PinType.Bundle, direction: PinDirection.Out, label: 'exports' },
],
```

**Data type:**
```typescript
export interface PluginNodeData extends BaseNodeData {
  pluginName: string;
  version: string;
  description: string;
  installScript: string;
}
```

**Default factory:**
```typescript
export function createPluginData(): PluginNodeData {
  return {
    label: 'New Plugin',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    pluginName: '',
    version: '1.0.0',
    description: '',
    installScript: '',
  };
}
```

### Group Mechanics

**Creating a Plugin group:**
1. User drags "Plugin" from palette onto canvas → creates an empty plugin container
2. User drags existing nodes INTO the plugin → sets `parentId`, positions become relative
3. OR: user multi-selects nodes → right-click → "Group into Plugin" → creates plugin around selection

**Implementation detail for "Group into Plugin" context menu action:**
```typescript
function groupIntoPlugin(selectedNodeIds: string[]) {
  // 1. Calculate bounding box of selected nodes (with padding)
  // 2. Create a new Plugin node at that bounding box position
  // 3. For each selected node:
  //    - Set parentId to the plugin node ID
  //    - Recalculate position as offset from plugin's position
  // 4. Set plugin node size to encompass all children + padding
}
```

**React Flow group node setup:**
```typescript
// When creating the plugin node:
{
  id: pluginId,
  type: 'plugin',
  position: { x: boundingBox.x - padding, y: boundingBox.y - padding },
  data: createPluginData(),
  style: {
    width: boundingBox.width + padding * 2,
    height: boundingBox.height + padding * 2,
  },
}
```

**Visual rendering of PluginNode:**
```
┌─ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──┐
│ 📦 My Plugin  v1.0.0                    [exports] ● │  ← rose header
│                                                      │
│   ┌──────────────┐  ┌──────────────┐                │
│   │  Skill Node  │  │ Agent Node   │                │
│   └──────────────┘  └──────────────┘                │
│                                                      │
│   ┌──────────────┐                                   │
│   │  Hook Node   │                                   │
│   └──────────────┘                                   │
│                                                      │
└─ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──┘
```

The plugin border should be **dashed rose** to visually separate it from regular nodes. Use `border: 2px dashed #f43f5e40` with a subtle rose background tint `background: #f43f5e08`.

### Removing from Plugin

Right-click a child node → "Remove from Plugin" → sets `parentId` to undefined, recalculates absolute position.

---

## 4. Registration: Update Existing Code

### Update `BlueprintNodeType`

```typescript
// types/nodes.ts — MODIFY existing
export type BlueprintNodeType = 'rules' | 'skill' | 'subagent' | 'hook' | 'tool' | 'mcp' | 'plugin';
```

### Update `nodeTypes` in Canvas

```typescript
// BlueprintCanvas.tsx — ADD to existing nodeTypes
const nodeTypes = {
  rules: RulesNode,
  skill: SkillNode,
  subagent: SubagentNode,
  hook: HookNode,
  tool: ToolNode,       // NEW
  mcp: McpNode,         // NEW
  plugin: PluginNode,   // NEW
};
```

### Update `NODE_COLORS` in theme

```typescript
// constants/theme.ts — ADD to existing
tool:    { header: '#f97316', headerDark: '#ea580c', glow: '#f9731640' },
mcp:     { header: '#06b6d4', headerDark: '#0891b2', glow: '#06b6d440' },
plugin:  { header: '#f43f5e', headerDark: '#e11d48', glow: '#f43f5e40' },
```

### Update `NODE_PIN_DEFINITIONS`

Add the pin definitions for `tool`, `mcp`, and `plugin` as specified in their sections above.

### Update `NodePalette.tsx`

Add 3 new draggable cards to the palette:
- 🔧 Tool — "Atomic tool unit (Read, Write, Bash, etc.)"
- 🔌 MCP Server — "External service via MCP protocol"
- 📦 Plugin — "Bundle container for skills, agents, hooks"

### Update `PropertiesPanel.tsx`

Add routing for the 3 new node types to render their respective editors (ToolEditor, McpEditor, PluginEditor).

### Update Store

Add default factory calls for the 3 new types in the `addNode` action. Add `groupIntoPlugin` and `removeFromPlugin` actions.

---

## 5. Auto-Layout (Dagre)

### Install

```bash
npm install @dagrejs/dagre
```

### New File: `src/utils/layout.ts`

```typescript
import Dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction: 'TB' | 'LR' | 'BT' | 'RL';  // top-bottom, left-right, etc.
  nodeSpacing: number;   // vertical spacing between nodes (default: 80)
  rankSpacing: number;   // horizontal spacing between ranks (default: 200)
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = { direction: 'LR', nodeSpacing: 80, rankSpacing: 200 }
): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  
  g.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeSpacing,
    ranksep: options.rankSpacing,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph
  // IMPORTANT: Skip child nodes of plugins — they keep their relative positions
  nodes.forEach((node) => {
    if (!node.parentId) {
      g.setNode(node.id, {
        width: node.measured?.width ?? node.width ?? 300,
        height: node.measured?.height ?? node.height ?? 200,
      });
    }
  });

  // Add edges
  edges.forEach((edge) => {
    // Only add edges between top-level nodes (not within plugins)
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (sourceNode && targetNode && !sourceNode.parentId && !targetNode.parentId) {
      g.setEdge(edge.source, edge.target);
    }
  });

  Dagre.layout(g);

  // Apply new positions
  return nodes.map((node) => {
    if (node.parentId) return node; // skip plugin children

    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        x: dagreNode.x - (dagreNode.width / 2),
        y: dagreNode.y - (dagreNode.height / 2),
      },
    };
  });
}
```

### Integration

**Toolbar button**: Add "Auto-layout" button (icon: `LayoutGrid` from lucide).

**Layout direction picker**: When clicking Auto-layout, show a small dropdown with 4 direction options:
- → Left to Right (LR) — default, best for pipeline flows
- ↓ Top to Bottom (TB) — good for hierarchy views  
- ← Right to Left (RL)
- ↑ Bottom to Top (BT)

**Store action:**
```typescript
autoLayout: (direction?: 'TB' | 'LR' | 'BT' | 'RL') => {
  const layoutedNodes = applyDagreLayout(get().nodes, get().edges, { 
    direction: direction ?? 'LR',
    nodeSpacing: 80,
    rankSpacing: 200,
  });
  set({ nodes: layoutedNodes });
  // After layout, call fitView on the React Flow instance
}
```

**After layout**: animate transition. Use React Flow's `setNodes` with a brief transition, or apply positions with CSS transition on the node wrapper:
```css
.react-flow__node {
  transition: transform 0.3s ease-in-out;
}
```

**IMPORTANT**: The auto-layout transition class should only be applied temporarily during layout. Otherwise it interferes with manual dragging. Approach:
1. Add a `layouting` flag to the store
2. Set it to `true` before applying layout
3. When `layouting` is true, nodes get the transition class
4. Set it to `false` after 300ms (matching the transition duration)

---

## 6. Templates

### New File: `src/constants/templates.ts`

Templates are pre-defined graph configurations (nodes + edges + viewport) that users can load from the palette.

```typescript
export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;         // emoji
  category: 'pipeline' | 'research' | 'safety' | 'starter';
  graph: {
    nodes: Node[];
    edges: Edge[];
  };
}

export const TEMPLATES: Template[] = [
  prReviewPipeline,
  multiAgentResearch,
  safeDeployment,
  starterConfig,
];
```

### Template 1: "PR Review Pipeline"

```typescript
const prReviewPipeline: Template = {
  id: 'pr-review',
  name: 'PR Review Pipeline',
  description: 'Automated pull request review with code exploration and security checks',
  icon: '🔍',
  category: 'pipeline',
  graph: {
    nodes: [
      {
        id: 'tmpl_rules',
        type: 'rules',
        position: { x: 0, y: 150 },
        data: {
          ...createRulesData(),
          label: 'Project Rules',
          content: '# Code Standards\n\n- Follow existing patterns\n- All functions must have JSDoc\n- No console.log in production code',
        },
      },
      {
        id: 'tmpl_fetch_skill',
        type: 'skill',
        position: { x: 300, y: 0 },
        data: {
          ...createSkillData(),
          label: 'Fetch PR Data',
          frontmatter: {
            name: 'fetch-pr',
            description: 'Fetch pull request diff and comments',
            context: 'fork',
            agent: 'Explore',
            allowedTools: ['Read', 'Grep', 'Glob', 'Bash(gh:*)'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Fetch PR Context\n\nGather all PR data for review.',
          dynamicInjections: ['!`gh pr diff`', '!`gh pr view --comments`'],
        },
      },
      {
        id: 'tmpl_reviewer',
        type: 'subagent',
        position: { x: 650, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Code Reviewer',
          name: 'code-reviewer',
          agentType: 'Explore',
          allowedTools: ['Read', 'Grep', 'Glob'],
          systemPrompt: 'You are a senior code reviewer. Analyze the PR diff for:\n1. Logic errors\n2. Security issues\n3. Performance problems\n4. Style violations\n\nBe thorough but constructive.',
        },
      },
      {
        id: 'tmpl_security_hook',
        type: 'hook',
        position: { x: 650, y: 300 },
        data: {
          ...createHookData(),
          label: 'Security Check',
          event: 'PreToolUse',
          matcher: 'Bash',
          command: './hooks/security-check.sh',
          decision: { type: 'deny', reason: 'Blocked by security policy', modifyInput: false },
        },
      },
      {
        id: 'tmpl_write_skill',
        type: 'skill',
        position: { x: 1000, y: 0 },
        data: {
          ...createSkillData(),
          label: 'Write Review',
          frontmatter: {
            name: 'write-review',
            description: 'Compile review findings into a PR comment',
            context: 'conversation',
            agent: 'inherit',
            allowedTools: ['Write', 'Bash(gh:*)'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Write Review Comment\n\nCompile all findings into a structured review comment and post to the PR.',
        },
      },
    ],
    edges: [
      { id: 'tmpl_e1', source: 'tmpl_rules', sourceHandle: 'out_context', target: 'tmpl_fetch_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'context' } },
      { id: 'tmpl_e2', source: 'tmpl_fetch_skill', sourceHandle: 'out_exec', target: 'tmpl_reviewer', targetHandle: 'in_exec', type: 'typed', animated: true, data: { pinType: 'exec' } },
      { id: 'tmpl_e3', source: 'tmpl_fetch_skill', sourceHandle: 'out_delegation', target: 'tmpl_reviewer', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_e4', source: 'tmpl_reviewer', sourceHandle: 'out_result', target: 'tmpl_write_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'result' } },
      { id: 'tmpl_e5', source: 'tmpl_reviewer', sourceHandle: 'out_exec', target: 'tmpl_write_skill', targetHandle: 'in_exec', type: 'typed', animated: true, data: { pinType: 'exec' } },
      { id: 'tmpl_e6', source: 'tmpl_security_hook', sourceHandle: 'out_decision', target: 'tmpl_reviewer', targetHandle: 'in_trigger', type: 'typed', data: { pinType: 'decision', label: 'PreToolUse(Bash)' } },
    ],
  },
};
```

### Template 2: "Multi-Agent Research"

```typescript
const multiAgentResearch: Template = {
  id: 'multi-research',
  name: 'Multi-Agent Research',
  description: '3 parallel research agents merging findings into a single document',
  icon: '🔬',
  category: 'research',
  graph: {
    nodes: [
      {
        id: 'tmpl_research_skill',
        type: 'skill',
        position: { x: 0, y: 150 },
        data: {
          ...createSkillData(),
          label: 'Research Topic',
          frontmatter: {
            name: 'research',
            description: 'Research a topic by spawning parallel agents',
            context: 'conversation',
            agent: 'inherit',
            allowedTools: ['Read', 'WebSearch', 'Task'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Research Pipeline\n\nSpawn 3 parallel agents to research from different angles.',
        },
      },
      {
        id: 'tmpl_web_agent',
        type: 'subagent',
        position: { x: 400, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Web Docs Agent',
          name: 'web-docs',
          agentType: 'general-purpose',
          allowedTools: ['WebSearch', 'Read'],
          systemPrompt: 'Search official documentation and find best practices, recommended patterns, and relevant GitHub discussions.',
        },
      },
      {
        id: 'tmpl_so_agent',
        type: 'subagent',
        position: { x: 400, y: 200 },
        data: {
          ...createSubagentData(),
          label: 'StackOverflow Agent',
          name: 'stackoverflow',
          agentType: 'general-purpose',
          allowedTools: ['WebSearch', 'Read'],
          systemPrompt: 'Search StackOverflow for similar problems. Find highly-voted answers. Note common pitfalls.',
        },
      },
      {
        id: 'tmpl_explore_agent',
        type: 'subagent',
        position: { x: 400, y: 400 },
        data: {
          ...createSubagentData(),
          label: 'Codebase Explorer',
          name: 'codebase-explorer',
          agentType: 'Explore',
          allowedTools: ['Read', 'Grep', 'Glob'],
          systemPrompt: 'Search the codebase for related patterns, existing solutions, and relevant files.',
        },
      },
      {
        id: 'tmpl_merge_skill',
        type: 'skill',
        position: { x: 800, y: 150 },
        data: {
          ...createSkillData(),
          label: 'Merge Findings',
          frontmatter: {
            name: 'merge-findings',
            description: 'Compile research from all agents into a report',
            context: 'conversation',
            agent: 'inherit',
            allowedTools: ['Write'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Merge Research\n\nCombine all agent findings into docs/research/<topic>.md',
        },
      },
    ],
    edges: [
      { id: 'tmpl_r1', source: 'tmpl_research_skill', sourceHandle: 'out_delegation', target: 'tmpl_web_agent', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_r2', source: 'tmpl_research_skill', sourceHandle: 'out_delegation', target: 'tmpl_so_agent', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_r3', source: 'tmpl_research_skill', sourceHandle: 'out_delegation', target: 'tmpl_explore_agent', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_r4', source: 'tmpl_web_agent', sourceHandle: 'out_result', target: 'tmpl_merge_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'result' } },
      { id: 'tmpl_r5', source: 'tmpl_so_agent', sourceHandle: 'out_result', target: 'tmpl_merge_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'result' } },
      { id: 'tmpl_r6', source: 'tmpl_explore_agent', sourceHandle: 'out_result', target: 'tmpl_merge_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'result' } },
    ],
  },
};
```

### Template 3: "Safe Deployment"

```typescript
const safeDeployment: Template = {
  id: 'safe-deploy',
  name: 'Safe Deployment',
  description: 'Guarded deployment with test runner, security hooks, and notifications',
  icon: '🛡️',
  category: 'safety',
  graph: {
    nodes: [
      {
        id: 'tmpl_session_hook',
        type: 'hook',
        position: { x: 0, y: 0 },
        data: {
          ...createHookData(),
          label: 'Load Environment',
          event: 'SessionStart',
          matcher: '*',
          command: 'echo "Loading deploy environment..." && cat .env.deploy',
          decision: { type: 'none', reason: '', modifyInput: false },
        },
      },
      {
        id: 'tmpl_deploy_skill',
        type: 'skill',
        position: { x: 300, y: 100 },
        data: {
          ...createSkillData(),
          label: 'Deploy',
          frontmatter: {
            name: 'deploy',
            description: 'Run deployment pipeline with safety checks',
            context: 'conversation',
            agent: 'inherit',
            allowedTools: ['Bash(deploy:*)', 'Read', 'Write'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Deployment\n\n1. Run tests\n2. Build\n3. Deploy to staging\n4. Smoke test\n5. Promote to production',
        },
      },
      {
        id: 'tmpl_test_agent',
        type: 'subagent',
        position: { x: 650, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Test Runner',
          name: 'test-runner',
          agentType: 'general-purpose',
          allowedTools: ['Bash(npm test:*)', 'Bash(pytest:*)', 'Read'],
          systemPrompt: 'Run the full test suite. Report any failures with file paths and error messages.',
        },
      },
      {
        id: 'tmpl_bash_guard',
        type: 'hook',
        position: { x: 650, y: 250 },
        data: {
          ...createHookData(),
          label: 'Bash Guard',
          event: 'PreToolUse',
          matcher: 'Bash',
          command: './hooks/validate-deploy-commands.sh',
          decision: { type: 'deny', reason: 'Command not in deployment allowlist', modifyInput: false },
        },
      },
      {
        id: 'tmpl_stop_hook',
        type: 'hook',
        position: { x: 1000, y: 100 },
        data: {
          ...createHookData(),
          label: 'Notify on Complete',
          event: 'Stop',
          matcher: '*',
          command: 'osascript -e \'display notification "Deploy complete" with title "Claude Code"\'',
          decision: { type: 'none', reason: '', modifyInput: false },
        },
      },
    ],
    edges: [
      { id: 'tmpl_d1', source: 'tmpl_session_hook', sourceHandle: 'out_context', target: 'tmpl_deploy_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'context' } },
      { id: 'tmpl_d2', source: 'tmpl_deploy_skill', sourceHandle: 'out_delegation', target: 'tmpl_test_agent', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_d3', source: 'tmpl_deploy_skill', sourceHandle: 'out_exec', target: 'tmpl_test_agent', targetHandle: 'in_exec', type: 'typed', animated: true, data: { pinType: 'exec' } },
      { id: 'tmpl_d4', source: 'tmpl_bash_guard', sourceHandle: 'out_decision', target: 'tmpl_test_agent', targetHandle: 'in_trigger', type: 'typed', data: { pinType: 'decision' } },
      { id: 'tmpl_d5', source: 'tmpl_test_agent', sourceHandle: 'out_exec', target: 'tmpl_stop_hook', targetHandle: 'in_trigger', type: 'typed', data: { pinType: 'trigger' } },
    ],
  },
};
```

### Template 4: "Starter Config"

```typescript
const starterConfig: Template = {
  id: 'starter',
  name: 'Starter Config',
  description: 'Minimal starting point with project rules and one skill',
  icon: '🚀',
  category: 'starter',
  graph: {
    nodes: [
      {
        id: 'tmpl_starter_rules',
        type: 'rules',
        position: { x: 0, y: 100 },
        data: {
          ...createRulesData(),
          label: 'Project Rules',
          content: '# My Project\n\n## Tech Stack\n- \n\n## Conventions\n- \n\n## Commands\n- Build: `npm run build`\n- Test: `npm test`\n- Lint: `npm run lint`',
        },
      },
      {
        id: 'tmpl_starter_skill',
        type: 'skill',
        position: { x: 400, y: 100 },
        data: {
          ...createSkillData(),
          label: 'My First Skill',
          frontmatter: {
            name: 'my-skill',
            description: 'Describe when this skill should be used',
            context: 'conversation',
            agent: 'inherit',
            allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Instructions\n\nDescribe what this skill does step by step.',
        },
      },
    ],
    edges: [
      { id: 'tmpl_s1', source: 'tmpl_starter_rules', sourceHandle: 'out_context', target: 'tmpl_starter_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'context' } },
    ],
  },
};
```

### Palette Integration

In `NodePalette.tsx`, add a "TEMPLATES" section below the node cards:

```tsx
<div className="mt-6">
  <h3 className="uppercase text-xs tracking-wider text-muted mb-3 px-3">Templates</h3>
  {TEMPLATES.map(template => (
    <button
      key={template.id}
      onClick={() => loadTemplate(template)}
      className="w-full text-left px-3 py-2 hover:bg-[var(--node-border)] rounded-md transition-colors"
    >
      <div className="flex items-center gap-2">
        <span>{template.icon}</span>
        <span className="text-sm text-primary">{template.name}</span>
      </div>
      <p className="text-xs text-muted mt-1 ml-7">{template.description}</p>
    </button>
  ))}
</div>
```

**Loading a template:**
1. Show confirmation dialog: "Load template? This will replace the current graph."
2. On confirm: call `store.importJSON()` with the template's graph data + auto-generated metadata
3. Call `fitView()` after loading

---

## 7. Undo/Redo

### Approach: Zustand temporal middleware

Install:
```bash
npm install zundo
```

### Integration with store

```typescript
import { temporal } from 'zundo';

// Wrap the store creation with temporal middleware
export const useGraphStore = create<GraphStore>()(
  temporal(
    (set, get) => ({
      // ... existing store implementation
    }),
    {
      // Only track node and edge changes (not UI state like selectedNodeId)
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        configName: state.configName,
      }),
      // Limit history size
      limit: 50,
      // Equality check to avoid duplicate history entries
      equality: (pastState, currentState) =>
        JSON.stringify(pastState) === JSON.stringify(currentState),
    }
  )
);
```

### Keyboard shortcuts

In `BlueprintCanvas.tsx` or `App.tsx`, add keyboard event listeners:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      useGraphStore.temporal.getState().undo();
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      useGraphStore.temporal.getState().redo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Toolbar buttons

Add Undo (lucide: `Undo2`) and Redo (lucide: `Redo2`) buttons to the Toolbar, left of Save.
Disable Undo when no past states. Disable Redo when no future states.

```typescript
const { undo, redo, pastStates, futureStates } = useGraphStore.temporal.getState();
// Or use the temporal hook:
const { undo, redo } = useGraphStore.temporal;
```

---

## 8. Extended Validation

### Add to `validation/validate.ts`

**New error checks:**
```typescript
// MCP Server with type "url" but empty url
if (node.type === 'mcp') {
  const data = node.data as McpNodeData;
  if (data.connection.type === 'url' && !data.connection.url.trim()) {
    results.push({ nodeId: node.id, level: 'error', message: 'MCP URL server must have a URL' });
  }
  if (data.connection.type === 'stdio' && !data.connection.command.trim()) {
    results.push({ nodeId: node.id, level: 'error', message: 'MCP stdio server must have a command' });
  }
  if (!data.serverName.trim()) {
    results.push({ nodeId: node.id, level: 'error', message: 'MCP server must have a name' });
  }
}

// Tool node with empty name
if (node.type === 'tool') {
  const data = node.data as ToolNodeData;
  if (!data.toolName.trim()) {
    results.push({ nodeId: node.id, level: 'error', message: 'Tool must have a name' });
  }
}

// Plugin with no children
if (node.type === 'plugin') {
  const children = nodes.filter(n => n.parentId === node.id);
  if (children.length === 0) {
    results.push({ nodeId: node.id, level: 'warning', message: 'Plugin has no children — consider adding skills, agents, or hooks' });
  }
}
```

**New semantic checks (warnings):**
```typescript
// Hook matcher doesn't match any connected tool
if (node.type === 'hook') {
  const data = node.data as HookNodeData;
  if (data.matcher && data.matcher !== '*') {
    const connectedToolNames = getConnectedToolNames(node.id, nodes, edges);
    if (connectedToolNames.length > 0 && !connectedToolNames.some(t => t.includes(data.matcher))) {
      results.push({
        nodeId: node.id,
        level: 'warning',
        message: `Hook matcher "${data.matcher}" doesn't match any connected tool`,
      });
    }
  }
}

// Circular delegation detection
const delegationCycles = detectCycles(nodes, edges, PinType.Delegation);
delegationCycles.forEach(cycle => {
  results.push({
    nodeId: cycle[0],
    level: 'warning',
    message: `Circular delegation detected: ${cycle.map(id => getNodeLabel(id, nodes)).join(' → ')}`,
  });
});

// Duplicate skill names
const skillNodes = nodes.filter(n => n.type === 'skill');
const skillNames = skillNodes.map(n => (n.data as SkillNodeData).frontmatter.name).filter(Boolean);
const duplicates = skillNames.filter((name, i) => skillNames.indexOf(name) !== i);
duplicates.forEach(name => {
  const dupeNodes = skillNodes.filter(n => (n.data as SkillNodeData).frontmatter.name === name);
  dupeNodes.forEach(n => {
    results.push({
      nodeId: n.id,
      level: 'warning',
      message: `Duplicate skill name "${name}" — will conflict in .claude/skills/`,
    });
  });
});
```

**Cycle detection helper:**
```typescript
function detectCycles(nodes: Node[], edges: Edge[], pinType: PinType): string[][] {
  const graph = new Map<string, string[]>();
  
  edges
    .filter(e => e.data?.pinType === pinType)
    .forEach(e => {
      const targets = graph.get(e.source) ?? [];
      targets.push(e.target);
      graph.set(e.source, targets);
    });

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    if (stack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    (graph.get(nodeId) ?? []).forEach(next => dfs(next, [...path]));

    stack.delete(nodeId);
  }

  nodes.forEach(n => {
    if (!visited.has(n.id)) dfs(n.id, []);
  });

  return cycles;
}
```

---

## 9. Updated Context Menu

Extend the existing right-click context menu with new options:

**On node right-click:**
- Delete node *(existing)*
- Duplicate node *(existing)*
- Disconnect all edges *(existing)*
- **Divider**
- Group into Plugin *(new — only if node is NOT already in a plugin)*
- Remove from Plugin *(new — only if node IS inside a plugin)*

**On canvas right-click:**
- Add Rules node
- Add Skill node
- Add Subagent node
- Add Hook node
- Add Tool node *(new)*
- Add MCP Server *(new)*
- Add Plugin *(new)*
- **Divider**
- Paste *(if clipboard has node data)*
- Select All
- Auto-layout *(new)*

---

## 10. Additional UI Improvements

### MiniMap node colors

Update the MiniMap to show node-type colors:

```tsx
<MiniMap
  nodeColor={(node) => NODE_COLORS[node.type as BlueprintNodeType]?.header ?? '#444'}
  maskColor="rgba(0, 0, 0, 0.7)"
  style={{ background: '#161b22', border: '1px solid #2d333b', borderRadius: 8 }}
/>
```

### Keyboard shortcuts summary

Add a small "?" button in the toolbar or status bar that shows a keyboard shortcut overlay:

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected nodes/edges |
| `Ctrl+A` | Select all |
| `Ctrl+S` | Save JSON |
| `Ctrl+D` | Duplicate selected node |
| `Escape` | Deselect all |

### Connection validation visual feedback

When dragging a connection from a pin:
- **Compatible target pins**: glow with their pin color, slightly enlarge
- **Incompatible target pins**: dim to 30% opacity
- **The dragged connection line**: uses the color of the source pin type

This can be achieved using React Flow's `connectionLineStyle` prop and `isValidConnection` callback. For the pin dimming effect, use a CSS class toggled during connection dragging:

```css
.react-flow__handle--connecting-incompatible {
  opacity: 0.3;
  pointer-events: none;
}
```

---

## Deliverables Checklist — Phase 2

When implementation is complete, verify:

**New nodes:**
- [ ] Tool node renders with orange header, wrench icon, compact/expanded views
- [ ] MCP Server node renders with cyan header, plug icon, conditional connection fields
- [ ] Plugin node renders as a dashed rose container that can hold child nodes
- [ ] Dragging nodes into/out of Plugin groups works correctly
- [ ] "Group into Plugin" context menu creates a Plugin around selected nodes
- [ ] "Remove from Plugin" detaches a node from its parent plugin
- [ ] All 3 new node types have working Properties Panel editors
- [ ] All 3 new node types appear in the Node Palette

**Auto-layout:**
- [ ] Clicking Auto-layout arranges nodes using dagre (LR direction by default)
- [ ] Direction picker works (TB, LR, RL, BT)
- [ ] Layout animates smoothly (0.3s transition)
- [ ] Plugin children are excluded from layout (keep relative positions)
- [ ] fitView is called after layout

**Templates:**
- [ ] 4 templates visible in palette under "TEMPLATES" section
- [ ] Clicking a template shows confirmation dialog
- [ ] Loading a template replaces the graph and calls fitView
- [ ] Template nodes and edges render correctly with all data populated

**Undo/Redo:**
- [ ] Ctrl+Z undoes the last graph change
- [ ] Ctrl+Y / Ctrl+Shift+Z redoes
- [ ] Toolbar buttons reflect available undo/redo states (disabled when empty)
- [ ] History limited to 50 entries
- [ ] UI state (selected node) is NOT tracked in history

**Extended validation:**
- [ ] MCP validation rules fire correctly
- [ ] Tool validation rules fire correctly
- [ ] Empty Plugin warning works
- [ ] Circular delegation detection works
- [ ] Duplicate skill name detection works
- [ ] Hook matcher mismatch warning works

**Context menu:**
- [ ] New node types available in canvas right-click menu
- [ ] "Group into Plugin" and "Remove from Plugin" options work
- [ ] "Auto-layout" option in canvas menu

**Polish:**
- [ ] MiniMap colors match node types (including 3 new types)
- [ ] Keyboard shortcuts work (Ctrl+Z, Ctrl+Y, Delete, Ctrl+A, Ctrl+S)
- [ ] Connection dragging shows visual compatibility feedback
- [ ] All existing Phase 1 functionality still works unchanged
