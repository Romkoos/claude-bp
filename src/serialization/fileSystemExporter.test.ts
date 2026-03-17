import { describe, it, expect } from 'vitest';
import {
  slugify,
  getNodeDir,
  generateRulesFiles,
  generateSkillFiles,
  generateSubagentFiles,
  generateSettingsJson,
  generateFileTree,
  buildIntegrationSection,
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

describe('getNodeDir', () => {
  it('returns skill directory', () => {
    const node = makeNode('s1', 'skill', {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'deploy' },
    } as unknown as Record<string, unknown>);
    expect(getNodeDir(node)).toBe('.claude/skills/deploy');
  });

  it('returns agents directory for subagent', () => {
    const node = makeNode('a1', 'subagent', {
      ...createSubagentData(),
      name: 'reviewer',
    } as unknown as Record<string, unknown>);
    expect(getNodeDir(node)).toBe('.claude/agents');
  });

  it('returns null for non-skill/non-subagent nodes', () => {
    const node = makeNode('r1', 'rules', createRulesData() as unknown as Record<string, unknown>);
    expect(getNodeDir(node)).toBeNull();
  });

  it('returns skill directory with slugified name', () => {
    const node = makeNode('s1', 'skill', {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'My Cool Skill' },
    } as unknown as Record<string, unknown>);
    expect(getNodeDir(node)).toBe('.claude/skills/my-cool-skill');
  });
});

