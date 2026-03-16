# Phase 3: Export & Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add file system export/import (graph → `.claude/` ZIP), code editor upgrade, search, keyboard shortcuts, simulation animation, comment nodes, and toolbar reorganization.

**Architecture:** Extend existing store/components — no rewrites. New modules: `src/serialization/fileSystemExporter.ts`, `src/serialization/fileSystemImporter.ts`, `src/components/ExportPreview/`, `src/components/Search/`, `src/components/shared/CodeEditor.tsx`, `src/components/shared/ShortcutsOverlay.tsx`, `src/components/Nodes/CommentNode.tsx`. Store gets new state fields for simulation and UI overlays.

**Tech Stack:** JSZip, file-saver, js-yaml (new deps). Existing: React 19, @xyflow/react 12, Zustand 5, Lucide, Tailwind 4.

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install production + dev deps**

Run:
```bash
npm install jszip file-saver js-yaml
npm install -D @types/file-saver
```

**Step 2: Verify installation**

Run: `npm ls jszip file-saver js-yaml`
Expected: Three packages listed without errors.

**Step 3: Verify build still works**

Run: `npm run build`
Expected: Build succeeds with no errors.

---

## Task 2: File System Exporter

**Files:**
- Create: `src/serialization/fileSystemExporter.ts`

**Step 1: Create the exporter module**

This module converts graph nodes/edges into a virtual file tree and exports as ZIP.

```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { dump as yamlDump } from 'js-yaml';
import type { Node, Edge } from '@xyflow/react';
import type {
  RulesNodeData,
  SkillNodeData,
  SubagentNodeData,
  HookNodeData,
  ToolNodeData,
  McpNodeData,
  HookEvent,
} from '../types/nodes';

export interface ExportedFile {
  path: string;
  content: string;
  type: 'yaml-md' | 'json' | 'markdown' | 'shell';
}

export function generateFileTree(nodes: Node[], edges: Edge[]): ExportedFile[] {
  const files: ExportedFile[] = [];
  files.push(...generateRulesFiles(nodes));
  files.push(...generateSkillFiles(nodes));
  files.push(...generateSubagentFiles(nodes));
  files.push(generateSettingsJson(nodes, edges));
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

function generateRulesFiles(nodes: Node[]): ExportedFile[] {
  const rulesNodes = nodes.filter(n => n.type === 'rules');
  return rulesNodes.map(node => {
    const data = node.data as RulesNodeData;
    const path = data.scope === 'root'
      ? 'CLAUDE.md'
      : `${data.path.replace(/^\//, '').replace(/\/$/, '')}/CLAUDE.md`;
    return { path, content: data.content, type: 'markdown' as const };
  });
}

function generateSkillFiles(nodes: Node[]): ExportedFile[] {
  const skillNodes = nodes.filter(n => n.type === 'skill');
  const files: ExportedFile[] = [];

  skillNodes.forEach(node => {
    const data = node.data as SkillNodeData;
    const skillName = data.frontmatter.name || slugify(data.label);
    const dirPath = `.claude/skills/${skillName}`;

    const frontmatter: Record<string, unknown> = {
      name: data.frontmatter.name,
      description: data.frontmatter.description,
    };
    if (data.frontmatter.context !== 'conversation') frontmatter.context = data.frontmatter.context;
    if (data.frontmatter.context === 'fork' && data.frontmatter.agent !== 'inherit') frontmatter.agent = data.frontmatter.agent;
    if (data.frontmatter.allowedTools.length > 0) frontmatter['allowed-tools'] = data.frontmatter.allowedTools.join(',');
    if (data.frontmatter.model !== 'inherit') frontmatter.model = data.frontmatter.model;
    if (data.frontmatter.version && data.frontmatter.version !== '1.0.0') frontmatter.version = data.frontmatter.version;

    if (data.scopedHooks.length > 0) {
      frontmatter.hooks = {};
      data.scopedHooks.forEach(hook => {
        const hookEntry: Record<string, unknown> = {
          hooks: [{ type: hook.type, command: hook.command }],
        };
        if (hook.matcher) hookEntry.matcher = hook.matcher;
        (frontmatter.hooks as Record<string, unknown>)[hook.event] = [hookEntry];
      });
    }

    const yamlBlock = yamlDump(frontmatter, { lineWidth: -1, quotingType: '"', forceQuotes: false }).trim();
    let content = `---\n${yamlBlock}\n---\n`;
    if (data.dynamicInjections.length > 0) {
      content += '\n';
      data.dynamicInjections.forEach(injection => { content += `${injection}\n`; });
      content += '\n';
    }
    if (data.instructions) content += `\n${data.instructions}\n`;

    files.push({ path: `${dirPath}/SKILL.md`, content, type: 'yaml-md' });
    data.referenceFiles.forEach(refFile => {
      files.push({ path: `${dirPath}/${refFile}`, content: `# ${refFile}\n\n<!-- TODO: Add content for ${refFile} -->\n`, type: 'markdown' });
    });
  });

  return files;
}

