# IMPLEMENTATION PROMPT: Claude Code Blueprint Editor — Phase 3 (Export & Polish)

## Context

Phase 1 (core MVP) and Phase 2 (expansion) are complete. The app has 7 node types, typed pins, auto-layout, templates, undo/redo, and extended validation.

Phase 3 is the final phase. It delivers the **export system** (graph → real `.claude/` file structure) and **polish features** that make the editor production-grade.

**CRITICAL**: Do NOT rewrite existing components. Extend them. The Phase 1 + Phase 2 codebase is stable — add new modules, extend the store, and wire into existing UI.

---

## Phase 3 Scope

### A. Export System (core deliverable)
1. **File System Exporter** — converts graph → `.claude/` directory structure as a downloadable ZIP
2. **YAML/Markdown generators** — produces valid SKILL.md, agent .md, settings.json, CLAUDE.md
3. **Import from `.claude/`** — parses an uploaded `.claude/` ZIP back into graph nodes + edges
4. **Export preview panel** — shows the generated file tree before downloading

### B. Polish Features
5. **Code editor upgrade** — Monaco-style editor for code fields (system prompts, instructions, commands)
6. **Search** — find nodes by name, type, or content
7. **Keyboard shortcuts panel** — discoverable shortcut overlay
8. **Connection animation flow** — visual execution simulation
9. **Node comments/notes** — sticky notes attached to nodes
10. **Zoom-to-fit selected** — double-click node in minimap or search result

---

## A1. File System Exporter

### Install

```bash
npm install jszip file-saver js-yaml
npm install -D @types/file-saver
```

### New File: `src/serialization/fileSystemExporter.ts`

This is the core module. It takes the graph state and produces a virtual file tree, then zips it.

