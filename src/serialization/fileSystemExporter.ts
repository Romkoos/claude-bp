import type { Node, Edge } from '@xyflow/react';
import type {
  RulesNodeData,
  SkillNodeData,
  SubagentNodeData,
  HookNodeData,
  ToolNodeData,
  McpNodeData,
  ScopedHook,
} from '../types/nodes';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportedFile {
  path: string;
  content: string;
  type: 'rules' | 'skill' | 'subagent' | 'settings' | 'reference';
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Node directory helper
// ---------------------------------------------------------------------------

export function getNodeDir(node: Node): string | null {
  if (node.type === 'skill') {
    const data = node.data as unknown as SkillNodeData;
    const name = data.frontmatter?.name || 'untitled-skill';
    return `.claude/skills/${slugify(name)}`;
  }
  if (node.type === 'subagent') {
    return '.claude/agents';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Integration section helper
// ---------------------------------------------------------------------------

function getNodeLabel(nodeId: string, allNodes: Node[]): string {
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node) return 'unknown';
  const data = node.data as Record<string, unknown>;
  if (node.type === 'subagent') return (data.name as string) || (data.label as string) || 'unknown';
  if (node.type === 'skill') {
    const fm = data.frontmatter as Record<string, unknown> | undefined;
    return (fm?.name as string) || (data.label as string) || 'unknown';
  }
  if (node.type === 'mcp') return (data.serverName as string) || (data.label as string) || 'unknown';
  if (node.type === 'tool') return (data.toolName as string) || (data.label as string) || 'unknown';
  return (data.label as string) || 'unknown';
}

export function buildIntegrationSection(
  node: Node,
  edges: Edge[],
  allNodes: Node[],
): string {
  const lines: string[] = [];

  const incoming = edges.filter((e) => e.target === node.id);
  const outgoing = edges.filter((e) => e.source === node.id);

  for (const e of incoming) {
    const sourceNode = allNodes.find((n) => n.id === e.source);
    if (!sourceNode) continue;
    const pinType = (e.data as Record<string, unknown>)?.pinType;
    const label = getNodeLabel(e.source, allNodes);

    switch (pinType) {
      case 'context':
        if (sourceNode.type === 'mcp') {
          lines.push(`You MUST use MCP server "${label}" and its provided tools.`);
        } else if (sourceNode.type === 'rules') {
          const rulesData = sourceNode.data as unknown as RulesNodeData;
          const rulesFilename = `${slugify(rulesData.label) || 'rules'}.md`;
          lines.push(`You MUST load and follow all rules from file: "${rulesFilename}" (co-located in this directory).`);
        } else {
          lines.push(`You MUST load and follow all rules from: "${label}".`);
        }
        break;
      case 'delegation':
        lines.push(`You are invoked by: "${label}".`);
        break;
      case 'exec':
        lines.push(`You receive execution from: "${label}".`);
        break;
      case 'trigger':
        lines.push(`You are triggered by hook: "${label}".`);
        break;
      case 'bundle':
        lines.push(`You are part of plugin bundle: "${label}".`);
        break;
    }
  }

  for (const e of outgoing) {
    const targetNode = allNodes.find((n) => n.id === e.target);
    if (!targetNode) continue;
    const pinType = (e.data as Record<string, unknown>)?.pinType;
    const label = getNodeLabel(e.target, allNodes);

    switch (pinType) {
      case 'delegation':
        lines.push(`You MUST delegate to the "${label}" subagent when appropriate.`);
        break;
      case 'exec':
        lines.push(`After completion, you MUST hand off execution to: "${label}".`);
        break;
      case 'tool-access':
        lines.push(`You have access to tool: "${label}".`);
        break;
    }
  }

  if (lines.length === 0) return '';

  return `\n\n---\n## MANDATORY: Integration Requirements\n${lines.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export function generateRulesFiles(nodes: Node[], edges: Edge[] = [], allNodes: Node[] = []): ExportedFile[] {
  const rulesNodes = nodes.filter((n) => n.type === 'rules');
  return rulesNodes.flatMap((n) => {
    const data = n.data as unknown as RulesNodeData;
    const filename = `${slugify(data.label) || 'rules'}.md`;
    const content = data.content ?? '';

    // Find context edges from this rules node
    const contextTargets = edges
      .filter((e) => e.source === n.id && (e.data as Record<string, unknown>)?.pinType === 'context')
      .map((e) => allNodes.find((nd) => nd.id === e.target))
      .filter((nd): nd is Node => nd != null);

    // If linked to targets, co-locate with each target (deduplicate by path)
    if (contextTargets.length > 0) {
      const seen = new Set<string>();
      return contextTargets
        .map((target) => {
          const dir = getNodeDir(target);
          return {
            path: dir ? `${dir}/${filename}` : filename,
            content,
            type: 'rules' as const,
          };
        })
        .filter((f) => {
          if (seen.has(f.path)) return false;
          seen.add(f.path);
          return true;
        });
    }

    // No connections — use scope/path as fallback
    const filePath =
      data.scope === 'root' || !data.path
        ? filename
        : `${data.path.replace(/\/+$/, '')}/${filename}`;
    return [{ path: filePath, content, type: 'rules' as const }];
  });
}

export function generateSkillFiles(nodes: Node[], edges: Edge[] = [], allNodes: Node[] = []): ExportedFile[] {
  const skillNodes = nodes.filter((n) => n.type === 'skill');
  return skillNodes.flatMap((n) => {
    const data = n.data as unknown as SkillNodeData;
    const name = data.frontmatter?.name || 'untitled-skill';
    const slug = slugify(name);
    const dirPath = `.claude/skills/${slug}`;

    const files: ExportedFile[] = [];

    // Build frontmatter — only include non-default values
    const fm: Record<string, unknown> = {};
    const defaults: Record<string, unknown> = {
      context: 'conversation',
      agent: 'inherit',
      model: 'inherit',
      version: '1.0.0',
    };

    if (data.frontmatter) {
      if (data.frontmatter.name) fm['name'] = data.frontmatter.name;
      if (data.frontmatter.description) fm['description'] = data.frontmatter.description;
      if (data.frontmatter.context && data.frontmatter.context !== defaults.context)
        fm['context'] = data.frontmatter.context;
      if (data.frontmatter.agent && data.frontmatter.agent !== defaults.agent)
        fm['agent'] = data.frontmatter.agent;
      if (data.frontmatter.allowedTools?.length)
        fm['allowed_tools'] = data.frontmatter.allowedTools;
      if (data.frontmatter.model && data.frontmatter.model !== defaults.model)
        fm['model'] = data.frontmatter.model;
      if (data.frontmatter.version && data.frontmatter.version !== defaults.version)
        fm['version'] = data.frontmatter.version;
    }

    if (data.scopedHooks?.length) {
      fm['hooks'] = data.scopedHooks.map((h: ScopedHook) => ({
        event: h.event,
        ...(h.matcher ? { matcher: h.matcher } : {}),
        type: h.type,
        command: h.command,
      }));
    }

    if (data.dynamicInjections?.length) {
      fm['dynamic_injections'] = data.dynamicInjections;
    }

    const fmBlock = Object.keys(fm).length
      ? `---\n${yaml.dump(fm, { lineWidth: -1 }).trimEnd()}\n---\n\n`
      : '';

    const body = data.instructions ?? '';
    const integrationSection = buildIntegrationSection(n, edges, allNodes);
    files.push({
      path: `${dirPath}/SKILL.md`,
      content: `${fmBlock}${body}${integrationSection}`,
      type: 'skill',
    });

    // Reference file placeholders
    if (data.referenceFiles?.length) {
      for (const ref of data.referenceFiles) {
        files.push({
          path: `${dirPath}/${ref}`,
          content: `# Placeholder for reference file: ${ref}\n# Replace this with the actual file content.\n`,
          type: 'reference',
        });
      }
    }

    return files;
  });
}

