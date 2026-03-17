import { PinType, PinDirection, type PinDefinition } from '../types/pins';
import type { BlueprintNodeType, RulesNodeData, SkillNodeData, SubagentNodeData, HookNodeData, ToolNodeData, McpNodeData, PluginNodeData, CommentNodeData } from '../types/nodes';

export const NODE_PIN_DEFINITIONS: Record<BlueprintNodeType, PinDefinition[]> = {
  rules: [
    { id: 'out_context', type: PinType.Context, direction: PinDirection.Out, label: 'provides context' },
  ],
  skill: [
    { id: 'in_context',    type: PinType.Context,    direction: PinDirection.In,  label: 'receives context' },
    { id: 'in_trigger',    type: PinType.Trigger,    direction: PinDirection.In,  label: 'triggered by' },
    { id: 'in_exec',       type: PinType.Exec,       direction: PinDirection.In,  label: 'exec in' },
    { id: 'out_delegation',type: PinType.Delegation,  direction: PinDirection.Out, label: 'delegates to' },
    { id: 'out_tools',     type: PinType.ToolAccess,  direction: PinDirection.Out, label: 'uses tools' },
    { id: 'out_context',   type: PinType.Context,    direction: PinDirection.Out, label: 'provides context' },
    { id: 'out_exec',      type: PinType.Exec,       direction: PinDirection.Out, label: 'exec out' },
  ],
  subagent: [
    { id: 'in_delegation', type: PinType.Delegation,  direction: PinDirection.In,  label: 'delegated from' },
    { id: 'in_context',    type: PinType.Context,    direction: PinDirection.In,  label: 'receives context' },
    { id: 'in_exec',       type: PinType.Exec,       direction: PinDirection.In,  label: 'exec in' },
    { id: 'out_result',    type: PinType.Result,     direction: PinDirection.Out, label: 'returns result' },
    { id: 'out_tools',     type: PinType.ToolAccess,  direction: PinDirection.Out, label: 'uses tools' },
    { id: 'out_spawn',     type: PinType.Delegation,  direction: PinDirection.Out, label: 'spawns' },
    { id: 'out_exec',      type: PinType.Exec,       direction: PinDirection.Out, label: 'exec out' },
  ],
  hook: [
    { id: 'in_trigger',    type: PinType.Trigger,    direction: PinDirection.In,  label: 'listens to' },
    { id: 'out_decision',  type: PinType.Decision,   direction: PinDirection.Out, label: 'blocks/allows' },
    { id: 'out_context',   type: PinType.Context,    direction: PinDirection.Out, label: 'injects context' },
  ],
  tool: [
    { id: 'in_used_by',     type: PinType.ToolAccess, direction: PinDirection.In, label: 'used by' },
    { id: 'in_provided_by', type: PinType.ToolAccess, direction: PinDirection.In, label: 'provided by' },
  ],
  mcp: [
    { id: 'out_tools',   type: PinType.ToolAccess, direction: PinDirection.Out, label: 'provides tools' },
    { id: 'out_context',  type: PinType.Context,   direction: PinDirection.Out, label: 'provides context' },
  ],
  plugin: [
    { id: 'out_bundle', type: PinType.Bundle, direction: PinDirection.Out, label: 'exports' },
  ],
  comment: [],
};

export function createRulesData(): RulesNodeData {
  return {
    label: 'CLAUDE.md',
    collapsed: true,
    validation: { errors: [], warnings: [] },
    scope: 'root',
    path: '/',
    content: '# Project Rules\n\n',
    priority: 0,
  };
}

export function createSkillData(): SkillNodeData {
  return {
    label: 'New Skill',
    collapsed: true,
    validation: { errors: [], warnings: [] },
    frontmatter: {
      name: '',
      description: '',
      context: 'conversation',
      agent: 'inherit',
      allowedTools: [],
      model: 'inherit',
      version: '1.0.0',
    },
    scopedHooks: [],
    instructions: '',
    dynamicInjections: [],
    referenceFiles: [],
  };
}

export function createSubagentData(): SubagentNodeData {
  return {
    label: 'New Subagent',
    collapsed: true,
    validation: { errors: [], warnings: [] },
    name: '',
    description: '',
    agentType: 'general-purpose',
    model: 'inherit',
    allowedTools: [],
    maxTurns: null,
    systemPrompt: '',
    scopedHooks: [],
    skills: [],
  };
}

export function createHookData(): HookNodeData {
  return {
    label: 'New Hook',
    collapsed: true,
    validation: { errors: [], warnings: [] },
    event: 'PreToolUse',
    matcher: '*',
    hookType: 'command',
    command: '',
    timeoutMs: 60000,
    decision: { type: 'none', reason: '', modifyInput: false },
    injectSystemMessage: '',
    continueAfter: true,
  };
}

export function createToolData(): ToolNodeData {
  return {
    label: 'New Tool',
    collapsed: true,
    validation: { errors: [], warnings: [] },
    toolName: 'Bash',
    pattern: '',
    builtin: true,
    description: '',
  };
}

export function createMcpData(): McpNodeData {
  return {
    label: 'New MCP Server',
    collapsed: true,
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

export function createCommentData(): CommentNodeData {
  return {
    label: '',
    collapsed: true,
    validation: { errors: [], warnings: [] },
    content: '',
    color: 'yellow',
    width: 200,
    height: 120,
  };
}

export function createPluginData(): PluginNodeData {
  return {
    label: 'New Plugin',
    collapsed: true,
    validation: { errors: [], warnings: [] },
    pluginName: '',
    version: '1.0.0',
    description: '',
    installScript: '',
  };
}