```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { dump as yamlDump } from 'js-yaml';
import type { Node, Edge } from '@xyflow/react';

// --- Public API ---

export interface ExportedFile {
  path: string;        // e.g. ".claude/skills/pr-review/SKILL.md"
  content: string;     // file content
  type: 'yaml-md' | 'json' | 'markdown' | 'shell';
}

export function generateFileTree(nodes: Node[], edges: Edge[]): ExportedFile[] {
  const files: ExportedFile[] = [];

  // 1. CLAUDE.md files from Rules nodes
  files.push(...generateRulesFiles(nodes));

  // 2. Skill files
  files.push(...generateSkillFiles(nodes));

  // 3. Subagent files
  files.push(...generateSubagentFiles(nodes));

  // 4. settings.json (hooks, permissions)
  files.push(generateSettingsJson(nodes, edges));

  // 5. MCP config (if any MCP nodes exist)
  const mcpConfig = generateMcpConfig(nodes);
  if (mcpConfig) files.push(mcpConfig);

  return files;
}

export async function exportAsZip(files: ExportedFile[], configName: string): Promise<void> {
  const zip = new JSZip();
  
  files.forEach(file => {
    zip.file(file.path, file.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${slugify(configName)}.claude-config.zip`);
}
```

### Rules Files Generator

```typescript
function generateRulesFiles(nodes: Node[]): ExportedFile[] {
  const rulesNodes = nodes.filter(n => n.type === 'rules');
  
  return rulesNodes.map(node => {
    const data = node.data as RulesNodeData;
    const path = data.scope === 'root'
      ? 'CLAUDE.md'
      : `${data.path.replace(/^\//, '').replace(/\/$/, '')}/CLAUDE.md`;

    return {
      path,
      content: data.content,
      type: 'markdown' as const,
    };
  });
}
```

### Skill Files Generator

```typescript
function generateSkillFiles(nodes: Node[]): ExportedFile[] {
  const skillNodes = nodes.filter(n => n.type === 'skill');
  const files: ExportedFile[] = [];

  skillNodes.forEach(node => {
    const data = node.data as SkillNodeData;
    const skillName = data.frontmatter.name || slugify(data.label);
    const dirPath = `.claude/skills/${skillName}`;

    // Build YAML frontmatter
    const frontmatter: Record<string, unknown> = {
      name: data.frontmatter.name,
      description: data.frontmatter.description,
    };

    // Only include non-default values
    if (data.frontmatter.context !== 'conversation') {
      frontmatter.context = data.frontmatter.context;
    }
    if (data.frontmatter.context === 'fork' && data.frontmatter.agent !== 'inherit') {
      frontmatter.agent = data.frontmatter.agent;
    }
    if (data.frontmatter.allowedTools.length > 0) {
      frontmatter['allowed-tools'] = data.frontmatter.allowedTools.join(',');
    }
    if (data.frontmatter.model !== 'inherit') {
      frontmatter.model = data.frontmatter.model;
    }
    if (data.frontmatter.version && data.frontmatter.version !== '1.0.0') {
      frontmatter.version = data.frontmatter.version;
    }

    // Scoped hooks in frontmatter
    if (data.scopedHooks.length > 0) {
      frontmatter.hooks = {};
      data.scopedHooks.forEach(hook => {
        const hookEntry: Record<string, unknown> = {
          hooks: [{ type: hook.type, command: hook.command }],
        };
        if (hook.matcher) {
          hookEntry.matcher = hook.matcher;
        }
        (frontmatter.hooks as Record<string, unknown>)[hook.event] = [hookEntry];
      });
    }

    // Build the SKILL.md content
    const yamlBlock = yamlDump(frontmatter, { 
      lineWidth: -1,      // no line wrapping
      quotingType: '"',
      forceQuotes: false,
    }).trim();

    let content = `---\n${yamlBlock}\n---\n`;

    // Dynamic injections as comments/context
    if (data.dynamicInjections.length > 0) {
      content += '\n';
      data.dynamicInjections.forEach(injection => {
        content += `${injection}\n`;
      });
      content += '\n';
    }

    // Instructions body
    if (data.instructions) {
      content += `\n${data.instructions}\n`;
    }

    files.push({
      path: `${dirPath}/SKILL.md`,
      content,
      type: 'yaml-md',
    });

    // Reference files (create placeholders)
    data.referenceFiles.forEach(refFile => {
      files.push({
        path: `${dirPath}/${refFile}`,
        content: `# ${refFile}\n\n<!-- TODO: Add content for ${refFile} -->\n`,
        type: 'markdown',
      });
    });
  });

  return files;
}
```

### Subagent Files Generator

```typescript
function generateSubagentFiles(nodes: Node[]): ExportedFile[] {
  const agentNodes = nodes.filter(n => n.type === 'subagent');

  return agentNodes.map(node => {
    const data = node.data as SubagentNodeData;
    const agentName = data.name || slugify(data.label);

    // Build YAML frontmatter for agent
    const frontmatter: Record<string, unknown> = {};

    if (data.allowedTools.length > 0) {
      frontmatter['allowed-tools'] = data.allowedTools.join(',');
    }
    if (data.model !== 'inherit') {
      frontmatter.model = data.model;
    }
    if (data.maxTurns) {
      frontmatter['max-turns'] = data.maxTurns;
    }

    // Scoped hooks
    if (data.scopedHooks.length > 0) {
      frontmatter.hooks = {};
      data.scopedHooks.forEach(hook => {
        (frontmatter.hooks as Record<string, unknown>)[hook.event] = [{
          matcher: hook.matcher || undefined,
          hooks: [{ type: hook.type, command: hook.command }],
        }];
      });
    }

    const yamlBlock = yamlDump(frontmatter, { lineWidth: -1 }).trim();
    const hasFrontmatter = Object.keys(frontmatter).length > 0;

    let content = '';
    if (hasFrontmatter) {
      content += `---\n${yamlBlock}\n---\n\n`;
    }
    content += data.systemPrompt || `# ${data.label}\n\n<!-- Add system prompt -->`;

    return {
      path: `.claude/agents/${agentName}.md`,
      content,
      type: 'yaml-md' as const,
    };
  });
}
```

### Settings JSON Generator

```typescript
function generateSettingsJson(nodes: Node[], edges: Edge[]): ExportedFile {
  const hookNodes = nodes.filter(n => n.type === 'hook');
  const settings: Record<string, unknown> = {};

  if (hookNodes.length > 0) {
    const hooks: Record<string, unknown[]> = {};

    hookNodes.forEach(node => {
      const data = node.data as HookNodeData;
      const event = data.event;

      if (!hooks[event]) hooks[event] = [];

      const hookEntry: Record<string, unknown> = {
        hooks: [{
          type: data.hookType,
          command: data.command,
        }],
      };

      if (data.matcher && data.matcher !== '*') {
        hookEntry.matcher = data.matcher;
      }
      if (data.timeoutMs !== 60000) {
        hookEntry.timeout = data.timeoutMs;
      }

      hooks[event].push(hookEntry);
    });

    settings.hooks = hooks;
  }

  // Permission rules from Tool nodes connected to specific skills/agents
  const toolNodes = nodes.filter(n => n.type === 'tool');
  if (toolNodes.length > 0) {
    const permissions: unknown[] = [];
    toolNodes.forEach(node => {
      const data = node.data as ToolNodeData;
      if (data.pattern) {
        permissions.push({
          tool: data.toolName,
          pattern: data.pattern,
          permission: 'allow',
        });
      }
    });
    if (permissions.length > 0) {
      settings.permissions = permissions;
    }
  }

  return {
    path: '.claude/settings.json',
    content: JSON.stringify(settings, null, 2),
    type: 'json',
  };
}
```

### MCP Config Generator

```typescript
function generateMcpConfig(nodes: Node[]): ExportedFile | null {
  const mcpNodes = nodes.filter(n => n.type === 'mcp');
  if (mcpNodes.length === 0) return null;

  const mcpServers: Record<string, unknown> = {};

  mcpNodes.forEach(node => {
    const data = node.data as McpNodeData;
    const name = data.serverName || slugify(data.label);

    if (data.connection.type === 'url') {
      mcpServers[name] = {
        type: 'url',
        url: data.connection.url,
        ...(Object.keys(data.env).length > 0 && { env: data.env }),
      };
    } else {
      mcpServers[name] = {
        type: 'stdio',
        command: data.connection.command,
        args: data.connection.args,
        ...(Object.keys(data.env).length > 0 && { env: data.env }),
      };
    }
  });

  return {
    path: '.claude/settings.json',
    content: '', // Will be merged into the main settings.json
    type: 'json',
  };
}
```

**IMPORTANT**: MCP config should be MERGED into the same `.claude/settings.json` rather than creating a separate file. Refactor `generateSettingsJson` to accept MCP nodes too:

```typescript
function generateSettingsJson(nodes: Node[], edges: Edge[]): ExportedFile {
  const settings: Record<string, unknown> = {};

  // ... hooks section (same as above) ...
  // ... permissions section (same as above) ...

  // MCP servers section
  const mcpNodes = nodes.filter(n => n.type === 'mcp');
  if (mcpNodes.length > 0) {
    const mcpServers: Record<string, unknown> = {};
    mcpNodes.forEach(node => {
      const data = node.data as McpNodeData;
      const name = data.serverName || slugify(data.label);
      if (data.connection.type === 'url') {
        mcpServers[name] = {
          type: 'url',
          url: data.connection.url,
          ...(Object.keys(data.env).length > 0 && { env: data.env }),
        };
      } else {
        mcpServers[name] = {
          type: 'stdio',
          command: data.connection.command,
          args: data.connection.args,
          ...(Object.keys(data.env).length > 0 && { env: data.env }),
        };
      }
    });
    settings.mcpServers = mcpServers;
  }

  return {
    path: '.claude/settings.json',
    content: JSON.stringify(settings, null, 2),
    type: 'json',
  };
}
```

So remove the separate `generateMcpConfig` function entirely. One unified `generateSettingsJson` handles hooks + permissions + MCP.

### Utility

```typescript
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
```

---

## A2. Import from `.claude/` ZIP

### New File: `src/serialization/fileSystemImporter.ts`

```typescript
import JSZip from 'jszip';
import { load as yamlLoad } from 'js-yaml';
import type { Node, Edge } from '@xyflow/react';

