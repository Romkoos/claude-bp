import { describe, it, expect } from 'vitest';
import { validateGraph } from './validate';
import type { Node, Edge } from '@xyflow/react';
import type {
  SkillNodeData,
  HookNodeData,
  SubagentNodeData,
  ToolNodeData,
  McpNodeData,
  PluginNodeData,
} from '../types/nodes';
import {
  createSkillData,
  createHookData,
  createSubagentData,
  createToolData,
  createMcpData,
  createPluginData,
  createCommentData,
  createRulesData,
} from '../constants/nodeDefaults';

function makeNode(
  id: string,
  type: string,
  data: Record<string, unknown>
): Node {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function makeEdge(
  source: string,
  target: string,
  data?: Record<string, unknown>
): Edge {
  return { id: `${source}-${target}`, source, target, data };
}

describe('validateGraph', () => {
  it('returns empty results for empty graph', () => {
    expect(validateGraph([], [])).toEqual([]);
  });

  it('skips comment nodes', () => {
    const comment = makeNode('c1', 'comment', createCommentData());
    const results = validateGraph([comment], []);
    expect(results).toEqual([]);
  });

  // --- Skill validations ---

  it('errors on forked skill without agent', () => {
    const data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: {
        ...createSkillData().frontmatter,
        context: 'fork',
        agent: 'inherit',
      },
    };
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Forked skills must specify'))).toBe(true);
  });

  it('no error on forked skill with agent specified', () => {
    const data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: {
        ...createSkillData().frontmatter,
        context: 'fork',
        agent: 'Explore',
      },
    };
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], [makeEdge('x', 's1')]);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Forked skills'))).toBe(false);
  });

  it('warns on skill without description', () => {
    const data = createSkillData();
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'warning' && r.message.includes("won't be auto-discovered"))).toBe(true);
  });

  it('no warning on skill with description', () => {
    const data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: {
        ...createSkillData().frontmatter,
        description: 'A useful skill',
      },
    };
    const node = makeNode('s1', 'skill', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], [makeEdge('x', 's1')]);
    expect(results.some((r) => r.message.includes("won't be auto-discovered"))).toBe(false);
  });

  // --- Hook validations ---

  it('errors on hook without event', () => {
    const data: HookNodeData = {
      ...createHookData(),
      event: '' as HookNodeData['event'],
    };
    const node = makeNode('h1', 'hook', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'error' && r.message.includes('lifecycle event'))).toBe(true);
  });

  it('errors on hook without command', () => {
    const data: HookNodeData = { ...createHookData(), command: '' };
    const node = makeNode('h1', 'hook', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'error' && r.message.includes('must have a command'))).toBe(true);
  });

  it('no errors on valid hook', () => {
    const data: HookNodeData = {
      ...createHookData(),
      event: 'PreToolUse',
      command: 'echo test',
    };
    const node = makeNode('h1', 'hook', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], [makeEdge('x', 'h1')]);
    expect(results.filter((r) => r.level === 'error' && r.nodeId === 'h1')).toHaveLength(0);
  });

  // --- Subagent validations ---

  it('errors on subagent without system prompt', () => {
    const data: SubagentNodeData = { ...createSubagentData(), systemPrompt: '' };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'error' && r.message.includes('system prompt'))).toBe(true);
  });

  it('warns on subagent with empty allowed tools', () => {
    const data: SubagentNodeData = { ...createSubagentData(), allowedTools: [] };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'warning' && r.message.includes('Empty allowed tools'))).toBe(true);
  });

  it('no warning on subagent with allowed tools', () => {
    const data: SubagentNodeData = {
      ...createSubagentData(),
      systemPrompt: 'Do stuff',
      allowedTools: ['Read'],
    };
    const node = makeNode('sa1', 'subagent', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], [makeEdge('x', 'sa1')]);
    expect(results.some((r) => r.message.includes('Empty allowed tools'))).toBe(false);
  });

  // --- Tool validations ---

  it('errors on tool without name', () => {
    const data: ToolNodeData = { ...createToolData(), toolName: '' };
    const node = makeNode('t1', 'tool', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Tool must have a name'))).toBe(true);
  });

  it('errors on tool with whitespace-only name', () => {
    const data: ToolNodeData = { ...createToolData(), toolName: '   ' };
    const node = makeNode('t1', 'tool', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Tool must have a name'))).toBe(true);
  });

  // --- MCP validations ---

  it('errors on MCP without server name', () => {
    const data: McpNodeData = { ...createMcpData(), serverName: '' };
    const node = makeNode('m1', 'mcp', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'error' && r.message.includes('MCP server must have a name'))).toBe(true);
  });

  it('errors on MCP url type without url', () => {
    const data: McpNodeData = {
      ...createMcpData(),
      serverName: 'test',
      connection: { type: 'url', url: '', command: '', args: [] },
    };
    const node = makeNode('m1', 'mcp', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.message.includes('MCP URL server must have a URL'))).toBe(true);
  });

  it('errors on MCP stdio type without command', () => {
    const data: McpNodeData = {
      ...createMcpData(),
      serverName: 'test',
      connection: { type: 'stdio', url: '', command: '', args: [] },
    };
    const node = makeNode('m1', 'mcp', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.message.includes('MCP stdio server must have a command'))).toBe(true);
  });

  it('no errors on valid MCP url', () => {
    const data: McpNodeData = {
      ...createMcpData(),
      serverName: 'test-mcp',
      connection: { type: 'url', url: 'http://example.com', command: '', args: [] },
    };
    const node = makeNode('m1', 'mcp', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], [makeEdge('m1', 'x')]);
    const mcpErrors = results.filter((r) => r.nodeId === 'm1' && r.level === 'error');
    expect(mcpErrors).toHaveLength(0);
  });

  // --- Plugin validations ---

  it('warns on empty plugin', () => {
    const data: PluginNodeData = createPluginData();
    const node = makeNode('p1', 'plugin', data as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'warning' && r.message.includes('Plugin has no children'))).toBe(true);
  });

  it('no warning on plugin with children', () => {
    const plugin = makeNode('p1', 'plugin', createPluginData() as unknown as Record<string, unknown>);
    const child = { ...makeNode('c1', 'skill', createSkillData() as unknown as Record<string, unknown>), parentId: 'p1' };
    const results = validateGraph([plugin, child], [makeEdge('p1', 'c1')]);
    expect(results.some((r) => r.nodeId === 'p1' && r.message.includes('Plugin has no children'))).toBe(false);
  });

  // --- Unconnected node warning ---

  it('warns on unconnected nodes', () => {
    const node = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.level === 'warning' && r.message.includes('not connected'))).toBe(true);
  });

  it('no unconnected warning for connected nodes', () => {
    const a = makeNode('a', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const b = makeNode('b', 'rules', createRulesData() as unknown as Record<string, unknown>);
    const results = validateGraph([a, b], [makeEdge('b', 'a')]);
    expect(results.some((r) => r.nodeId === 'a' && r.message.includes('not connected'))).toBe(false);
    expect(results.some((r) => r.nodeId === 'b' && r.message.includes('not connected'))).toBe(false);
  });

  // --- Default label warning ---

  it('warns on default label', () => {
    const node = makeNode('s1', 'skill', { ...createSkillData(), label: 'New Skill' } as unknown as Record<string, unknown>);
    const results = validateGraph([node], []);
    expect(results.some((r) => r.message.includes('Consider renaming'))).toBe(true);
  });

  it('no warning on custom label', () => {
    const node = makeNode('s1', 'skill', { ...createSkillData(), label: 'My Custom Skill' } as unknown as Record<string, unknown>);
    const results = validateGraph([node], [makeEdge('x', 's1')]);
    expect(results.some((r) => r.nodeId === 's1' && r.message.includes('Consider renaming'))).toBe(false);
  });

  // --- Circular delegation detection ---

  it('detects circular delegation', () => {
    const a = makeNode('a', 'subagent', { ...createSubagentData(), systemPrompt: 'x' } as unknown as Record<string, unknown>);
    const b = makeNode('b', 'subagent', { ...createSubagentData(), systemPrompt: 'y' } as unknown as Record<string, unknown>);
    const edges: Edge[] = [
      makeEdge('a', 'b', { pinType: 'delegation' }),
      makeEdge('b', 'a', { pinType: 'delegation' }),
    ];
    const results = validateGraph([a, b], edges);
    expect(results.some((r) => r.message.includes('Circular delegation'))).toBe(true);
  });

  it('no circular delegation warning for non-circular graphs', () => {
    const a = makeNode('a', 'skill', { ...createSkillData(), label: 'A' } as unknown as Record<string, unknown>);
    const b = makeNode('b', 'subagent', { ...createSubagentData(), systemPrompt: 'x', label: 'B' } as unknown as Record<string, unknown>);
    const edges = [makeEdge('a', 'b', { pinType: 'delegation' })];
    const results = validateGraph([a, b], edges);
    expect(results.some((r) => r.message.includes('Circular delegation'))).toBe(false);
  });

  // --- Duplicate name fields (error) ---

  it('errors on duplicate skill names', () => {
    const s1Data: SkillNodeData = {
      ...createSkillData(),
      label: 'Skill A',
      frontmatter: { ...createSkillData().frontmatter, name: 'deploy' },
    };
    const s2Data: SkillNodeData = {
      ...createSkillData(),
      label: 'Skill B',
      frontmatter: { ...createSkillData().frontmatter, name: 'deploy' },
    };
    const s1 = makeNode('s1', 'skill', s1Data as unknown as Record<string, unknown>);
    const s2 = makeNode('s2', 'skill', s2Data as unknown as Record<string, unknown>);
    const results = validateGraph([s1, s2], [makeEdge('s1', 's2')]);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Duplicate skill name "deploy"'))).toBe(true);
  });

  it('no duplicate error for different skill names', () => {
    const s1Data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'deploy' },
    };
    const s2Data: SkillNodeData = {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, name: 'test' },
    };
    const s1 = makeNode('s1', 'skill', s1Data as unknown as Record<string, unknown>);
    const s2 = makeNode('s2', 'skill', s2Data as unknown as Record<string, unknown>);
    const results = validateGraph([s1, s2], [makeEdge('s1', 's2')]);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Duplicate skill name'))).toBe(false);
  });

  it('ignores skills with empty names for duplicate check', () => {
    const s1 = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const s2 = makeNode('s2', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const results = validateGraph([s1, s2], []);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Duplicate skill name'))).toBe(false);
  });

  it('errors on duplicate subagent names', () => {
    const sa1 = makeNode('sa1', 'subagent', { ...createSubagentData(), name: 'reviewer', label: 'SA1', systemPrompt: 'x' } as unknown as Record<string, unknown>);
    const sa2 = makeNode('sa2', 'subagent', { ...createSubagentData(), name: 'reviewer', label: 'SA2', systemPrompt: 'y' } as unknown as Record<string, unknown>);
    const results = validateGraph([sa1, sa2], [makeEdge('sa1', 'sa2')]);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Duplicate subagent name "reviewer"'))).toBe(true);
  });

  it('errors on duplicate tool names', () => {
    const t1 = makeNode('t1', 'tool', { ...createToolData(), toolName: 'Read', label: 'Tool A' } as unknown as Record<string, unknown>);
    const t2 = makeNode('t2', 'tool', { ...createToolData(), toolName: 'Read', label: 'Tool B' } as unknown as Record<string, unknown>);
    const results = validateGraph([t1, t2], [makeEdge('t1', 't2')]);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Duplicate tool name "Read"'))).toBe(true);
  });

  it('errors on duplicate MCP server names', () => {
    const m1 = makeNode('m1', 'mcp', { ...createMcpData(), serverName: 'github', label: 'MCP A', connection: { type: 'url', url: 'http://a.com', command: '', args: [] } } as unknown as Record<string, unknown>);
    const m2 = makeNode('m2', 'mcp', { ...createMcpData(), serverName: 'github', label: 'MCP B', connection: { type: 'url', url: 'http://b.com', command: '', args: [] } } as unknown as Record<string, unknown>);
    const results = validateGraph([m1, m2], [makeEdge('m1', 'm2')]);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Duplicate MCP server name "github"'))).toBe(true);
  });

  it('errors on duplicate plugin names', () => {
    const p1 = makeNode('p1', 'plugin', { ...createPluginData(), pluginName: 'auth', label: 'Plugin A' } as unknown as Record<string, unknown>);
    const p2 = makeNode('p2', 'plugin', { ...createPluginData(), pluginName: 'auth', label: 'Plugin B' } as unknown as Record<string, unknown>);
    const results = validateGraph([p1, p2], [makeEdge('p1', 'p2')]);
    expect(results.some((r) => r.level === 'error' && r.message.includes('Duplicate plugin name "auth"'))).toBe(true);
  });

  it('no duplicate name error across different types', () => {
    const s1 = makeNode('s1', 'skill', { ...createSkillData(), label: 'A', frontmatter: { ...createSkillData().frontmatter, name: 'deploy' } } as unknown as Record<string, unknown>);
    const t1 = makeNode('t1', 'tool', { ...createToolData(), toolName: 'deploy', label: 'B' } as unknown as Record<string, unknown>);
    const results = validateGraph([s1, t1], [makeEdge('s1', 't1')]);
    expect(results.some((r) => r.level === 'error' && r.message.includes('must have a unique name'))).toBe(false);
  });

  // --- Duplicate labels within same type (warning) ---

  it('warns on duplicate labels within same node type', () => {
    const t1 = makeNode('t1', 'tool', { ...createToolData(), label: 'Deploy Tool', toolName: 'deploy1' } as unknown as Record<string, unknown>);
    const t2 = makeNode('t2', 'tool', { ...createToolData(), label: 'Deploy Tool', toolName: 'deploy2' } as unknown as Record<string, unknown>);
    const results = validateGraph([t1, t2], [makeEdge('t1', 't2')]);
    expect(results.some((r) => r.level === 'warning' && r.message.includes('Duplicate tool label "Deploy Tool"'))).toBe(true);
  });

  it('no duplicate label warning for different labels of same type', () => {
    const t1 = makeNode('t1', 'tool', { ...createToolData(), label: 'Deploy Tool', toolName: 'deploy' } as unknown as Record<string, unknown>);
    const t2 = makeNode('t2', 'tool', { ...createToolData(), label: 'Test Tool', toolName: 'test' } as unknown as Record<string, unknown>);
    const results = validateGraph([t1, t2], [makeEdge('t1', 't2')]);
    expect(results.some((r) => r.message.includes('Duplicate tool label'))).toBe(false);
  });

  it('no duplicate label warning for same labels of different types', () => {
    const s1 = makeNode('s1', 'skill', { ...createSkillData(), label: 'Deploy' } as unknown as Record<string, unknown>);
    const t1 = makeNode('t1', 'tool', { ...createToolData(), label: 'Deploy', toolName: 'deploy' } as unknown as Record<string, unknown>);
    const results = validateGraph([s1, t1], [makeEdge('s1', 't1')]);
    expect(results.some((r) => r.message.includes('Duplicate') && r.message.includes('label'))).toBe(false);
  });

  it('skips default labels for duplicate label check', () => {
    const s1 = makeNode('s1', 'skill', { ...createSkillData(), label: 'New Skill' } as unknown as Record<string, unknown>);
    const s2 = makeNode('s2', 'skill', { ...createSkillData(), label: 'New Skill' } as unknown as Record<string, unknown>);
    const results = validateGraph([s1, s2], []);
    expect(results.some((r) => r.message.includes('Duplicate') && r.message.includes('label'))).toBe(false);
  });

  // --- Duplicate rules labels targeting same node (error) ---

  it('errors on duplicate rules labels targeting the same node', () => {
    const rules1 = makeNode('r1', 'rules', { ...createRulesData(), label: 'Shared Rules' });
    const rules2 = makeNode('r2', 'rules', { ...createRulesData(), label: 'Shared Rules' });
    const skill = makeNode('s1', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'deploy', description: 'test' } });
    const edges: Edge[] = [
      { id: 'e1', source: 'r1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
      { id: 'e2', source: 'r2', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
    ];
    const results = validateGraph([rules1, rules2, skill], edges);
    const dupErrors = results.filter((r) => r.message.includes('Duplicate rules name'));
    expect(dupErrors).toHaveLength(2);
    expect(dupErrors[0].level).toBe('error');
    expect(dupErrors[0].message).toContain('Shared Rules');
    expect(dupErrors[0].message).toContain('deploy');
  });

  it('no error for same rules label targeting different nodes', () => {
    const rules1 = makeNode('r1', 'rules', { ...createRulesData(), label: 'Common Rules' });
    const rules2 = makeNode('r2', 'rules', { ...createRulesData(), label: 'Common Rules' });
    const skill1 = makeNode('s1', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'skill-a', description: 'test' } });
    const skill2 = makeNode('s2', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'skill-b', description: 'test' } });
    const edges: Edge[] = [
      { id: 'e1', source: 'r1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
      { id: 'e2', source: 'r2', target: 's2', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } },
    ];
    const results = validateGraph([rules1, rules2, skill1, skill2], edges);
    const dupErrors = results.filter((r) => r.message.includes('Duplicate rules name'));
    expect(dupErrors).toHaveLength(0);
  });
});