export function generateSubagentFiles(nodes: Node[], edges: Edge[] = [], allNodes: Node[] = []): ExportedFile[] {
  const subagentNodes = nodes.filter((n) => n.type === 'subagent');
  return subagentNodes.map((n) => {
    const data = n.data as unknown as SubagentNodeData;
    const name = data.name || 'untitled-agent';
    const slug = slugify(name);

    // Build optional frontmatter
    const fm: Record<string, unknown> = {};
    if (data.description) fm['description'] = data.description;
    if (data.agentType && data.agentType !== 'general-purpose')
      fm['agent_type'] = data.agentType;
    if (data.model && data.model !== 'inherit') fm['model'] = data.model;
    if (data.allowedTools?.length) fm['allowed_tools'] = data.allowedTools;
    if (data.maxTurns != null) fm['max_turns'] = data.maxTurns;
    if (data.skills?.length) fm['skills'] = data.skills;

    if (data.scopedHooks?.length) {
      fm['hooks'] = data.scopedHooks.map((h: ScopedHook) => ({
        event: h.event,
        ...(h.matcher ? { matcher: h.matcher } : {}),
        type: h.type,
        command: h.command,
      }));
    }

    const fmBlock = Object.keys(fm).length
      ? `---\n${yaml.dump(fm, { lineWidth: -1 }).trimEnd()}\n---\n\n`
      : '';

    const body = data.systemPrompt ?? '';
    const integrationSection = buildIntegrationSection(n, edges, allNodes);

    return {
      path: `.claude/agents/${slug}.md`,
      content: `${fmBlock}${body}${integrationSection}`,
      type: 'subagent' as const,
    };
  });
}