export interface ImportResult {
  nodes: Node[];
  edges: Edge[];
  warnings: string[];
}

export async function importFromZip(file: File): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(file);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const warnings: string[] = [];
  
  let yOffset = 0;
  const Y_STEP = 250;
  const X_POSITIONS = { rules: 0, skill: 400, agent: 800, hook: 1200 };

  // 1. Parse CLAUDE.md files
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const filename = path.split('/').pop();

    if (filename === 'CLAUDE.md') {
      const content = await zipEntry.async('string');
      const isRoot = path === 'CLAUDE.md' || path.split('/').length <= 2;
      nodes.push({
        id: generateId(),
        type: 'rules',
        position: { x: X_POSITIONS.rules, y: yOffset },
        data: {
          ...createRulesData(),
          label: isRoot ? 'CLAUDE.md' : path.replace('/CLAUDE.md', ''),
          scope: isRoot ? 'root' : 'subfolder',
          path: isRoot ? '/' : '/' + path.replace('/CLAUDE.md', ''),
          content,
        },
      });
      yOffset += Y_STEP;
    }
  }

  // 2. Parse skills (SKILL.md files)
  yOffset = 0;
  const skillPaths = Object.keys(zip.files).filter(p => p.endsWith('SKILL.md'));
  
  for (const skillPath of skillPaths) {
    const content = await zip.files[skillPath].async('string');
    const parsed = parseSkillMd(content);
    
    if (parsed) {
      nodes.push({
        id: generateId(),
        type: 'skill',
        position: { x: X_POSITIONS.skill, y: yOffset },
        data: {
          ...createSkillData(),
          label: parsed.frontmatter.name || skillPath.split('/').slice(-2, -1)[0],
          frontmatter: {
            name: parsed.frontmatter.name ?? '',
            description: parsed.frontmatter.description ?? '',
            context: parsed.frontmatter.context ?? 'conversation',
            agent: parsed.frontmatter.agent ?? 'inherit',
            allowedTools: parseAllowedTools(parsed.frontmatter['allowed-tools']),
            model: parsed.frontmatter.model ?? 'inherit',
            version: parsed.frontmatter.version ?? '1.0.0',
          },
          scopedHooks: parseScopedHooks(parsed.frontmatter.hooks),
          instructions: parsed.body,
          dynamicInjections: extractDynamicInjections(parsed.body),
          referenceFiles: findReferenceFiles(zip, skillPath),
        },
      });
      yOffset += Y_STEP;
    } else {
      warnings.push(`Could not parse skill: ${skillPath}`);
    }
  }

  // 3. Parse agents (.claude/agents/*.md)
  yOffset = 0;
  const agentPaths = Object.keys(zip.files).filter(
    p => p.includes('.claude/agents/') && p.endsWith('.md')
  );
  
  for (const agentPath of agentPaths) {
    const content = await zip.files[agentPath].async('string');
    const parsed = parseFrontmatterMd(content);
    const agentName = agentPath.split('/').pop()?.replace('.md', '') ?? 'agent';

    nodes.push({
      id: generateId(),
      type: 'subagent',
      position: { x: X_POSITIONS.agent, y: yOffset },
      data: {
        ...createSubagentData(),
        label: agentName,
        name: agentName,
        allowedTools: parseAllowedTools(parsed.frontmatter?.['allowed-tools']),
        model: parsed.frontmatter?.model ?? 'inherit',
        maxTurns: parsed.frontmatter?.['max-turns'] ?? null,
        systemPrompt: parsed.body,
        scopedHooks: parseScopedHooks(parsed.frontmatter?.hooks),
      },
    });
    yOffset += Y_STEP;
  }

  // 4. Parse settings.json (hooks + MCP)
  const settingsPath = Object.keys(zip.files).find(
    p => p.endsWith('settings.json') || p.endsWith('.claude/settings.json')
  );
  
  if (settingsPath) {
    const content = await zip.files[settingsPath].async('string');
    try {
      const settings = JSON.parse(content);
      
      // Parse hooks
      yOffset = 0;
      if (settings.hooks) {
        for (const [event, hookEntries] of Object.entries(settings.hooks)) {
          for (const entry of hookEntries as any[]) {
            const hookData = entry.hooks?.[0];
            if (hookData) {
              nodes.push({
                id: generateId(),
                type: 'hook',
                position: { x: X_POSITIONS.hook, y: yOffset },
                data: {
                  ...createHookData(),
                  label: `${event}${entry.matcher ? ` (${entry.matcher})` : ''}`,
                  event: event as HookEvent,
                  matcher: entry.matcher ?? '*',
                  hookType: hookData.type ?? 'command',
                  command: hookData.command ?? '',
                  timeoutMs: entry.timeout ?? 60000,
                },
              });
              yOffset += Y_STEP;
            }
          }
        }
      }

      // Parse MCP servers
      if (settings.mcpServers) {
        let mcpY = 0;
        for (const [name, config] of Object.entries(settings.mcpServers)) {
          const mcpConfig = config as any;
          nodes.push({
            id: generateId(),
            type: 'mcp',
            position: { x: X_POSITIONS.hook + 400, y: mcpY },
            data: {
              ...createMcpData(),
              label: name,
              serverName: name,
              connection: {
                type: mcpConfig.type ?? 'url',
                url: mcpConfig.url ?? '',
                command: mcpConfig.command ?? '',
                args: mcpConfig.args ?? [],
              },
              env: mcpConfig.env ?? {},
            },
          });
          mcpY += Y_STEP;
        }
      }
    } catch {
      warnings.push('Could not parse settings.json');
    }
  }

  // 5. Auto-generate edges: connect Rules → Skills (context)
  const rulesNodes = nodes.filter(n => n.type === 'rules');
  const skillNodes = nodes.filter(n => n.type === 'skill');
  
  if (rulesNodes.length > 0 && skillNodes.length > 0) {
    const rootRules = rulesNodes.find(n => (n.data as RulesNodeData).scope === 'root');
    if (rootRules) {
      skillNodes.forEach(skill => {
        edges.push({
          id: generateId(),
          source: rootRules.id,
          sourceHandle: 'out_context',
          target: skill.id,
          targetHandle: 'in_context',
          type: 'typed',
          data: { pinType: 'context' },
        });
      });
    }
  }

  return { nodes, edges, warnings };
}
```

### Frontmatter Parser Helper

```typescript
interface ParsedMd {
  frontmatter: Record<string, any>;
  body: string;
}