function generateSubagentFiles(nodes: Node[]): ExportedFile[] {
  const agentNodes = nodes.filter(n => n.type === 'subagent');
  return agentNodes.map(node => {
    const data = node.data as SubagentNodeData;
    const agentName = data.name || slugify(data.label);
    const frontmatter: Record<string, unknown> = {};
    if (data.allowedTools.length > 0) frontmatter['allowed-tools'] = data.allowedTools.join(',');
    if (data.model !== 'inherit') frontmatter.model = data.model;
    if (data.maxTurns) frontmatter['max-turns'] = data.maxTurns;
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
    if (hasFrontmatter) content += `---\n${yamlBlock}\n---\n\n`;
    content += data.systemPrompt || `# ${data.label}\n\n<!-- Add system prompt -->`;
    return { path: `.claude/agents/${agentName}.md`, content, type: 'yaml-md' as const };
  });
}

function generateSettingsJson(nodes: Node[], _edges: Edge[]): ExportedFile {
  const settings: Record<string, unknown> = {};

  // Hooks
  const hookNodes = nodes.filter(n => n.type === 'hook');
  if (hookNodes.length > 0) {
    const hooks: Record<string, unknown[]> = {};
    hookNodes.forEach(node => {
      const data = node.data as HookNodeData;
      if (!hooks[data.event]) hooks[data.event] = [];
      const hookEntry: Record<string, unknown> = {
        hooks: [{ type: data.hookType, command: data.command }],
      };
      if (data.matcher && data.matcher !== '*') hookEntry.matcher = data.matcher;
      if (data.timeoutMs !== 60000) hookEntry.timeout = data.timeoutMs;
      hooks[data.event].push(hookEntry);
    });
    settings.hooks = hooks;
  }

  // Permissions from Tool nodes
  const toolNodes = nodes.filter(n => n.type === 'tool');
  if (toolNodes.length > 0) {
    const permissions: unknown[] = [];
    toolNodes.forEach(node => {
      const data = node.data as ToolNodeData;
      if (data.pattern) {
        permissions.push({ tool: data.toolName, pattern: data.pattern, permission: 'allow' });
      }
    });
    if (permissions.length > 0) settings.permissions = permissions;
  }

  // MCP Servers
  const mcpNodes = nodes.filter(n => n.type === 'mcp');
  if (mcpNodes.length > 0) {
    const mcpServers: Record<string, unknown> = {};
    mcpNodes.forEach(node => {
      const data = node.data as McpNodeData;
      const name = data.serverName || slugify(data.label);
      if (data.connection.type === 'url') {
        mcpServers[name] = {
          type: 'url', url: data.connection.url,
          ...(Object.keys(data.env).length > 0 && { env: data.env }),
        };
      } else {
        mcpServers[name] = {
          type: 'stdio', command: data.connection.command, args: data.connection.args,
          ...(Object.keys(data.env).length > 0 && { env: data.env }),
        };
      }
    });
    settings.mcpServers = mcpServers;
  }

  return { path: '.claude/settings.json', content: JSON.stringify(settings, null, 2), type: 'json' };
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No errors (module is tree-shakeable, unused until wired in).

**Step 3: Commit**

```bash
git add src/serialization/fileSystemExporter.ts
git commit -m "feat: add file system exporter for graph → .claude/ ZIP"
```

---

## Task 3: File System Importer

**Files:**
- Create: `src/serialization/fileSystemImporter.ts`

**Step 1: Create the importer module**

```typescript
import JSZip from 'jszip';
import { load as yamlLoad } from 'js-yaml';
import type { Node, Edge } from '@xyflow/react';
import { generateId } from '../utils/idGenerator';
import {
  createRulesData,
  createSkillData,
  createSubagentData,
  createHookData,
  createMcpData,
} from '../constants/nodeDefaults';
import type {
  RulesNodeData,
  SkillNodeData,
  SubagentNodeData,
  HookNodeData,
  McpNodeData,
  HookEvent,
  ScopedHook,
} from '../types/nodes';

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

  // 2. Parse skills
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

  // 3. Parse agents
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

  // 4. Parse settings.json
  const settingsPath = Object.keys(zip.files).find(
    p => p.endsWith('settings.json') || p.endsWith('.claude/settings.json')
  );
  if (settingsPath) {
    const content = await zip.files[settingsPath].async('string');
    try {
      const settings = JSON.parse(content);
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

  // 5. Auto-generate edges: Rules → Skills
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

// --- Helpers ---

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
  if (!parsed.frontmatter.name && !parsed.frontmatter.description) return null;
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

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/serialization/fileSystemImporter.ts
git commit -m "feat: add file system importer for .claude/ ZIP → graph"
```

---

## Task 4: Export Preview Panel

**Files:**
- Create: `src/components/ExportPreview/ExportPreview.tsx`

**Step 1: Create the ExportPreview component**

A modal with a file tree on the left and file content preview on the right. File tree built from `ExportedFile[]`. Click a file to preview. Actions: Download ZIP, Copy, Cancel.

Key implementation details:
- `buildFileTree()` utility converts flat file paths into nested `FileTreeNode` structure
- Tree rendered as indented list with expand/collapse directories
- Content preview with monospace font and line numbers
- Validation summary in footer (file count, error count)
- `generateFileTree()` called on modal open
- `exportAsZip()` called on Download button

Interface:
```typescript
interface ExportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}
```

FileTreeNode:
```typescript
interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: FileTreeNode[];
  content?: string;
  fileType?: string;
}
```

Icons: `FileArchive` (trigger), `FolderOpen`/`Folder` (dirs), `File` (files), `Copy`, `Download`.

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/ExportPreview/ExportPreview.tsx
git commit -m "feat: add export preview modal with file tree and content viewer"
```

---

## Task 5: Comment Node Type

**Files:**
- Modify: `src/types/nodes.ts` — add `'comment'` to `BlueprintNodeType`, add `CommentNodeData`
- Modify: `src/constants/nodeDefaults.ts` — add `createCommentData()`, empty pin defs for comment
- Modify: `src/constants/theme.ts` — add comment node color
- Create: `src/components/Nodes/CommentNode.tsx`
- Modify: `src/components/Canvas/BlueprintCanvas.tsx` — register comment in `nodeTypes`
- Modify: `src/store/useGraphStore.ts` — add comment to `DATA_FACTORIES`
- Modify: `src/validation/validate.ts` — skip comment nodes
- Modify: `src/utils/layout.ts` — skip comment nodes in auto-layout

**Step 1: Add types and constants**

In `src/types/nodes.ts`:
- Add `'comment'` to `BlueprintNodeType` union
- Add:
```typescript
export interface CommentNodeData extends BaseNodeData {
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
  width: number;
  height: number;
}
```

In `src/constants/nodeDefaults.ts`:
- Add empty pin array: `comment: []`
- Add factory:
```typescript
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

In `src/constants/theme.ts`:
- Add: `comment: { header: '#eab308', dark: '#422006', glow: '#eab30830' }`

**Step 2: Create CommentNode component**

Create `src/components/Nodes/CommentNode.tsx`:
- Yellow sticky-note appearance (color based on `data.color`)
- No pins
- Editable textarea as content
- Resizable (CSS resize)
- Slight random rotation for sticky-note feel
- Color palette: yellow `#fef9c320`, blue `#dbeafe20`, green `#dcfce720`, pink `#fce7f320`

**Step 3: Register in canvas and store**

- `BlueprintCanvas.tsx`: import and add `comment: CommentNode` to `nodeTypes`
- `useGraphStore.ts`: add `comment: createCommentData` to `DATA_FACTORIES`
- Canvas context menu: add Comment option
- Palette: add Comment card (separated from main types)

**Step 4: Exclude from validation, export, and layout**

- `validate.ts`: filter out comment nodes at the start
- `layout.ts`: filter out comment nodes before running dagre
- `fileSystemExporter.ts`: filter out comment nodes in `generateFileTree`

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/types/nodes.ts src/constants/nodeDefaults.ts src/constants/theme.ts src/components/Nodes/CommentNode.tsx src/components/Canvas/BlueprintCanvas.tsx src/store/useGraphStore.ts src/validation/validate.ts src/utils/layout.ts
git commit -m "feat: add comment/sticky-note node type"
```

---

## Task 6: Code Editor Component

**Files:**
- Create: `src/components/shared/CodeEditor.tsx`

**Step 1: Create CodeEditor**

A dual-layer textarea with syntax highlighting overlay:
- Highlight layer: `<pre>` with syntax-colored spans, `pointer-events: none`
- Input layer: `<textarea>` with transparent background
- Line numbers gutter on the left
- Tab key inserts 2 spaces
- Auto-resize within min/max lines
- Monospace font (JetBrains Mono)

Props:
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

Syntax highlighting (regex-based):
- Markdown: headers, frontmatter delimiters, inline code, list items, blockquotes
- YAML: keys, strings, comments, booleans
- Shell: comments, variables, strings, operators
- JSON: keys, strings, numbers, booleans

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/shared/CodeEditor.tsx
git commit -m "feat: add CodeEditor component with syntax highlighting"
```

---

## Task 7: Integrate CodeEditor into Editors

**Files:**
- Modify: `src/components/PropertiesPanel/SkillEditor.tsx` — instructions → `language="markdown"`, dynamicInjections → `language="shell"`
- Modify: `src/components/PropertiesPanel/SubagentEditor.tsx` — systemPrompt → `language="markdown"`
- Modify: `src/components/PropertiesPanel/HookEditor.tsx` — command → `language="shell"`
- Modify: `src/components/PropertiesPanel/RulesEditor.tsx` — content → `language="markdown"`
- Modify: `src/components/PropertiesPanel/PluginEditor.tsx` — installScript → `language="shell"`

**Step 1: Replace textarea with CodeEditor in each editor**

Import `CodeEditor` from `../shared/CodeEditor` and replace `<textarea className="bp-textarea" ...>` with `<CodeEditor value={...} onChange={...} language="..." />` for the appropriate fields.

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/PropertiesPanel/
git commit -m "feat: integrate CodeEditor into all property panel editors"
```

---

## Task 8: Search Overlay

**Files:**
- Create: `src/components/Search/SearchOverlay.tsx`

**Step 1: Create SearchOverlay**

Command-palette style search (like VS Code Ctrl+K):
- Input field with search icon
- Results list with icon + label + type badge + matched field excerpt
- Fuzzy-ish: case-insensitive substring across all searchable fields
- Results sorted: label matches first, then content matches
- Arrow keys navigate, Enter selects, Escape closes
- On select: close overlay, select node, center viewport on node

Search scope per node type:
- All: `data.label`, node type name
- Skill: `frontmatter.name`, `frontmatter.description`, `instructions`
- Subagent: `data.name`, `systemPrompt`
- Hook: `data.event`, `data.matcher`
- MCP: `data.serverName`
- Rules: `data.content`

Viewport centering:
```typescript
const { setCenter, getZoom } = useReactFlow();
const x = node.position.x + (node.measured?.width ?? 300) / 2;
const y = node.position.y + (node.measured?.height ?? 200) / 2;
setCenter(x, y, { zoom: getZoom(), duration: 300 });
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/Search/SearchOverlay.tsx
git commit -m "feat: add command-palette search overlay"
```

---

## Task 9: Keyboard Shortcuts Panel

**Files:**
- Create: `src/components/shared/ShortcutsOverlay.tsx`

**Step 1: Create ShortcutsOverlay**

Centered modal with two-column layout showing all keyboard shortcuts:
- General: Ctrl+S Save, Ctrl+Z Undo, Ctrl+Y Redo, Ctrl+K Search, ? Shortcuts, Escape Deselect
- Canvas: Delete Remove, Ctrl+A Select all, Ctrl+D Duplicate, Space Pan, Scroll Zoom, F Fit view
- Export: Ctrl+E Export, Ctrl+I Import
- Nodes: E Expand, C Collapse, Ctrl+G Group

Styled with dark theme, monospace `<kbd>` badges.

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/shared/ShortcutsOverlay.tsx
git commit -m "feat: add keyboard shortcuts overlay panel"
```

---

## Task 10: Store Extensions for Simulation and UI State

**Files:**
- Modify: `src/store/useGraphStore.ts`

**Step 1: Add new state fields and actions**

Add to `GraphStore` interface:
```typescript
// Simulation
simulationActive: boolean;
simulationHighlightedNodeId: string | null;
simulationHighlightedEdgeIds: string[];
runSimulation: () => Promise<void>;
stopSimulation: () => void;

// UI overlays
searchOpen: boolean;
shortcutsOpen: boolean;
exportPreviewOpen: boolean;
setSearchOpen: (open: boolean) => void;
setShortcutsOpen: (open: boolean) => void;
setExportPreviewOpen: (open: boolean) => void;
```

Add initial state values and action implementations. Simulation logic:
- Find entry nodes (no incoming exec edges)
- Walk exec edges, highlighting nodes/edges with delays
- `stopSimulation()` sets `simulationActive = false` and clears highlights

Exclude new fields from `partialize` (don't track in undo/redo).

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/store/useGraphStore.ts
git commit -m "feat: extend store with simulation state and UI overlay controls"
```

---

## Task 11: Simulation CSS Animations

**Files:**
- Modify: `src/index.css`

**Step 1: Add simulation animation CSS**

```css
@keyframes sim-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--glow-color); }
  50% { box-shadow: 0 0 20px 8px var(--glow-color); }
}
.simulation-active {
  animation: sim-pulse 0.5s ease-in-out 2;
}

