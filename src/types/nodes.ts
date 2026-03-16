export type BlueprintNodeType = 'rules' | 'skill' | 'subagent' | 'hook' | 'tool' | 'mcp' | 'plugin';

export interface BaseNodeData {
  label: string;
  collapsed: boolean;
  validation: {
    errors: string[];
    warnings: string[];
  };
}

export interface RulesNodeData extends BaseNodeData {
  scope: 'root' | 'subfolder';
  path: string;
  content: string;
  priority: number;
}

export interface SkillNodeData extends BaseNodeData {
  frontmatter: {
    name: string;
    description: string;
    context: 'conversation' | 'fork';
    agent: 'inherit' | 'Explore' | 'Plan' | 'general-purpose' | string;
    allowedTools: string[];
    model: 'inherit' | 'claude-opus-4' | 'claude-sonnet-4' | string;
    version: string;
  };
  scopedHooks: ScopedHook[];
  instructions: string;
  dynamicInjections: string[];
  referenceFiles: string[];
}

export interface SubagentNodeData extends BaseNodeData {
  name: string;
  description: string;
  agentType: 'Explore' | 'Plan' | 'general-purpose' | 'custom';
  model: 'inherit' | 'claude-opus-4' | 'claude-sonnet-4' | string;
  allowedTools: string[];
  maxTurns: number | null;
  systemPrompt: string;
  scopedHooks: ScopedHook[];
  skills: string[];
}

export interface HookNodeData extends BaseNodeData {
  event: HookEvent;
  matcher: string;
  hookType: 'command' | 'http';
  command: string;
  timeoutMs: number;
  decision: {
    type: 'none' | 'block' | 'allow' | 'deny' | 'escalate';
    reason: string;
    modifyInput: boolean;
  };
  injectSystemMessage: string;
  continueAfter: boolean;
}

export interface ToolNodeData extends BaseNodeData {
  toolName: string;
  pattern: string;
  builtin: boolean;
  description: string;
}

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

export interface PluginNodeData extends BaseNodeData {
  pluginName: string;
  version: string;
  description: string;
  installScript: string;
}

export interface ScopedHook {
  event: HookEvent;
  matcher: string;
  type: 'command' | 'http';
  command: string;
}

export type HookEvent =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PermissionRequest'
  | 'Stop'
  | 'SubagentStop'
  | 'SubagentSpawn'
  | 'PreCompact'
  | 'ConfigChange'
  | 'ContextUpdate';