function parseFrontmatterMd(content: string): ParsedMd {
  const fmRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(fmRegex);
  
  if (match) {
    try {
      const frontmatter = yamlLoad(match[1]) as Record<string, any>;
      return { frontmatter: frontmatter ?? {}, body: match[2].trim() };
    } catch {
      return { frontmatter: {}, body: content };
    }
  }
  
  return { frontmatter: {}, body: content };
}

function parseSkillMd(content: string): ParsedMd | null {
  const parsed = parseFrontmatterMd(content);
  if (!parsed.frontmatter.name && !parsed.frontmatter.description) {
    return null; // Not a valid skill file
  }
  return parsed;
}

function parseAllowedTools(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function parseScopedHooks(raw: unknown): ScopedHook[] {
  if (!raw || typeof raw !== 'object') return [];
  const hooks: ScopedHook[] = [];
  for (const [event, entries] of Object.entries(raw as Record<string, any>)) {
    if (Array.isArray(entries)) {
      entries.forEach((entry: any) => {
        const hookDef = entry.hooks?.[0];
        if (hookDef) {
          hooks.push({
            event: event as HookEvent,
            matcher: entry.matcher ?? '',
            type: hookDef.type ?? 'command',
            command: hookDef.command ?? '',
          });
        }
      });
    }
  }
  return hooks;
}

function extractDynamicInjections(body: string): string[] {
  const regex = /^!`[^`]+`$/gm;
  return (body.match(regex) ?? []);
}

function findReferenceFiles(zip: JSZip, skillPath: string): string[] {
  const dir = skillPath.substring(0, skillPath.lastIndexOf('/') + 1);
  return Object.keys(zip.files)
    .filter(p => p.startsWith(dir) && p !== skillPath && !zip.files[p].dir)
    .map(p => p.substring(dir.length));
}
```

---

## A3. Export Preview Panel

### New File: `src/components/ExportPreview/ExportPreview.tsx`

A modal/drawer that shows the generated file tree before downloading.

**Trigger**: Toolbar "Export" button (lucide: `FileArchive`) opens the preview.

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  Export Preview                              [✕]     │
├──────────────────┬──────────────────────────────────┤
│                  │                                    │
│  📁 File Tree    │  File Content Preview              │
│                  │                                    │
│  📄 CLAUDE.md    │  ┌──────────────────────────────┐  │
│  📁 .claude/     │  │ ---                          │  │
│    📁 skills/    │  │ name: pr-review              │  │
│      📁 pr-rev/  │  │ description: Review PRs      │  │
│        📄 SKILL  │  │ context: fork                │  │
│        📄 patt   │  │ agent: Explore               │  │
│    📁 agents/    │  │ ---                          │  │
│      📄 code-r   │  │                              │  │
│    📄 settings   │  │ ## Review Process            │  │
│                  │  │ 1. Check diff...             │  │
│                  │  └──────────────────────────────┘  │
│                  │                                    │
├──────────────────┴──────────────────────────────────┤
│  Validation: ✅ 5 files, 0 errors                    │
│                                                      │
│  [📋 Copy All] [💾 Download ZIP]   [Cancel]          │
└─────────────────────────────────────────────────────┘
```

**Implementation details:**

```typescript
interface ExportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}
```

State:
- `files: ExportedFile[]` — generated on open via `generateFileTree()`
- `selectedFile: string | null` — which file is selected in the tree (shows content on right)
- `exportErrors: string[]` — any generation errors

File tree rendering:
- Parse file paths into a tree structure
- Render as indented list with folder/file icons
- Folders: 📁 with expand/collapse
- Files: icon by type (📄 .md, ⚙️ .json, 🐚 .sh)
- Click a file to preview its content on the right

Content preview:
- Read-only display with monospace font
- Syntax highlighting by file type (basic — just color YAML frontmatter differently from markdown body)
- Line numbers on the left (subtle, muted color)

Actions:
- **Download ZIP**: calls `exportAsZip(files, configName)` → browser downloads
- **Copy All**: copies the selected file's content to clipboard
- **Cancel**: closes the modal

### File Tree Builder Utility

```typescript
interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: FileTreeNode[];
  content?: string;
  fileType?: string;
}