@keyframes traveling-dot {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}
.simulation-edge path {
  stroke-width: 4;
  stroke-dasharray: 4 96;
  animation: traveling-dot 0.4s linear;
}
```

**Step 2: Apply simulation classes in BaseNode and TypedEdge**

- `BaseNode.tsx`: if `simulationHighlightedNodeId === id`, add `simulation-active` class and `--glow-color` CSS var
- `TypedEdge.tsx`: if edge id in `simulationHighlightedEdgeIds`, add `simulation-edge` class

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/index.css src/components/Nodes/BaseNode.tsx src/components/Edges/TypedEdge.tsx
git commit -m "feat: add simulation pulse and traveling-dot animations"
```

---

## Task 12: Reorganize Toolbar and Wire Everything Together

**Files:**
- Modify: `src/components/Toolbar/Toolbar.tsx` — reorganize into groups, add new buttons
- Modify: `src/App.tsx` — add overlays (ExportPreview, SearchOverlay, ShortcutsOverlay)
- Modify: `src/components/Canvas/BlueprintCanvas.tsx` — extend keyboard handler, add MiniMap click, add import handler

**Step 1: Reorganize Toolbar**

Add grouped button layout with separators:
- File group: Save, Load, Import (.claude/ ZIP), Export (opens preview)
- Edit group: Undo, Redo, Clear
- View group: Search, Auto-layout, Shortcuts help
- Run group: Play/Stop simulation

