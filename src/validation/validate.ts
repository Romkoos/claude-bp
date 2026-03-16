import type { Node, Edge } from '@xyflow/react';
import type { BlueprintNodeType, SkillNodeData, HookNodeData, SubagentNodeData } from '../types/nodes';

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

  return results;
}