export function generateSettingsJson(nodes: Node[], edges: Edge[]): ExportedFile[] {
  const hookNodes = nodes.filter((n) => n.type === 'hook');
  const toolNodes = nodes.filter((n) => n.type === 'tool');
  const mcpNodes = nodes.filter((n) => n.type === 'mcp');

  // If there's nothing to emit, skip settings.json entirely
  if (!hookNodes.length && !toolNodes.length && !mcpNodes.length) {
    return [];
  }

  const settings: Record<string, unknown> = {};

  // --- Hooks ---
  if (hookNodes.length) {
    const hooks: Record<string, unknown[]> = {};
    for (const n of hookNodes) {
      const data = n.data as unknown as HookNodeData;
      const entry: Record<string, unknown> = {
        type: data.hookType || 'command',
        command: data.command,
      };
      if (data.matcher) entry['matcher'] = data.matcher;
      if (data.timeoutMs && data.timeoutMs !== 60000) entry['timeout_ms'] = data.timeoutMs;

      // Decision fields
      if (data.decision && data.decision.type !== 'none') {
        entry['decision'] = data.decision.type;
        if (data.decision.reason) entry['reason'] = data.decision.reason;
        if (data.decision.modifyInput) entry['modify_input'] = true;
      }

      if (data.injectSystemMessage) entry['inject_system_message'] = data.injectSystemMessage;
      if (data.continueAfter != null && !data.continueAfter) entry['continue_after'] = false;

      if (!hooks[data.event]) hooks[data.event] = [];
      hooks[data.event].push(entry);
    }
    settings['hooks'] = hooks;
  }

  // --- Permissions (from Tool nodes) ---
  if (toolNodes.length) {
    const permissions: Record<string, unknown> = {};
    const allow: string[] = [];
    const deny: string[] = [];

    for (const n of toolNodes) {
      const data = n.data as unknown as ToolNodeData;
      // Determine if tool is allowed or denied based on edges
      const connectedEdges = edges.filter(
        (e) => e.source === n.id || e.target === n.id
      );
      // Tools are permissions — check edge label or default to allow
      const isDenied = connectedEdges.some(
        (e) => e.label === 'deny' || e.data?.permission === 'deny'
      );

      const pattern = data.pattern
        ? `${data.toolName}:${data.pattern}`
        : data.toolName;

      if (isDenied) {
        deny.push(pattern);
      } else {
        allow.push(pattern);
      }
    }

    if (allow.length) permissions['allow'] = allow;
    if (deny.length) permissions['deny'] = deny;
    if (Object.keys(permissions).length) settings['permissions'] = permissions;
  }

  // --- MCP Servers ---
  if (mcpNodes.length) {
    const mcpServers: Record<string, unknown> = {};
    for (const n of mcpNodes) {
      const data = n.data as unknown as McpNodeData;
      const serverConfig: Record<string, unknown> = {};

      if (data.connection.type === 'url') {
        serverConfig['type'] = 'url';
        serverConfig['url'] = data.connection.url;
      } else {
        serverConfig['type'] = 'stdio';
        serverConfig['command'] = data.connection.command;
        if (data.connection.args?.length) serverConfig['args'] = data.connection.args;
      }

      if (data.env && Object.keys(data.env).length) {
        serverConfig['env'] = data.env;
      }

      mcpServers[data.serverName] = serverConfig;
    }
    settings['mcpServers'] = mcpServers;
  }

  return [
    {
      path: '.claude/settings.json',
      content: JSON.stringify(settings, null, 2),
      type: 'settings' as const,
    },
  ];
}

// ---------------------------------------------------------------------------
// Main entry points
// ---------------------------------------------------------------------------

export function generateFileTree(nodes: Node[], edges: Edge[]): ExportedFile[] {
  // Filter out comment nodes
  const filteredNodes = nodes.filter((n) => n.type !== 'comment');

  return [
    ...generateRulesFiles(filteredNodes, edges, filteredNodes),
    ...generateSkillFiles(filteredNodes, edges, filteredNodes),
    ...generateSubagentFiles(filteredNodes, edges, filteredNodes),
    ...generateSettingsJson(filteredNodes, edges),
  ];
}

export async function exportAsZip(
  files: ExportedFile[],
  configName: string = 'claude-config'
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `${slugify(configName) || 'claude-config'}.zip`;
  saveAs(blob, filename);
}
