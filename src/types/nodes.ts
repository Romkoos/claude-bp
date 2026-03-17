export type BlueprintNodeType = 'rules' | 'skill' | 'subagent' | 'hook' | 'tool' | 'mcp' | 'plugin' | 'comment';

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
    argumentHint: string;
    disableModelInvocation: boolean;
    userInvocable: boolean;
    context: 'fork' | undefined;
    agent: 'Explore' | 'Plan' | 'general-purpose' | string;
    allowedTools: string[];
    model: string;
  };
  scopedHooks: ScopedHook[];
  instructions: string;
  dynamicInjections: string[];
  referenceFiles: string[];
}

export type SubagentPermissionMode = 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan';

export interface SubagentNodeData extends BaseNodeData {
  name: string;
  description: string;
  model: 'inherit' | 'sonnet' | 'opus' | 'haiku' | string;
  allowedTools: string[];
  disallowedTools: string[];
  permissionMode: SubagentPermissionMode | null;
  maxTurns: number | null;
  background: boolean;
  isolation: 'worktree' | null;
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

export interface CommentNodeData extends BaseNodeData {
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
  width: number;
  height: number;
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