Add tooltips with shortcut info (e.g. `title="Save (Ctrl+S)"`).

New buttons use lucide icons: `FileArchive` (Export), `FolderInput` (Import), `Search`, `Play`, `Square` (Stop), `HelpCircle` (Shortcuts).

Import ZIP handler: hidden file input `accept=".zip"`, reads file, calls `importFromZip()`, shows warnings dialog, loads into store, runs auto-layout, fits view.

**Step 2: Wire overlays into App.tsx**

Add ExportPreview, SearchOverlay, ShortcutsOverlay as siblings of main layout, controlled by store state (`exportPreviewOpen`, `searchOpen`, `shortcutsOpen`).

**Step 3: Extend keyboard handler in BlueprintCanvas**

Add to the existing `handleKeyDown`:
```typescript
// Skip if input focused
const tag = (document.activeElement?.tagName ?? '').toLowerCase();
if (['input', 'textarea', 'select'].includes(tag)) return;

switch (true) {
  case (meta && key === 's'):    save(); break;
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

**Step 4: Add MiniMap node click**

```typescript
<MiniMap
  onNodeClick={(_event, node) => {
    focusNode(node.id);
    selectNode(node.id);
  }}
/>
```

**Step 5: Add double-click on BaseNode header for fitView**

In `BaseNode.tsx`, add `onDoubleClick` to header row that calls `fitView({ nodes: [{ id }], padding: 0.5, duration: 300 })`.

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/components/Toolbar/Toolbar.tsx src/App.tsx src/components/Canvas/BlueprintCanvas.tsx src/components/Nodes/BaseNode.tsx
git commit -m "feat: reorganize toolbar, wire overlays, add all keyboard shortcuts"
```