function buildFileTree(files: ExportedFile[]): FileTreeNode {
  const root: FileTreeNode = { name: '.', path: '', type: 'directory', children: [] };

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;

    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        // File
        current.children.push({
          name: part,
          path: file.path,
          type: 'file',
          children: [],
          content: file.content,
          fileType: file.type,
        });
      } else {
        // Directory
        let dir = current.children.find(c => c.name === part && c.type === 'directory');
        if (!dir) {
          dir = { name: part, path: parts.slice(0, i + 1).join('/'), type: 'directory', children: [] };
          current.children.push(dir);
        }
        current = dir;
      }
    });
  });

  // Sort: directories first, then files, alphabetically
  function sortTree(node: FileTreeNode) {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  }
  sortTree(root);

  return root;
}
```

---

## A4. Import UI

### Toolbar Integration

Add an "Import .claude/" button (lucide: `FolderInput`) next to the existing Load button.

**Flow:**
1. Click "Import .claude/" → opens file picker (accept=".zip")
2. Reads ZIP → calls `importFromZip(file)`
3. If `warnings.length > 0`, show a dialog listing warnings with "Continue anyway" / "Cancel"
4. On continue: show confirmation "This will replace the current graph"
5. Load nodes + edges into store
6. Run auto-layout (dagre LR) on imported nodes
7. Call `fitView()`

---

## B5. Code Editor Upgrade

### Approach: CodeMirror-style textarea enhancement

Full Monaco is too heavy for this app. Instead, build an enhanced textarea component with:
- Monospace font (JetBrains Mono)
- Line numbers
- Tab key inserts 2 spaces (not focus-change)
- Basic syntax highlighting for YAML frontmatter blocks and markdown headers
- Auto-resize to content

### New File: `src/components/shared/CodeEditor.tsx`

```typescript
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'markdown' | 'yaml' | 'shell' | 'json';
  minLines?: number;    // default: 4
  maxLines?: number;    // default: 20
  placeholder?: string;
  readOnly?: boolean;
}
```

**Implementation:**
- Render a `<div>` container with two layers:
  1. **Highlight layer** (behind): `<pre>` with syntax-colored spans, `pointer-events: none`
  2. **Input layer** (front): `<textarea>` with transparent background, monospace font
- Both layers use identical font, padding, line-height so text overlaps perfectly
- Line numbers: a narrow gutter `<div>` on the left that counts `\n` in the value

**Syntax highlighting (basic, regex-based):**

For markdown:
- `^#{1,6}\s.+` → header color (bright white)
- `^---$` → frontmatter delimiter (muted)
- `` `[^`]+` `` → inline code (green)
- `^\s*-\s` → list items (blue)
- `^>\s` → blockquote (yellow)

For YAML:
- `^[a-zA-Z-]+:` → key (cyan)
- `"[^"]*"` or `'[^']*'` → string value (green)
- `#.*$` → comment (muted)
- `true|false|null` → keyword (orange)

