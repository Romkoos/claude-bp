import type { Node, Edge } from '@xyflow/react';
import type {
  RulesNodeData,
  SkillNodeData,
  SubagentNodeData,
  HookNodeData,
  McpNodeData,
  ScopedHook,
  HookEvent,
} from '../types/nodes';
import {
  createRulesData,
  createSkillData,
  createSubagentData,
  createHookData,
  createMcpData,
} from '../constants/nodeDefaults';
import { generateId } from '../utils/idGenerator';
import JSZip from 'jszip';
import * as yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportResult {
  nodes: Node[];
  edges: Edge[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const X_POSITIONS = { rules: 0, skill: 400, agent: 800, hook: 1200 } as const;
const Y_STEP = 250;

// ---------------------------------------------------------------------------
// Helpers – frontmatter / markdown parsing
// ---------------------------------------------------------------------------

export function parseFrontmatterMd(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  let fm: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === 'object') {
      fm = parsed as Record<string, unknown>;
    }
  } catch {
    // invalid yaml — treat as no frontmatter
  }
  return { frontmatter: fm, body: match[2] };
}

export function parseAllowedTools(raw: unknown): string[] {
  if (raw == null) return [];
  if (typeof raw === 'string') return raw ? [raw] : [];
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

export function parseScopedHooks(raw: unknown): ScopedHook[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((h): h is Record<string, unknown> => h != null && typeof h === 'object')
    .map((h) => ({
      event: (h.event as HookEvent) ?? 'PreToolUse',
      matcher: typeof h.matcher === 'string' ? h.matcher : '',
      type: h.type === 'http' ? ('http' as const) : ('command' as const),
      command: typeof h.command === 'string' ? h.command : '',
    }));
}

export function extractDynamicInjections(body: string): string[] {
  // Match lines that start with `!` followed by a backtick-wrapped command
  // e.g.:  !`cat some-file.txt`
  const regex = /^!\s*`([^`]+)`/gm;
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    results.push(m[1]);
  }
  return results;
}

export function parseSkillMd(
  content: string,
): { frontmatter: Record<string, unknown>; body: string } | null {
  const { frontmatter, body } = parseFrontmatterMd(content);
  // A valid skill needs at least a name or description in frontmatter
  if (!frontmatter['name'] && !frontmatter['description']) {
    return null;
  }
  return { frontmatter, body };
}

export function findReferenceFiles(
  zip: JSZip,
  skillPath: string,
): string[] {
  // skillPath is like ".claude/skills/my-skill/SKILL.md"
  const dirPath = skillPath.replace(/\/[^/]+$/, '/');
  const refs: string[] = [];
  zip.forEach((relativePath) => {
    if (
      relativePath.startsWith(dirPath) &&
      relativePath !== skillPath &&
      !relativePath.endsWith('/')
    ) {
      // Store just the filename relative to the skill directory
      refs.push(relativePath.slice(dirPath.length));
    }
  });
  return refs;
}

// ---------------------------------------------------------------------------
// Node builders
// ---------------------------------------------------------------------------

function buildRulesNode(
  path: string,
  content: string,
  yIndex: number,
): Node {
  const depth = path.split('/').filter(Boolean).length;
  const isRoot = depth <= 2; // e.g. "CLAUDE.md" or "foo/CLAUDE.md"
  const data: RulesNodeData = {
    ...createRulesData(),
    scope: isRoot ? 'root' : 'subfolder',
    path: isRoot ? '/' : '/' + path.replace(/\/CLAUDE\.md$/i, ''),
    content,
    label: isRoot ? 'CLAUDE.md (root)' : `CLAUDE.md (${path.replace(/\/CLAUDE\.md$/i, '')})`,
  };
  return {
    id: generateId(),
    type: 'rules',
    position: { x: X_POSITIONS.rules, y: yIndex * Y_STEP },
    data: data as unknown as Record<string, unknown>,
  };
}

function buildSkillNode(
  fm: Record<string, unknown>,
  body: string,
  referenceFiles: string[],
  yIndex: number,
): Node {
  const base = createSkillData();
  const data: SkillNodeData = {
    ...base,
    label: typeof fm['name'] === 'string' ? fm['name'] : 'Imported Skill',
    frontmatter: {
      name: typeof fm['name'] === 'string' ? fm['name'] : '',
      description: typeof fm['description'] === 'string' ? fm['description'] : '',
      context:
        fm['context'] === 'fork' ? 'fork' : 'conversation',
      agent: typeof fm['agent'] === 'string' ? fm['agent'] : 'inherit',
      allowedTools: parseAllowedTools(fm['allowed_tools']),
      model: typeof fm['model'] === 'string' ? fm['model'] : 'inherit',
      version: typeof fm['version'] === 'string' ? fm['version'] : '1.0.0',
    },
    scopedHooks: parseScopedHooks(fm['hooks']),
    instructions: body,
    dynamicInjections: extractDynamicInjections(body),
    referenceFiles,
  };
  return {
    id: generateId(),
    type: 'skill',
    position: { x: X_POSITIONS.skill, y: yIndex * Y_STEP },
    data: data as unknown as Record<string, unknown>,
  };
}

function buildSubagentNode(
  name: string,
  fm: Record<string, unknown>,
  body: string,
  yIndex: number,
): Node {
  const base = createSubagentData();
  const data: SubagentNodeData = {
    ...base,
    label: name,
    name,
    description: typeof fm['description'] === 'string' ? fm['description'] : '',
    agentType: (['Explore', 'Plan', 'general-purpose', 'custom'] as const).includes(
      fm['agent_type'] as SubagentNodeData['agentType'],
    )
      ? (fm['agent_type'] as SubagentNodeData['agentType'])
      : 'general-purpose',
    model: typeof fm['model'] === 'string' ? fm['model'] : 'inherit',
    allowedTools: parseAllowedTools(fm['allowed_tools']),
    maxTurns: typeof fm['max_turns'] === 'number' ? fm['max_turns'] : null,
    systemPrompt: body,
    scopedHooks: parseScopedHooks(fm['hooks']),
    skills: Array.isArray(fm['skills']) ? fm['skills'].map(String) : [],
  };
  return {
    id: generateId(),
    type: 'subagent',
    position: { x: X_POSITIONS.agent, y: yIndex * Y_STEP },
    data: data as unknown as Record<string, unknown>,
  };
}

function buildHookNode(
  event: string,
  hookObj: Record<string, unknown>,
  yIndex: number,
): Node {
  const base = createHookData();
  const decisionType = hookObj['decision'];
  const data: HookNodeData = {
    ...base,
    label: `${event} hook`,
    event: event as HookEvent,
    matcher: typeof hookObj['matcher'] === 'string' ? hookObj['matcher'] : '*',
    hookType: hookObj['type'] === 'http' ? 'http' : 'command',
    command: typeof hookObj['command'] === 'string' ? hookObj['command'] : '',
    timeoutMs:
      typeof hookObj['timeout_ms'] === 'number' ? hookObj['timeout_ms'] : 60000,
    decision: {
      type:
        typeof decisionType === 'string' &&
        ['block', 'allow', 'deny', 'escalate'].includes(decisionType)
          ? (decisionType as HookNodeData['decision']['type'])
          : 'none',
      reason: typeof hookObj['reason'] === 'string' ? hookObj['reason'] : '',
      modifyInput: hookObj['modify_input'] === true,
    },
    injectSystemMessage:
      typeof hookObj['inject_system_message'] === 'string'
        ? hookObj['inject_system_message']
        : '',
    continueAfter: hookObj['continue_after'] !== false,
  };
  return {
    id: generateId(),
    type: 'hook',
    position: { x: X_POSITIONS.hook, y: yIndex * Y_STEP },
    data: data as unknown as Record<string, unknown>,
  };
}

function buildMcpNode(
  serverName: string,
  config: Record<string, unknown>,
  yIndex: number,
): Node {
  const base = createMcpData();
  const data: McpNodeData = {
    ...base,
    label: serverName,
    serverName,
    connection: {
      type: config['type'] === 'stdio' ? 'stdio' : 'url',
      url: typeof config['url'] === 'string' ? config['url'] : '',
      command: typeof config['command'] === 'string' ? config['command'] : '',
      args: Array.isArray(config['args']) ? config['args'].map(String) : [],
    },
    env:
      config['env'] && typeof config['env'] === 'object' && !Array.isArray(config['env'])
        ? Object.fromEntries(
            Object.entries(config['env'] as Record<string, unknown>).map(([k, v]) => [
              k,
              String(v),
            ]),
          )
        : {},
    providedTools: [],
  };
  return {
    id: generateId(),
    type: 'mcp',
    position: { x: X_POSITIONS.hook, y: yIndex * Y_STEP },
    data: data as unknown as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// Main import
// ---------------------------------------------------------------------------

export async function importFromZip(file: File): Promise<ImportResult> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const warnings: string[] = [];

  const zip = await JSZip.loadAsync(file);

  // Track layout positions per column
  const yCounters = { rules: 0, skill: 0, agent: 0, hook: 0, mcp: 0 };

  // ------------------------------------------------------------------
  // 1. CLAUDE.md → Rules nodes
  // ------------------------------------------------------------------
  const claudeFiles: Array<{ path: string; content: string }> = [];
  const fileEntries: Array<[string, JSZip.JSZipObject]> = [];
  zip.forEach((relativePath, entry) => {
    fileEntries.push([relativePath, entry]);
  });

  for (const [relativePath, entry] of fileEntries) {
    if (entry.dir) continue;
    const filename = relativePath.split('/').pop() ?? '';
    if (filename.toUpperCase() === 'CLAUDE.MD') {
      const content = await entry.async('string');
      claudeFiles.push({ path: relativePath, content });
    }
  }

  for (const cf of claudeFiles) {
    const node = buildRulesNode(cf.path, cf.content, yCounters.rules);
    nodes.push(node);
    yCounters.rules++;
  }

  // ------------------------------------------------------------------
  // 2. SKILL.md → Skill nodes
  // ------------------------------------------------------------------
  const skillNodeIds: string[] = [];

  for (const [relativePath, entry] of fileEntries) {
    if (entry.dir) continue;
    const filename = relativePath.split('/').pop() ?? '';
    if (filename.toUpperCase() === 'SKILL.MD') {
      const content = await entry.async('string');
      const parsed = parseSkillMd(content);
      if (!parsed) {
        warnings.push(
          `Skipped ${relativePath}: SKILL.md has no name or description in frontmatter`,
        );
        continue;
      }
      const refs = findReferenceFiles(zip, relativePath);
      const node = buildSkillNode(
        parsed.frontmatter,
        parsed.body,
        refs,
        yCounters.skill,
      );
      nodes.push(node);
      skillNodeIds.push(node.id);
      yCounters.skill++;
    }
  }

  // ------------------------------------------------------------------
  // 3. .claude/agents/*.md → Subagent nodes
  // ------------------------------------------------------------------
  for (const [relativePath, entry] of fileEntries) {
    if (entry.dir) continue;
    // Match paths like .claude/agents/foo.md or agents/foo.md (within .claude prefix)
    const agentMatch = relativePath.match(
      /(?:^|\/)?\.claude\/agents\/([^/]+)\.md$/i,
    );
    if (!agentMatch) continue;

    const agentFileName = agentMatch[1];
    const content = await entry.async('string');
    const { frontmatter, body } = parseFrontmatterMd(content);
    const name =
      typeof frontmatter['name'] === 'string'
        ? frontmatter['name']
        : agentFileName;

    const node = buildSubagentNode(name, frontmatter, body, yCounters.agent);
    nodes.push(node);
    yCounters.agent++;
  }

  // ------------------------------------------------------------------
  // 4. settings.json → Hook + MCP nodes
  // ------------------------------------------------------------------
  let settingsContent: string | null = null;
  for (const [relativePath, entry] of fileEntries) {
    if (entry.dir) continue;
    if (relativePath.match(/(?:^|\/)?\.claude\/settings\.json$/i)) {
      settingsContent = await entry.async('string');
      break;
    }
  }

  if (settingsContent) {
    try {
      const settings = JSON.parse(settingsContent) as Record<string, unknown>;

      // --- Hooks ---
      if (settings['hooks'] && typeof settings['hooks'] === 'object') {
        const hooks = settings['hooks'] as Record<string, unknown>;
        for (const [event, entries] of Object.entries(hooks)) {
          if (!Array.isArray(entries)) continue;
          for (const hookObj of entries) {
            if (typeof hookObj !== 'object' || hookObj == null) continue;
            const node = buildHookNode(
              event,
              hookObj as Record<string, unknown>,
              yCounters.hook,
            );
            nodes.push(node);
            yCounters.hook++;
          }
        }
      }

      // --- MCP Servers ---
      if (settings['mcpServers'] && typeof settings['mcpServers'] === 'object') {
        const mcpServers = settings['mcpServers'] as Record<string, unknown>;
        for (const [serverName, config] of Object.entries(mcpServers)) {
          if (typeof config !== 'object' || config == null) continue;
          const node = buildMcpNode(
            serverName,
            config as Record<string, unknown>,
            yCounters.mcp,
          );
          nodes.push(node);
          yCounters.mcp++;
        }
      }
    } catch {
      warnings.push('Failed to parse .claude/settings.json');
    }
  }

  // ------------------------------------------------------------------
  // 5. Auto-generate edges: root Rules → all Skills (context type)
  // ------------------------------------------------------------------
  const rootRulesNodes = nodes.filter(
    (n) => n.type === 'rules' && (n.data as unknown as RulesNodeData).scope === 'root',
  );

  for (const rulesNode of rootRulesNodes) {
    for (const skillId of skillNodeIds) {
      edges.push({
        id: generateId(),
        source: rulesNode.id,
        target: skillId,
        sourceHandle: 'out_context',
        targetHandle: 'in_context',
        type: 'default',
        data: { pinType: 'context' },
      });
    }
  }

  return { nodes, edges, warnings };
}
