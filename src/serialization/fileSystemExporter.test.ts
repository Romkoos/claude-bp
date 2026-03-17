import { describe, it, expect } from 'vitest';
import {
  slugify,
  generateRulesFiles,
  generateSkillFiles,
  generateSubagentFiles,
  generateSettingsJson,
  generateFileTree,
} from './fileSystemExporter';
import type { Node, Edge } from '@xyflow/react';
import {
  createRulesData,
  createSkillData,
  createSubagentData,
  createHookData,
  createToolData,
  createMcpData,
  createCommentData,
} from '../constants/nodeDefaults';
import type {
  RulesNodeData,
  SkillNodeData,
  SubagentNodeData,
  HookNodeData,
  ToolNodeData,
  McpNodeData,
} from '../types/nodes';

function makeNode(id: string, type: string, data: Record<string, unknown>): Node {
  return { id, type, position: { x: 0, y: 0 }, data };
}

describe('slugify', () => {
  it('lowercases and trims', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('my skill name')).toBe('my-skill-name');
  });

  it('removes special characters', () => {
    expect(slugify('test@#$%name')).toBe('testname');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a---b')).toBe('a-b');
  });

  it('removes leading/trailing hyphens', () => {
    expect(slugify('-test-')).toBe('test');
  });

  it('handles underscores', () => {
    expect(slugify('my_skill_name')).toBe('my-skill-name');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('generateRulesFiles', () => {
  it('generates CLAUDE.md for root scope', () => {
    const data: RulesNodeData = {
      ...createRulesData(),
      scope: 'root',
      path: '/',
      content: '# Rules',
    };
    const node = makeNode('r1', 'rules', data as unknown as Record<string, unknown>);
    const files = generateRulesFiles([node]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('CLAUDE.md');
    expect(files[0].content).toBe('# Rules');
    expect(files[0].type).toBe('rules');
  });

  it('generates subfolder CLAUDE.md', () => {
    const data: RulesNodeData = {
      ...createRulesData(),
      scope: 'subfolder',
      path: 'src/components',
      content: 'Component rules',
    };
    const node = makeNode('r2', 'rules', data as unknown as Record<string, unknown>);
    const files = generateRulesFiles([node]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/components/CLAUDE.md');
  });

  it('strips trailing slashes from path', () => {
    const data: RulesNodeData = {
      ...createRulesData(),
      scope: 'subfolder',
      path: 'src/',
      content: '',
    };
    const node = makeNode('r3', 'rules', data as unknown as Record<string, unknown>);
    const files = generateRulesFiles([node]);
    expect(files[0].path).toBe('src/CLAUDE.md');
  });

  it('skips non-rules nodes', () => {
    const node = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    expect(generateRulesFiles([node])).toHaveLength(0);
  });

  it('handles empty path as root', () => {
    const data: RulesNodeData = {
      ...createRulesData(),
      scope: 'root',
      path: '',
      content: 'content',
    };
    const node = makeNode('r4', 'rules', data as unknown as Record<string, unknown>);
    const files = generateRulesFiles([node]);
    expect(files[0].path).toBe('CLAUDE.md');
  });
});

describe('generateSkillFiles', () => {
  it('generates SKILL.md with frontmatter', () => {
    const data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: {
        ...createSkillData().frontmatter,
        name: 'my-skill',
        description: 'A skill',
        context: 'fork',
        agent: 'Explore',
        allowedTools: ['Read', 'Write'],
        model: 'claude-opus-4',
        version: '2.0.0',
      },
      instructions: 'Do something',
    };
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const files = generateSkillFiles([node]);
    expect(files.length).toBeGreaterThanOrEqual(1);
    const skillFile = files.find((f) => f.path.endsWith('SKILL.md'));
    expect(skillFile).toBeDefined();
    expect(skillFile!.path).toBe('.claude/skills/my-skill/SKILL.md');
    expect(skillFile!.content).toContain('---');
    expect(skillFile!.content).toContain('name: my-skill');
    expect(skillFile!.content).toContain('Do something');
    expect(skillFile!.content).toContain('context: fork');
  });

  it('omits default frontmatter values', () => {
    const data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: {
        ...createSkillData().frontmatter,
        name: 'basic',
        description: 'test',
      },
      instructions: 'body',
    };
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const files = generateSkillFiles([node]);
    const skillFile = files.find((f) => f.path.endsWith('SKILL.md'))!;
    // Default values should be omitted
    expect(skillFile.content).not.toContain('context: conversation');
    expect(skillFile.content).not.toContain('agent: inherit');
    expect(skillFile.content).not.toContain('model: inherit');
    expect(skillFile.content).not.toContain('version: 1.0.0');
  });

  it('generates reference file placeholders', () => {
    const data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'ref-test' },
      referenceFiles: ['schema.json', 'README.md'],
      instructions: '',
    };
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const files = generateSkillFiles([node]);
    expect(files.some((f) => f.path.includes('schema.json'))).toBe(true);
    expect(files.some((f) => f.path.includes('README.md'))).toBe(true);
  });

  it('uses "untitled-skill" for empty name', () => {
    const data = createSkillData();
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const files = generateSkillFiles([node]);
    const skillFile = files.find((f) => f.path.endsWith('SKILL.md'));
    expect(skillFile!.path).toContain('untitled-skill');
  });

  it('generates scoped hooks in frontmatter', () => {
    const data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'hooked' },
      scopedHooks: [
        { event: 'PreToolUse', matcher: 'Bash', type: 'command', command: 'echo check' },
      ],
      instructions: '',
    };
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const files = generateSkillFiles([node]);
    const skillFile = files.find((f) => f.path.endsWith('SKILL.md'))!;
    expect(skillFile.content).toContain('hooks:');
    expect(skillFile.content).toContain('PreToolUse');
  });

  it('generates dynamic injections in frontmatter', () => {
    const data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'injected' },
      dynamicInjections: ['src/**/*.ts'],
      instructions: '',
    };
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const files = generateSkillFiles([node]);
    const skillFile = files.find((f) => f.path.endsWith('SKILL.md'))!;
    expect(skillFile.content).toContain('dynamic_injections:');
  });
});