For shell:
- `^#.*$` → comment (muted)
- `\$[A-Z_]+` → variable (orange)
- `"[^"]*"` or `'[^']*'` → string (green)
- `&&|\|\||;|>|>>|<|\|` → operator (red)

**Tab handling:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + '  ' + value.substring(end);
    onChange(newValue);
    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    });
  }
};
```

### Integration

Replace all textarea inputs for these fields with `<CodeEditor>`:
- Skill `instructions` → `language="markdown"`
- Skill `dynamicInjections` (each item) → `language="shell"`
- Subagent `systemPrompt` → `language="markdown"`
- Hook `command` → `language="shell"`
- Rules `content` → `language="markdown"`
- Plugin `installScript` → `language="shell"`
- MCP `env` values → keep as simple inputs (too short for code editor)

Apply in BOTH the Properties Panel editors AND the expanded inline node views.

---

## B6. Search

### New File: `src/components/Search/SearchOverlay.tsx`

A command-palette style search (like VS Code Ctrl+K or Spotlight).

**Trigger**: 
- Toolbar search button (lucide: `Search`)
- Keyboard shortcut: `Ctrl+K` or `/`

**UI:**
```
┌─────────────────────────────────────────┐
│  🔍  Search nodes...              [Esc]  │
├─────────────────────────────────────────┤
│  ⚡ PR Review          Skill            │  ← matching results
│  🤖 Code Reviewer      Subagent         │
│  🪝 PreToolUse(Bash)   Hook             │
│                                          │
│  "pr" found in 3 nodes                   │
└─────────────────────────────────────────┘
```

**Search scope:**
- `data.label` (primary)
- `data.frontmatter?.name` (for skills)
- `data.frontmatter?.description` (for skills)
- `data.name` (for subagents)
- `data.systemPrompt` (for subagents — deep search)
- `data.instructions` (for skills — deep search)
- `data.event` + `data.matcher` (for hooks)
- `data.serverName` (for MCP)
- `data.content` (for rules — deep search)
- Node type name

**Behavior:**
- Fuzzy-ish matching: case-insensitive substring search across all searchable fields
- Results sorted: label matches first, then content matches
- Each result shows: icon + label + type badge + matched field excerpt (truncated)
- Arrow keys to navigate results, Enter to select
- On select: close overlay, select the node in store, center viewport on the node

**Viewport centering:**
```typescript
import { useReactFlow } from '@xyflow/react';

const { setCenter, getZoom } = useReactFlow();