---

## Task 13: Palette Update for Comment Node

**Files:**
- Modify: `src/components/Palette/NodePalette.tsx`

**Step 1: Add Comment node to palette**

Add a separated "Notes" section below the main node types with a "Note" card that drags to create comment nodes.

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/Palette/NodePalette.tsx
git commit -m "feat: add comment node to palette"
```

---

## Task 14: StatusBar Shortcuts Button

**Files:**
- Modify: `src/components/StatusBar/StatusBar.tsx`

**Step 1: Add "?" button**

Add a small "?" button on the right side of the status bar that opens the shortcuts overlay.

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/StatusBar/StatusBar.tsx
git commit -m "feat: add shortcuts help button to status bar"
```

---

## Task 15: Final Build Verification and Smoke Test

**Step 1: Full build**

Run: `npm run build`
Expected: Zero errors.

**Step 2: Dev server smoke test**

Run: `npm run dev`

Manual checks:
- [ ] Export button opens preview modal with file tree
- [ ] Click files in tree to see content
- [ ] Download ZIP works
- [ ] Import .claude/ ZIP creates nodes
- [ ] Ctrl+K opens search, type to filter, Enter to focus
- [ ] ? opens shortcuts overlay
- [ ] Play button animates execution flow
- [ ] Comment nodes drag from palette, change color
- [ ] All existing Phase 1+2 features still work

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 3 — export, import, search, code editor, simulation, comments"
```

---

## Dependency Graph

```
Task 1 (deps) → Task 2 (exporter) → Task 4 (preview)
Task 1 (deps) → Task 3 (importer)
Task 5 (comment node) — independent
Task 6 (code editor) → Task 7 (integrate editors)
Task 8 (search) — independent
Task 9 (shortcuts) — independent
Task 10 (store) → Task 11 (simulation CSS)
Task 12 (wire together) — depends on Tasks 2-11
Task 13 (palette) — depends on Task 5
Task 14 (statusbar) — depends on Task 9
Task 15 (verification) — depends on all
```

**Parallelizable groups:**
- Group A: Tasks 2+3 (after Task 1)
- Group B: Tasks 5, 6, 8, 9, 10 (all independent)
- Group C: Tasks 4, 7, 11, 13, 14 (after their deps)
- Final: Task 12, then Task 15