describe('generateSubagentFiles', () => {
  it('generates agent markdown file', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'Code Reviewer',
      description: 'Reviews code',
      agentType: 'Explore',
      model: 'claude-opus-4',
      allowedTools: ['Read'],
      systemPrompt: 'Review code carefully',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/agents/code-reviewer.md');
    expect(files[0].content).toContain('---');
    expect(files[0].content).toContain('description: Reviews code');
    expect(files[0].content).toContain('Review code carefully');
    expect(files[0].type).toBe('subagent');
  });

  it('omits default agent type', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'basic',
      agentType: 'general-purpose',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).not.toContain('agent_type');
  });

  it('omits default model', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'basic',
      model: 'inherit',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).not.toContain('model');
  });

  it('uses untitled-agent for empty name', () => {
    const node = makeNode('sa1', 'subagent', createSubagentData() as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].path).toContain('untitled-agent');
  });

  it('includes scoped hooks', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'hooked-agent',
      scopedHooks: [
        { event: 'PreToolUse', matcher: 'Bash', type: 'command', command: 'echo test' },
      ],
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('hooks:');
  });

  it('includes skills list', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'skilled-agent',
      skills: ['deploy', 'test'],
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('skills:');
    expect(files[0].content).toContain('deploy');
  });

  it('includes max_turns when set', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'limited-agent',
      maxTurns: 10,
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('max_turns: 10');
  });
});