function focusNode(nodeId: string) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;
  
  const x = node.position.x + (node.measured?.width ?? 300) / 2;
  const y = node.position.y + (node.measured?.height ?? 200) / 2;
  
  setCenter(x, y, { zoom: getZoom(), duration: 300 });
  selectNode(nodeId);
}
```

---

## B7. Keyboard Shortcuts Panel

### New File: `src/components/shared/ShortcutsOverlay.tsx`

Triggered by "?" button in StatusBar or `Shift+?` keyboard shortcut.

**UI**: a centered modal with a two-column layout:

```
┌─────────────────────────────────────────────┐
│  Keyboard Shortcuts                   [✕]    │
├──────────────────────┬──────────────────────┤
│  General             │  Canvas              │
│                      │                      │
│  Ctrl+S    Save      │  Delete    Remove    │
│  Ctrl+Z    Undo      │  Ctrl+A   Select all │
│  Ctrl+Y    Redo      │  Ctrl+D   Duplicate  │
│  Ctrl+K    Search    │  Space    Pan mode   │
│  ?         Shortcuts │  Scroll   Zoom       │
│  Escape    Deselect  │  F        Fit view   │
│                      │                      │
│  Export              │  Nodes               │
│                      │                      │
│  Ctrl+E    Export    │  E        Expand     │
│  Ctrl+I    Import    │  C        Collapse   │
│                      │  Ctrl+G   Group      │
└──────────────────────┴──────────────────────┘
```

Styled with the same dark theme, monospace key badges (like `<kbd>` elements), muted descriptions.

### Implement all listed shortcuts

Add to the global keydown handler in App.tsx:

```typescript
// Extend existing keyboard handler
switch (true) {
  case (meta && key === 's'):    save(); break;
  case (meta && key === 'z' && !shift): undo(); break;
  case (meta && key === 'z' && shift):  redo(); break;
  case (meta && key === 'y'):    redo(); break;
  case (meta && key === 'k'):    openSearch(); break;
  case (meta && key === 'e'):    openExportPreview(); break;
  case (meta && key === 'i'):    openImport(); break;
  case (meta && key === 'g'):    groupIntoPlugin(); break;
  case (meta && key === 'd'):    duplicateSelected(); break;
  case (meta && key === 'a'):    selectAll(); break;
  case (key === 'Escape'):       deselectAll(); break;
  case (key === 'f'):            fitView(); break;
  case (key === 'e' && !meta):   expandSelected(); break;
  case (key === 'c' && !meta):   collapseSelected(); break;
  case (key === '?'):            toggleShortcuts(); break;
  case (key === '/'):            openSearch(); break;
}
```

**IMPORTANT**: Only handle shortcuts when no input/textarea is focused. Check `document.activeElement` tag:
```typescript
const tag = (document.activeElement?.tagName ?? '').toLowerCase();
if (['input', 'textarea', 'select'].includes(tag)) return;
```

---

## B8. Connection Animation Flow

### New Feature: Execution Simulation

A "play" button that visually animates the execution flow through the graph.

**Trigger**: Toolbar button (lucide: `Play`) — only enabled when exec edges exist.

**Behavior:**
1. Find all nodes with no incoming exec edges (entry points)
2. Starting from each entry point, follow outgoing exec edges
3. Animate each node in sequence:
   - Highlight current node with a bright glow pulse (2 cycles, ~1s)
   - Animate the outgoing exec edge with a visible traveling dot
   - Move to the next node
4. For parallel branches (delegation from one skill to multiple subagents), animate simultaneously
5. At the end, show a brief "✓ Flow complete" toast

**Implementation approach:**

```typescript
// New store state
simulationActive: boolean;
simulationHighlightedNodeId: string | null;
simulationHighlightedEdgeIds: string[];

// Start simulation
async function runSimulation() {
  set({ simulationActive: true });
  
  const execEdges = get().edges.filter(e => e.data?.pinType === 'exec');
  const entryNodes = findEntryNodes(get().nodes, execEdges);
  
  for (const entryId of entryNodes) {
    await animateFromNode(entryId, execEdges);
  }
  
  set({ simulationActive: false, simulationHighlightedNodeId: null, simulationHighlightedEdgeIds: [] });
}

