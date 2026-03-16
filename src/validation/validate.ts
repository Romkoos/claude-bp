import type { Node, Edge } from '@xyflow/react';
import type { BlueprintNodeType, SkillNodeData, HookNodeData, SubagentNodeData, ToolNodeData, McpNodeData } from '../types/nodes';

export interface ValidationResult {
  nodeId: string;
  level: 'error' | 'warning';
  message: string;
}

const DEFAULT_LABELS: Record<BlueprintNodeType, string> = {
  rules: 'CLAUDE.md',
  skill: 'New Skill',
  subagent: 'New Subagent',
  hook: 'New Hook',
  tool: 'New Tool',
  mcp: 'New MCP Server',
  plugin: 'New Plugin',
};

export function validateGraph(nodes: Node[], edges: Edge[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const connectedNodeIds = new Set<string>();

  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  for (const node of nodes) {
    const nodeType = node.type as BlueprintNodeType;
    const data = node.data as Record<string, unknown>;

    // Error checks
    if (nodeType === 'skill') {
      const skillData = data as unknown as SkillNodeData;
      if (
        skillData.frontmatter.context === 'fork' &&
        (!skillData.frontmatter.agent || skillData.frontmatter.agent === 'inherit')
      ) {
        results.push({
          nodeId: node.id,
          level: 'error',
          message: 'Forked skills must specify an agent type',
        });
      }
    }

    if (nodeType === 'hook') {
      const hookData = data as unknown as HookNodeData;
      if (!hookData.event) {
        results.push({
          nodeId: node.id,
          level: 'error',
          message: 'Hook must have a lifecycle event',
        });
      }
      if (!hookData.command) {
        results.push({
          nodeId: node.id,
          level: 'error',
          message: 'Hook must have a command',
        });
      }
    }

    if (nodeType === 'subagent') {
      const subagentData = data as unknown as SubagentNodeData;
      if (!subagentData.systemPrompt) {
        results.push({
          nodeId: node.id,
          level: 'error',
          message: 'Subagent must have a system prompt',
        });
      }
    }

    // Warning checks
    if (nodeType === 'skill') {
      const skillData = data as unknown as SkillNodeData;
      if (!skillData.frontmatter.description) {
        results.push({
          nodeId: node.id,
          level: 'warning',
          message: "Skill without description won't be auto-discovered",
        });
      }
    }

    if (nodeType === 'subagent') {
      const subagentData = data as unknown as SubagentNodeData;
      if (!subagentData.allowedTools || subagentData.allowedTools.length === 0) {
        results.push({
          nodeId: node.id,
          level: 'warning',
          message: 'Empty allowed tools inherits all tools — potential security risk',
        });
      }
    }

    if (nodeType === 'tool') {
      const toolData = data as unknown as ToolNodeData;
      if (!toolData.toolName.trim()) {
        results.push({ nodeId: node.id, level: 'error', message: 'Tool must have a name' });
      }
    }

    if (nodeType === 'mcp') {
      const mcpData = data as unknown as McpNodeData;
      if (!mcpData.serverName.trim()) {
        results.push({ nodeId: node.id, level: 'error', message: 'MCP server must have a name' });
      }
      if (mcpData.connection.type === 'url' && !mcpData.connection.url.trim()) {
        results.push({ nodeId: node.id, level: 'error', message: 'MCP URL server must have a URL' });
      }
      if (mcpData.connection.type === 'stdio' && !mcpData.connection.command.trim()) {
        results.push({ nodeId: node.id, level: 'error', message: 'MCP stdio server must have a command' });
      }
    }

    if (nodeType === 'plugin') {
      const childCount = nodes.filter((n) => n.parentId === node.id).length;
      if (childCount === 0) {
        results.push({ nodeId: node.id, level: 'warning', message: 'Plugin has no children — consider adding skills, agents, or hooks' });
      }
    }

    if (!connectedNodeIds.has(node.id)) {
      results.push({
        nodeId: node.id,
        level: 'warning',
        message: 'Node is not connected to anything',
      });
    }

    const label = (data as { label?: string }).label;
    if (nodeType && label && DEFAULT_LABELS[nodeType] === label) {
      results.push({
        nodeId: node.id,
        level: 'warning',
        message: 'Consider renaming from default',
      });
    }
  }

  // Circular delegation detection
  const delegationGraph = new Map<string, string[]>();
  edges
    .filter((e) => e.data?.pinType === 'delegation')
    .forEach((e) => {
      const targets = delegationGraph.get(e.source) ?? [];
      targets.push(e.target);
      delegationGraph.set(e.source, targets);
    });

  const visited = new Set<string>();
  const stack = new Set<string>();

  function detectCycle(nodeId: string, path: string[]): void {
    if (stack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart);
      const labels = cycle.map((id) => {
        const n = nodes.find((nd) => nd.id === id);
        return (n?.data as { label?: string })?.label || id;
      });
      results.push({
        nodeId: cycle[0],
        level: 'warning',
        message: `Circular delegation: ${labels.join(' → ')} → ${labels[0]}`,
      });
      return;
    }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);
    (delegationGraph.get(nodeId) ?? []).forEach((next) => detectCycle(next, [...path]));
    stack.delete(nodeId);
  }

  nodes.forEach((n) => {
    if (!visited.has(n.id)) detectCycle(n.id, []);
  });

  // Duplicate skill names
  const skillNodes = nodes.filter((n) => n.type === 'skill');
  const skillNameMap = new Map<string, string[]>();
  skillNodes.forEach((n) => {
    const name = (n.data as unknown as SkillNodeData).frontmatter.name;
    if (name) {
      const ids = skillNameMap.get(name) ?? [];
      ids.push(n.id);
      skillNameMap.set(name, ids);
    }
  });
  skillNameMap.forEach((ids, name) => {
    if (ids.length > 1) {
      ids.forEach((id) => {
        results.push({
          nodeId: id,
          level: 'warning',
          message: `Duplicate skill name "${name}" — will conflict in .claude/skills/`,
        });
      });
    }
  });

  return results;
}