describe('generateRulesFiles', () => {
  it('places rules in root when no connections', () => {
    const data: RulesNodeData = {
      ...createRulesData(),
      label: 'Backend Rules',
      scope: 'root',
      content: '# Rules',
    };
    const node = makeNode('r1', 'rules', data as unknown as Record<string, unknown>);
    const files = generateRulesFiles([node], [], [node]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('backend-rules.md');
    expect(files[0].content).toBe('# Rules');
  });

  it('places rules in subfolder when no connections and scope=subfolder', () => {
    const data: RulesNodeData = {
      ...createRulesData(),
      label: 'Component Rules',
      scope: 'subfolder',
      path: 'src/components',
      content: 'rules',
    };
    const node = makeNode('r1', 'rules', data as unknown as Record<string, unknown>);
    const files = generateRulesFiles([node], [], [node]);
    expect(files[0].path).toBe('src/components/component-rules.md');
  });

  it('falls back to rules.md for empty label', () => {
    const data: RulesNodeData = {
      ...createRulesData(),
      label: '',
      scope: 'root',
      content: 'content',
    };
    const node = makeNode('r1', 'rules', data as unknown as Record<string, unknown>);
    const files = generateRulesFiles([node], [], [node]);
    expect(files[0].path).toBe('rules.md');
  });

  it('co-locates rules with linked skill', () => {
    const rulesNode = makeNode('r1', 'rules', {
      ...createRulesData(),
      label: 'Security Rules',
      content: '# Security',
    } as unknown as Record<string, unknown>);
    const skillNode = makeNode('s1', 'skill', {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'deploy' },
    } as unknown as Record<string, unknown>);
    const edge: Edge = {
      id: 'e1', source: 'r1', target: 's1',
      sourceHandle: 'out_context', targetHandle: 'in_context',
      data: { pinType: 'context' },
    };
    const files = generateRulesFiles([rulesNode], [edge], [rulesNode, skillNode]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/skills/deploy/security-rules.md');
    expect(files[0].content).toBe('# Security');
  });

  it('co-locates rules with linked subagent', () => {
    const rulesNode = makeNode('r1', 'rules', {
      ...createRulesData(),
      label: 'Review Rules',
      content: '# Review',
    } as unknown as Record<string, unknown>);
    const agentNode = makeNode('a1', 'subagent', {
      ...createSubagentData(),
      name: 'code-reviewer',
    } as unknown as Record<string, unknown>);
    const edge: Edge = {
      id: 'e1', source: 'r1', target: 'a1',
      sourceHandle: 'out_context', targetHandle: 'in_context',
      data: { pinType: 'context' },
    };
    const files = generateRulesFiles([rulesNode], [edge], [rulesNode, agentNode]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/agents/review-rules.md');
  });

  it('duplicates rules for multiple linked targets', () => {
    const rulesNode = makeNode('r1', 'rules', {
      ...createRulesData(),
      label: 'Shared Rules',
      content: '# Shared',
    } as unknown as Record<string, unknown>);
    const skill1 = makeNode('s1', 'skill', {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'skill-a' },
    } as unknown as Record<string, unknown>);
    const skill2 = makeNode('s2', 'skill', {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'skill-b' },
    } as unknown as Record<string, unknown>);
    const edges: Edge[] = [
      { id: 'e1', source: 'r1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
      { id: 'e2', source: 'r1', target: 's2', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
    ];
    const files = generateRulesFiles([rulesNode], edges, [rulesNode, skill1, skill2]);
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe('.claude/skills/skill-a/shared-rules.md');
    expect(files[1].path).toBe('.claude/skills/skill-b/shared-rules.md');
  });

  it('ignores non-context edges', () => {
    const rulesNode = makeNode('r1', 'rules', {
      ...createRulesData(),
      label: 'My Rules',
      content: 'content',
    } as unknown as Record<string, unknown>);
    const skillNode = makeNode('s1', 'skill', {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'test' },
    } as unknown as Record<string, unknown>);
    const edge: Edge = {
      id: 'e1', source: 'r1', target: 's1',
      sourceHandle: 'out_context', targetHandle: 'in_exec',
      data: { pinType: 'exec' },
    };
    const files = generateRulesFiles([rulesNode], [edge], [rulesNode, skillNode]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('my-rules.md');
  });

  it('deduplicates when multiple targets share same directory', () => {
    const rulesNode = makeNode('r1', 'rules', {
      ...createRulesData(),
      label: 'Agent Rules',
      content: '# Rules',
    } as unknown as Record<string, unknown>);
    const agent1 = makeNode('a1', 'subagent', { ...createSubagentData(), name: 'agent-a' } as unknown as Record<string, unknown>);
    const agent2 = makeNode('a2', 'subagent', { ...createSubagentData(), name: 'agent-b' } as unknown as Record<string, unknown>);
    const edges: Edge[] = [
      { id: 'e1', source: 'r1', target: 'a1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
      { id: 'e2', source: 'r1', target: 'a2', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
    ];
    const files = generateRulesFiles([rulesNode], edges, [rulesNode, agent1, agent2]);
    // Both subagents share .claude/agents/ — only one copy
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/agents/agent-rules.md');
  });

  it('strips trailing slashes from subfolder path', () => {
    const data: RulesNodeData = {
      ...createRulesData(),
      label: 'Src Rules',
      scope: 'subfolder',
      path: 'src/',
      content: '',
    };
    const node = makeNode('r1', 'rules', data as unknown as Record<string, unknown>);
    const files = generateRulesFiles([node], [], [node]);
    expect(files[0].path).toBe('src/src-rules.md');
  });

  it('skips non-rules nodes', () => {
    const node = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    expect(generateRulesFiles([node], [], [node])).toHaveLength(0);
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

  it('appends integration section when edges exist', () => {
    const rulesNode = makeNode('r1', 'rules', { ...createRulesData(), label: 'Security Rules' } as unknown as Record<string, unknown>);
    const skillData: SkillNodeData = {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'deploy' },
      instructions: 'Deploy the app',
    };
    const skillNode = makeNode('s1', 'skill', skillData as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 'r1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } };
    const allNodes = [rulesNode, skillNode];
    const files = generateSkillFiles([skillNode], [edge], allNodes);
    const skillFile = files.find((f) => f.path.endsWith('SKILL.md'))!;
    expect(skillFile.content).toContain('Deploy the app');
    expect(skillFile.content).toContain('MANDATORY');
    expect(skillFile.content).toContain('security-rules.md');
  });
});

describe('generateSubagentFiles', () => {
  it('generates agent markdown file', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'Code Reviewer',
      description: 'Reviews code',
      model: 'opus',
      allowedTools: ['Read'],
      systemPrompt: 'Review code carefully',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/agents/code-reviewer.md');
    expect(files[0].content).toContain('---');
    expect(files[0].content).toContain('name: Code Reviewer');
    expect(files[0].content).toContain('description: Reviews code');
    expect(files[0].content).toContain('Review code carefully');
    expect(files[0].type).toBe('subagent');
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
    expect(files[0].content).toContain('maxTurns: 10');
  });

  it('appends integration section when edges exist', () => {
    const skillNode = makeNode('s1', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'orchestrator' } } as unknown as Record<string, unknown>);
    const agentData: SubagentNodeData = {
      ...createSubagentData(),
      name: 'Code Reviewer',
      description: 'Reviews code',
      systemPrompt: 'Review carefully',
    };
    const agentNode = makeNode('a1', 'subagent', agentData as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 's1', target: 'a1', sourceHandle: 'out_delegation', targetHandle: 'in_delegation', data: { pinType: 'delegation' } };
    const allNodes = [skillNode, agentNode];
    const files = generateSubagentFiles([agentNode], [edge], allNodes);
    expect(files[0].content).toContain('Review carefully');
    expect(files[0].content).toContain('MANDATORY');
    expect(files[0].content).toContain('invoked by');
    expect(files[0].content).toContain('orchestrator');
  });

  it('always includes name in frontmatter', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'my-agent',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('name: my-agent');
  });

  it('includes disallowedTools when set', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'safe-agent',
      disallowedTools: ['Write', 'Edit'],
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('disallowedTools:');
    expect(files[0].content).toContain('Write');
    expect(files[0].content).toContain('Edit');
  });

  it('omits disallowedTools when empty', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'basic',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).not.toContain('disallowedTools');
  });

  it('includes permissionMode when set', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'restricted-agent',
      permissionMode: 'dontAsk',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('permissionMode: dontAsk');
  });

  it('omits permissionMode when null', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'basic',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).not.toContain('permissionMode');
  });

  it('includes background when true', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'bg-agent',
      background: true,
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('background: true');
  });

  it('omits background when false', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'basic',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).not.toContain('background');
  });

  it('includes isolation when set', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'isolated-agent',
      isolation: 'worktree',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('isolation: worktree');
  });

  it('omits isolation when null', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'basic',
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).not.toContain('isolation');
  });

  it('uses tools instead of allowed_tools in frontmatter', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      name: 'tool-agent',
      allowedTools: ['Read', 'Bash'],
      systemPrompt: 'test',
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const files = generateSubagentFiles([node]);
    expect(files[0].content).toContain('tools:');
    expect(files[0].content).not.toContain('allowed_tools');
  });

  it('includes mcpServers from connected MCP nodes (inline for exclusive)', () => {
    const mcpData: McpNodeData = {
      ...createMcpData(),
      serverName: 'playwright',
      connection: { type: 'stdio', url: '', command: 'npx', args: ['-y', '@playwright/mcp'] },
    };
    const mcpNode = makeNode('m1', 'mcp', mcpData as unknown as Record<string, unknown>);
    const agentData: SubagentNodeData = {
      ...createSubagentData(),
      name: 'browser-agent',
      systemPrompt: 'test',
    };
    const agentNode = makeNode('a1', 'subagent', agentData as unknown as Record<string, unknown>);
    const edge: Edge = {
      id: 'e1', source: 'm1', target: 'a1',
      sourceHandle: 'out_context', targetHandle: 'in_context',
      data: { pinType: 'context' },
    };
    const files = generateSubagentFiles([agentNode], [edge], [mcpNode, agentNode]);
    expect(files[0].content).toContain('mcpServers:');
    expect(files[0].content).toContain('playwright');
  });

  it('includes mcpServers as string ref when shared', () => {
    const mcpData: McpNodeData = {
      ...createMcpData(),
      serverName: 'github',
      connection: { type: 'url', url: 'http://localhost', command: '', args: [] },
    };
    const mcpNode = makeNode('m1', 'mcp', mcpData as unknown as Record<string, unknown>);
    const agentData: SubagentNodeData = {
      ...createSubagentData(),
      name: 'gh-agent',
      systemPrompt: 'test',
    };
    const agentNode = makeNode('a1', 'subagent', agentData as unknown as Record<string, unknown>);
    const skillNode = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const edges: Edge[] = [
      { id: 'e1', source: 'm1', target: 'a1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
      { id: 'e2', source: 'm1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
    ];
    const files = generateSubagentFiles([agentNode], edges, [mcpNode, agentNode, skillNode]);
    expect(files[0].content).toContain('mcpServers:');
    expect(files[0].content).toContain('github');
  });
});