describe('generateSettingsJson', () => {
  it('returns empty for no hooks/tools/mcp', () => {
    const result = generateSettingsJson([], []);
    expect(result).toHaveLength(0);
  });

  it('generates hooks section', () => {
    const data: HookNodeData = {
      ...createHookData(),
      event: 'PreToolUse',
      command: 'echo check',
      hookType: 'command',
      matcher: 'Bash',
      timeoutMs: 5000,
    };
    const node = makeNode('h1', 'hook', data as unknown as Record<string, unknown>);
    const files = generateSettingsJson([node], []);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/settings.json');
    const settings = JSON.parse(files[0].content);
    expect(settings.hooks).toBeDefined();
    expect(settings.hooks.PreToolUse).toHaveLength(1);
    expect(settings.hooks.PreToolUse[0].command).toBe('echo check');
    expect(settings.hooks.PreToolUse[0].timeout_ms).toBe(5000);
  });

  it('omits default timeout', () => {
    const data: HookNodeData = {
      ...createHookData(),
      event: 'PreToolUse',
      command: 'echo',
      timeoutMs: 60000,
    };
    const node = makeNode('h1', 'hook', data as unknown as Record<string, unknown>);
    const files = generateSettingsJson([node], []);
    const settings = JSON.parse(files[0].content);
    expect(settings.hooks.PreToolUse[0].timeout_ms).toBeUndefined();
  });

  it('includes decision fields', () => {
    const data: HookNodeData = {
      ...createHookData(),
      event: 'PreToolUse',
      command: 'echo',
      decision: { type: 'deny', reason: 'Blocked', modifyInput: true },
    };
    const node = makeNode('h1', 'hook', data as unknown as Record<string, unknown>);
    const files = generateSettingsJson([node], []);
    const settings = JSON.parse(files[0].content);
    const hook = settings.hooks.PreToolUse[0];
    expect(hook.decision).toBe('deny');
    expect(hook.reason).toBe('Blocked');
    expect(hook.modify_input).toBe(true);
  });

  it('generates permissions from tool nodes', () => {
    const data: ToolNodeData = {
      ...createToolData(),
      toolName: 'Bash',
      pattern: 'npm:*',
    };
    const node = makeNode('t1', 'tool', data as unknown as Record<string, unknown>);
    const files = generateSettingsJson([node], []);
    const settings = JSON.parse(files[0].content);
    expect(settings.permissions.allow).toContain('Bash:npm:*');
  });

  it('generates deny permissions when edge says deny', () => {
    const data: ToolNodeData = { ...createToolData(), toolName: 'Bash' };
    const node = makeNode('t1', 'tool', data as unknown as Record<string, unknown>);
    const edge: Edge = {
      id: 'e1',
      source: 't1',
      target: 'x',
      data: { permission: 'deny' },
    };
    const files = generateSettingsJson([node], [edge]);
    const settings = JSON.parse(files[0].content);
    expect(settings.permissions.deny).toContain('Bash');
  });

  it('generates MCP servers section', () => {
    const data: McpNodeData = {
      ...createMcpData(),
      serverName: 'my-server',
      connection: {
        type: 'url',
        url: 'http://localhost:3000',
        command: '',
        args: [],
      },
      env: { API_KEY: 'test' },
    };
    const node = makeNode('m1', 'mcp', data as unknown as Record<string, unknown>);
    const files = generateSettingsJson([node], []);
    const settings = JSON.parse(files[0].content);
    expect(settings.mcpServers['my-server']).toBeDefined();
    expect(settings.mcpServers['my-server'].url).toBe('http://localhost:3000');
    expect(settings.mcpServers['my-server'].env.API_KEY).toBe('test');
  });

  it('generates stdio MCP with args', () => {
    const data: McpNodeData = {
      ...createMcpData(),
      serverName: 'local-server',
      connection: {
        type: 'stdio',
        url: '',
        command: 'npx',
        args: ['@my/mcp-server', '--port', '3000'],
      },
    };
    const node = makeNode('m1', 'mcp', data as unknown as Record<string, unknown>);
    const files = generateSettingsJson([node], []);
    const settings = JSON.parse(files[0].content);
    expect(settings.mcpServers['local-server'].type).toBe('stdio');
    expect(settings.mcpServers['local-server'].command).toBe('npx');
    expect(settings.mcpServers['local-server'].args).toEqual(['@my/mcp-server', '--port', '3000']);
  });
});

describe('generateFileTree', () => {
  it('combines all file types', () => {
    const rules = makeNode('r1', 'rules', { ...createRulesData(), content: '# Rules' } as unknown as Record<string, unknown>);
    const skill = makeNode('s1', 'skill', {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'test' },
      instructions: 'body',
    } as unknown as Record<string, unknown>);
    const hook = makeNode('h1', 'hook', {
      ...createHookData(),
      event: 'PreToolUse',
      command: 'echo',
    } as unknown as Record<string, unknown>);
    const files = generateFileTree([rules, skill, hook], []);
    expect(files.some((f) => f.path === 'CLAUDE.md')).toBe(true);
    expect(files.some((f) => f.path.includes('SKILL.md'))).toBe(true);
    expect(files.some((f) => f.path === '.claude/settings.json')).toBe(true);
  });

  it('filters out comment nodes', () => {
    const comment = makeNode('c1', 'comment', createCommentData() as unknown as Record<string, unknown>);
    const files = generateFileTree([comment], []);
    expect(files).toHaveLength(0);
  });
});