async function animateFromNode(nodeId: string, execEdges: Edge[]) {
  // Highlight node
  set({ simulationHighlightedNodeId: nodeId });
  await delay(800);

  // Find outgoing exec edges
  const outgoing = execEdges.filter(e => e.source === nodeId);
  
  // Highlight edges
  set({ simulationHighlightedEdgeIds: outgoing.map(e => e.id) });
  await delay(400);

  // Recurse into targets (parallel if multiple)
  await Promise.all(
    outgoing.map(edge => animateFromNode(edge.target, execEdges))
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Visual:**
- Highlighted node: add a CSS class that applies a bright pulsing box-shadow
  ```css
  @keyframes sim-pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--glow-color); }
    50% { box-shadow: 0 0 20px 8px var(--glow-color); }
  }
  .simulation-active {
    animation: sim-pulse 0.5s ease-in-out 2;
  }
  ```
- Highlighted edge: temporarily increase stroke-width to 4px and add a traveling dot:
  ```css
  @keyframes traveling-dot {
    from { stroke-dashoffset: 100; }
    to { stroke-dashoffset: 0; }
  }
  .simulation-edge {
    stroke-width: 4;
    stroke-dasharray: 4 96;
    animation: traveling-dot 0.4s linear;
  }
  ```

**Stop button**: while simulation is running, the Play button becomes a Stop button (lucide: `Square`). Clicking it sets `simulationActive = false` and clears highlights.

---

## B9. Node Comments/Notes

### New Feature: Sticky Notes

Small yellow note cards that can be attached to any node or placed freely on the canvas.

**Implementation**: This is a new node type `comment`.

```typescript
// Add to BlueprintNodeType
export type BlueprintNodeType = 'rules' | 'skill' | 'subagent' | 'hook' | 'tool' | 'mcp' | 'plugin' | 'comment';
```

### New File: `src/components/Nodes/CommentNode.tsx`

**Visual:**
- Yellow-ish background (#fef9c3 with 90% opacity, or dark variant: #422006 with 80%)
- No pins — comments don't connect to anything
- Resizable (drag bottom-right corner)
- Simple textarea as content
- Small font size
- Subtle drop shadow
- Slightly rotated (-1 to 1 degree random) for sticky-note feel

```typescript
export interface CommentNodeData extends BaseNodeData {
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';  // user can pick
  width: number;
  height: number;
}

export function createCommentData(): CommentNodeData {
  return {
    label: '',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    content: '',
    color: 'yellow',
    width: 200,
    height: 120,
  };
}
```

**Color palette for notes:**
```typescript
const COMMENT_COLORS = {
  yellow: { bg: '#fef9c320', border: '#eab30840', text: '#fbbf24' },
  blue:   { bg: '#dbeafe20', border: '#3b82f640', text: '#60a5fa' },
  green:  { bg: '#dcfce720', border: '#22c55e40', text: '#4ade80' },
  pink:   { bg: '#fce7f320', border: '#ec489940', text: '#f472b6' },
};
```

**Palette**: add a small "📝 Note" card at the bottom of the palette, separated from the main node types.

**Context menu**: right-click on a comment → "Change color" submenu with 4 options.

**IMPORTANT**: Comment nodes are excluded from:
- Validation
- Export (both JSON graph export and file system export)
- Auto-layout (keep wherever user placed them)
- Simulation

---

## B10. Zoom-to-Fit Selected

### Double-click in MiniMap

Override MiniMap node click to center on that node:

```typescript
<MiniMap
  onNodeClick={(_event, node) => {
    focusNode(node.id);
    selectNode(node.id);
  }}
  // ... existing props
/>
```

### Double-click on node header

In BaseNode, double-clicking the header area triggers `fitView` on just that node:

```typescript
const { fitView } = useReactFlow();

const handleDoubleClick = () => {
  fitView({
    nodes: [{ id: nodeId }],
    padding: 0.5,
    duration: 300,
  });
};
```

---

## Updated Toolbar Layout

The toolbar now has more buttons. Organize them in groups:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◆ Claude Blueprint     │ File          │ Edit          │ View     │ Run   │
│                        │ 💾 Save       │ ↩ Undo       │ 🔍 Search│ ▶ Play│
│  Untitled Blueprint    │ 📂 Load       │ ↪ Redo       │ 📐 Layout│       │
│  7 nodes · 5 edges     │ 📥 Import     │ 🗑 Clear     │ ? Help   │       │
│                        │ 📤 Export     │              │          │       │
└────────────────────────────────────────────────────────────────────────────┘
```

Group separators: thin vertical line `border-right: 1px solid var(--node-border)`.

Button tooltips: add `title` attributes with shortcut info, e.g. `title="Save (Ctrl+S)"`.

---

## Deliverables Checklist — Phase 3

**Export:**
- [ ] "Export" button opens the Export Preview modal
- [ ] File tree renders correctly with expand/collapse directories
- [ ] Clicking a file shows its content in the preview pane
- [ ] CLAUDE.md files generated with correct content from Rules nodes
- [ ] SKILL.md files have valid YAML frontmatter + markdown body
- [ ] Agent .md files have frontmatter (if config present) + system prompt
- [ ] settings.json contains hooks, permissions, and MCP servers
- [ ] "Download ZIP" produces a valid .zip with correct file structure
- [ ] Reference file placeholders created for skills
- [ ] Non-default values only: clean YAML without inherit/default clutter

**Import:**
- [ ] "Import .claude/" button accepts .zip files
- [ ] CLAUDE.md files parsed into Rules nodes
- [ ] SKILL.md files parsed into Skill nodes with frontmatter + body
- [ ] Agent .md files parsed into Subagent nodes
- [ ] settings.json hooks parsed into Hook nodes
- [ ] settings.json MCP servers parsed into MCP nodes
- [ ] Warnings shown for unparseable files
- [ ] Auto-layout applied after import
- [ ] Confirmation dialog before replacing graph

**Code Editor:**
- [ ] CodeEditor component renders with line numbers and monospace font
- [ ] Tab inserts 2 spaces
- [ ] Basic syntax highlighting for markdown, YAML, shell
- [ ] Auto-resizes to content (within min/max lines)
- [ ] Integrated into all relevant fields in Properties Panel and inline views

**Search:**
- [ ] Ctrl+K opens search overlay
- [ ] Types to filter nodes by label, name, description, content
- [ ] Arrow keys navigate results, Enter selects
- [ ] Selecting a result centers viewport on the node and selects it
- [ ] Escape closes search

**Keyboard Shortcuts:**
- [ ] All documented shortcuts work (Ctrl+S, E, I, K, D, G, A, Z, Y, F, ?, Escape)
- [ ] Shortcuts suppressed when input/textarea is focused
- [ ] Shortcuts overlay shows all available shortcuts

**Simulation:**
- [ ] Play button starts execution flow animation
- [ ] Nodes highlight in sequence following exec edges
- [ ] Edges animate with traveling dot effect
- [ ] Parallel branches animate simultaneously
- [ ] Stop button halts simulation and clears highlights

**Comments:**
- [ ] Comment nodes create from palette or context menu
- [ ] Yellow sticky-note appearance with optional color change
- [ ] Resizable, editable content
- [ ] Excluded from validation, export, layout, simulation

**Polish:**
- [ ] Toolbar reorganized into logical groups
- [ ] MiniMap click centers on node
- [ ] Double-click node header fits view to that node
- [ ] All existing Phase 1 + Phase 2 functionality intact