describe('buildIntegrationSection', () => {
  it('returns empty string when no connections exist', () => {
    const node = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const result = buildIntegrationSection(node, [], []);
    expect(result).toBe('');
  });

  it('includes context source (rules) as co-located file reference', () => {
    const rulesNode = makeNode('r1', 'rules', { ...createRulesData(), label: 'Backend Rules' } as unknown as Record<string, unknown>);
    const skillNode = makeNode('s1', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'deploy' } } as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 'r1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } };
    const result = buildIntegrationSection(skillNode, [edge], [rulesNode, skillNode]);
    expect(result).toContain('MANDATORY');
    expect(result).toContain('backend-rules.md');
    expect(result).toContain('co-located in this directory');
  });

  it('includes delegation targets', () => {
    const skillNode = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const agentNode = makeNode('a1', 'subagent', { ...createSubagentData(), name: 'Code Review Agent' } as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 's1', target: 'a1', sourceHandle: 'out_delegation', targetHandle: 'in_delegation', data: { pinType: 'delegation' } };
    const result = buildIntegrationSection(skillNode, [edge], [skillNode, agentNode]);
    expect(result).toContain('MUST delegate');
    expect(result).toContain('Code Review Agent');
  });

  it('includes exec handoff', () => {
    const skill1 = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const skill2 = makeNode('s2', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'next-step' } } as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 's1', target: 's2', sourceHandle: 'out_exec', targetHandle: 'in_exec', data: { pinType: 'exec' } };
    const result = buildIntegrationSection(skill1, [edge], [skill1, skill2]);
    expect(result).toContain('MUST hand off execution to');
  });

  it('includes trigger source', () => {
    const hookNode = makeNode('h1', 'hook', { ...createHookData(), label: 'Lint Hook' } as unknown as Record<string, unknown>);
    const skillNode = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 'h1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_trigger', data: { pinType: 'trigger' } };
    const result = buildIntegrationSection(skillNode, [edge], [hookNode, skillNode]);
    expect(result).toContain('triggered by hook');
    expect(result).toContain('Lint Hook');
  });

  it('includes tool access', () => {
    const skillNode = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const toolNode = makeNode('t1', 'tool', { ...createToolData(), toolName: 'Read', label: 'Read' } as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 's1', target: 't1', sourceHandle: 'out_tools', targetHandle: 'in_used_by', data: { pinType: 'tool-access' } };
    const result = buildIntegrationSection(skillNode, [edge], [skillNode, toolNode]);
    expect(result).toContain('access to tool');
    expect(result).toContain('Read');
  });

  it('includes MCP context', () => {
    const mcpNode = makeNode('m1', 'mcp', { ...createMcpData(), serverName: 'github-mcp', label: 'GitHub MCP' } as unknown as Record<string, unknown>);
    const skillNode = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 'm1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } };
    const result = buildIntegrationSection(skillNode, [edge], [mcpNode, skillNode]);
    expect(result).toContain('MUST use MCP server');
    expect(result).toContain('github-mcp');
  });

  it('includes delegation source (invoked by)', () => {
    const skillNode = makeNode('s1', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'caller' } } as unknown as Record<string, unknown>);
    const agentNode = makeNode('a1', 'subagent', { ...createSubagentData(), name: 'Worker' } as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 's1', target: 'a1', sourceHandle: 'out_delegation', targetHandle: 'in_delegation', data: { pinType: 'delegation' } };
    const result = buildIntegrationSection(agentNode, [edge], [skillNode, agentNode]);
    expect(result).toContain('invoked by');
    expect(result).toContain('caller');
  });

  it('includes exec source (receives execution from)', () => {
    const skill1 = makeNode('s1', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'prev-step' } } as unknown as Record<string, unknown>);
    const skill2 = makeNode('s2', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 's1', target: 's2', sourceHandle: 'out_exec', targetHandle: 'in_exec', data: { pinType: 'exec' } };
    const result = buildIntegrationSection(skill2, [edge], [skill1, skill2]);
    expect(result).toContain('receive execution from');
  });

  it('includes bundle source (plugin)', () => {
    const pluginNode = makeNode('p1', 'plugin', { label: 'Deploy Plugin', collapsed: true, validation: { errors: [], warnings: [] }, pluginName: 'deploy', version: '1.0.0', description: '', installScript: '' } as unknown as Record<string, unknown>);
    const skillNode = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 'p1', target: 's1', sourceHandle: 'out_bundle', targetHandle: 'in_context', data: { pinType: 'bundle' } };
    const result = buildIntegrationSection(skillNode, [edge], [pluginNode, skillNode]);
    expect(result).toContain('plugin bundle');
    expect(result).toContain('Deploy Plugin');
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
    const rules = makeNode('r1', 'rules', { ...createRulesData(), label: 'Project Rules', content: '# Rules' } as unknown as Record<string, unknown>);
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
    expect(files.some((f) => f.path === 'project-rules.md')).toBe(true);
    expect(files.some((f) => f.path.includes('SKILL.md'))).toBe(true);
    expect(files.some((f) => f.path === '.claude/settings.json')).toBe(true);
  });

  it('filters out comment nodes', () => {
    const comment = makeNode('c1', 'comment', createCommentData() as unknown as Record<string, unknown>);
    const files = generateFileTree([comment], []);
    expect(files).toHaveLength(0);
  });
});
