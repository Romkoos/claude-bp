import type { BlueprintNodeType } from '../types/nodes';

export interface PropertyDescription {
  name: string;
  description: string;
}

export interface ConnectorDescription {
  pinId: string;
  description: string;
}

export interface NodeDescription {
  summary: string;
  properties: PropertyDescription[];
  connectors: ConnectorDescription[];
}

export const NODE_DESCRIPTIONS: Record<Exclude<BlueprintNodeType, 'comment'>, NodeDescription> = {
  rules: {
    summary:
      'CLAUDE.md files provide project-level rules, context, and instructions that are automatically loaded into every conversation. They define coding standards, project structure, and behavioral guidelines.',
    properties: [
      { name: 'Scope', description: 'Root or subfolder — determines which part of the project tree this file applies to' },
      { name: 'Path', description: 'Filesystem path where the CLAUDE.md is located' },
      { name: 'Content', description: 'Markdown instructions and rules for the agent' },
      { name: 'Priority', description: 'Loading order when multiple CLAUDE.md files exist (lower = loaded first)' },
    ],
    connectors: [
      { pinId: 'out_context', description: 'Feeds rules and project context into connected skills, subagents, or hooks. Any node that receives this context will follow the instructions defined here.' },
    ],
  },
  skill: {
    summary:
      'Skills are on-demand capabilities that can be invoked by the agent or user via slash commands. Each skill has its own instructions, metadata, and can scope hooks and tools.',
    properties: [
      { name: 'Name', description: 'Unique identifier used for invocation (e.g., /my-skill). Lowercase letters, numbers, and hyphens only (max 64 characters).' },
      { name: 'Description', description: 'Trigger description — helps Claude decide when to invoke this skill automatically' },
      { name: 'Argument Hint', description: 'Hint shown during autocomplete to indicate expected arguments (e.g., [issue-number])' },
      { name: 'Disable Model Invocation', description: 'When true, only users can invoke this skill — Claude cannot load it automatically' },
      { name: 'User Invocable', description: 'When false, hides the skill from the / menu — only Claude can invoke it' },
      { name: 'Context', description: '"fork" runs in an isolated subagent context; unset runs inline in conversation' },
      { name: 'Agent', description: 'Which agent type executes this skill when context is fork (Explore, Plan, general-purpose, or custom)' },
      { name: 'Allowed Tools', description: 'Tools Claude can use without asking permission when this skill is active' },
      { name: 'Model', description: 'Override the model for this skill' },
      { name: 'Instructions', description: 'The full prompt/body of the skill — what Claude should do when invoked' },
      { name: 'Scoped Hooks', description: 'Hooks that are active only while this skill is executing' },
      { name: 'Dynamic Injections', description: 'Shell commands (via !`cmd` syntax) whose output is injected before the skill runs' },
      { name: 'Reference Files', description: 'Supporting files bundled in the skill directory (templates, examples, scripts)' },
    ],
    connectors: [
      { pinId: 'in_context', description: 'Receives project context from CLAUDE.md or other context providers. The skill will follow these rules during execution.' },
      { pinId: 'in_trigger', description: 'Connects to hooks that determine when this skill should activate (e.g., on a specific event or user command).' },
      { pinId: 'in_exec', description: 'Execution flow input — this skill runs as part of a sequential pipeline when connected.' },
      { pinId: 'out_delegation', description: 'Delegates sub-tasks to connected subagents. The skill can spawn and orchestrate subagent work.' },
      { pinId: 'out_tools', description: 'Grants this skill access to connected tools and MCP servers for performing operations.' },
      { pinId: 'out_context', description: 'Passes context downstream to other skills or subagents that depend on this skill\'s configuration.' },
      { pinId: 'out_exec', description: 'Execution flow output — triggers the next node in a sequential pipeline after this skill completes.' },
    ],
  },
  subagent: {
    summary:
      'Subagents are specialized AI assistants that handle specific types of tasks. Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions.',
    properties: [
      { name: 'Name', description: 'Unique identifier using lowercase letters and hyphens' },
      { name: 'Description', description: 'When Claude should delegate to this subagent — Claude uses this to decide when to delegate' },
      { name: 'Model', description: 'Model alias (sonnet, opus, haiku), full model ID, or inherit from main conversation' },
      { name: 'Allowed Tools', description: 'Tools the subagent can use (inherits all tools if empty)' },
      { name: 'Disallowed Tools', description: 'Tools to deny — removed from inherited or specified list' },
      { name: 'Permission Mode', description: 'Controls how the subagent handles permission prompts (default, acceptEdits, dontAsk, bypassPermissions, plan)' },
      { name: 'Max Turns', description: 'Maximum number of agentic turns before the subagent stops (null = unlimited)' },
      { name: 'Background', description: 'Always run this subagent as a background task' },
      { name: 'Isolation', description: 'Run in a temporary git worktree for an isolated copy of the repository' },
      { name: 'System Prompt', description: 'The system prompt that guides the subagent\'s behavior — subagents receive only this, not the full Claude Code system prompt' },
      { name: 'Scoped Hooks', description: 'Hooks active only while this subagent is running' },
      { name: 'Skills', description: 'Skills preloaded into the subagent\'s context at startup (full content injected, not just made available)' },
    ],
    connectors: [
      { pinId: 'in_delegation', description: 'Receives work delegated from a parent skill or another subagent. This is how the subagent gets its task.' },
      { pinId: 'in_context', description: 'Receives project context from CLAUDE.md or other providers. The subagent will follow these rules.' },
      { pinId: 'in_exec', description: 'Execution flow input — this subagent runs as part of a sequential pipeline.' },
      { pinId: 'out_result', description: 'Returns the result of the subagent\'s work back to the delegating node.' },
      { pinId: 'out_tools', description: 'Grants this subagent access to connected tools and MCP servers.' },
      { pinId: 'out_spawn', description: 'Allows this subagent to spawn child subagents for further parallelization.' },
      { pinId: 'out_exec', description: 'Execution flow output — triggers the next node after this subagent completes.' },
    ],
  },
  hook: {
    summary:
      'Hooks intercept lifecycle events (e.g., before a tool runs, when a session starts) and can block, allow, modify, or inject context into the agent\'s flow.',
    properties: [
      { name: 'Event', description: 'Lifecycle event to listen for (PreToolUse, PostToolUse, SessionStart, etc.)' },
      { name: 'Matcher', description: 'Pattern to filter which events trigger this hook (e.g., tool name glob)' },
      { name: 'Hook Type', description: '"command" runs a shell command; "http" calls a URL' },
      { name: 'Command', description: 'Shell command to execute when the hook fires' },
      { name: 'Timeout', description: 'Maximum execution time in milliseconds before the hook is killed' },
      { name: 'Decision', description: 'Action to take: none, block, allow, deny, or escalate' },
      { name: 'Inject System Message', description: 'Message injected into the agent\'s context when the hook fires' },
      { name: 'Continue After', description: 'Whether the agent continues processing after this hook completes' },
    ],
    connectors: [
      { pinId: 'in_trigger', description: 'Defines which lifecycle event this hook listens to. Connect from skills or subagents whose events should be intercepted.' },
      { pinId: 'out_decision', description: 'Outputs a block/allow/deny/escalate decision that controls whether the triggering action proceeds.' },
      { pinId: 'out_context', description: 'Injects a system message into the agent\'s context when the hook fires, adding dynamic instructions.' },
    ],
  },
  tool: {
    summary:
      'Tools are atomic operations the agent can perform — reading files, writing code, running commands, etc. Nodes represent both built-in and custom tools.',
    properties: [
      { name: 'Tool Name', description: 'Identifier of the tool (e.g., Bash, Read, Write, Edit, Grep)' },
      { name: 'Pattern', description: 'Glob pattern restricting which files/paths the tool can access' },
      { name: 'Built-in', description: 'Whether this is a built-in Claude Code tool or a custom/MCP-provided one' },
      { name: 'Description', description: 'What this tool does — shown to the agent for tool selection' },
    ],
    connectors: [
      { pinId: 'in_used_by', description: 'Connect from skills or subagents that need access to this tool. The connected node will be able to invoke this tool.' },
      { pinId: 'in_provided_by', description: 'Connect from an MCP server that provides this tool. Indicates this tool comes from an external source rather than being built-in.' },
    ],
  },
  mcp: {
    summary:
      'MCP (Model Context Protocol) servers expose external tools and context to the agent over a standardized protocol. They can connect via URL or stdio.',
    properties: [
      { name: 'Server Name', description: 'Unique name to identify this MCP server' },
      { name: 'Connection Type', description: '"url" connects over HTTP/SSE; "stdio" launches a local process' },
      { name: 'URL', description: 'Endpoint for URL-based connections' },
      { name: 'Command', description: 'Executable to launch for stdio-based connections' },
      { name: 'Args', description: 'Command-line arguments for the stdio process' },
      { name: 'Environment', description: 'Environment variables passed to the MCP server process' },
      { name: 'Provided Tools', description: 'List of tools this server exposes (name + description)' },
    ],
    connectors: [
      { pinId: 'out_tools', description: 'Exposes the tools provided by this MCP server. Connect to tool nodes or directly to skills/subagents that need access.' },
      { pinId: 'out_context', description: 'Provides additional context from the MCP server (e.g., resource data, prompts) to connected nodes.' },
    ],
  },
  plugin: {
    summary:
      'Plugins are bundle containers that package skills, subagents, hooks, and tools into a single distributable unit with its own install script.',
    properties: [
      { name: 'Plugin Name', description: 'Unique name for this plugin' },
      { name: 'Version', description: 'Semantic version of the plugin' },
      { name: 'Description', description: 'What this plugin provides' },
      { name: 'Install Script', description: 'Shell command to run during plugin installation' },
    ],
    connectors: [
      { pinId: 'out_bundle', description: 'Exports all bundled skills, subagents, hooks, and tools as a single distributable package. Connect to the project root or other plugins that depend on this one.' },
    ],
  },
};
