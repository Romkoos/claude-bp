import { describe, it, expect } from 'vitest';
import {
  NODE_PIN_DEFINITIONS,
  createRulesData,
  createSkillData,
  createSubagentData,
  createHookData,
  createToolData,
  createMcpData,
  createPluginData,
  createCommentData,
} from './nodeDefaults';
import { PinDirection } from '../types/pins';

describe('NODE_PIN_DEFINITIONS', () => {
  it('has definitions for all 8 node types', () => {
    const types = ['rules', 'skill', 'subagent', 'hook', 'tool', 'mcp', 'plugin', 'comment'];
    types.forEach((type) => {
      expect(NODE_PIN_DEFINITIONS).toHaveProperty(type);
    });
  });

  it('comment has no pins', () => {
    expect(NODE_PIN_DEFINITIONS.comment).toEqual([]);
  });

  it('all pin definitions have required fields', () => {
    for (const [, pins] of Object.entries(NODE_PIN_DEFINITIONS)) {
      for (const pin of pins) {
        expect(pin.id).toBeTruthy();
        expect(pin.type).toBeTruthy();
        expect([PinDirection.In, PinDirection.Out]).toContain(pin.direction);
        expect(pin.label).toBeTruthy();
      }
    }
  });

  it('rules has only output pins', () => {
    const rulesPins = NODE_PIN_DEFINITIONS.rules;
    expect(rulesPins.every((p) => p.direction === PinDirection.Out)).toBe(true);
  });

  it('tool has only input pins', () => {
    const toolPins = NODE_PIN_DEFINITIONS.tool;
    expect(toolPins.every((p) => p.direction === PinDirection.In)).toBe(true);
  });

  it('pin ids are unique within each node type', () => {
    for (const [, pins] of Object.entries(NODE_PIN_DEFINITIONS)) {
      const ids = pins.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('createRulesData', () => {
  it('creates default rules data', () => {
    const data = createRulesData();
    expect(data.label).toBe('Rules');
    expect(data.collapsed).toBe(true);
    expect(data.validation).toEqual({ errors: [], warnings: [] });
    expect(data.scope).toBe('root');
    expect(data.path).toBe('/');
    expect(data.content).toContain('Project Rules');
    expect(data.priority).toBe(0);
  });

  it('returns new instance each call', () => {
    const a = createRulesData();
    const b = createRulesData();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.validation).not.toBe(b.validation);
  });
});

describe('createSkillData', () => {
  it('creates default skill data', () => {
    const data = createSkillData();
    expect(data.label).toBe('New Skill');
    expect(data.frontmatter.context).toBe('conversation');
    expect(data.frontmatter.agent).toBe('inherit');
    expect(data.frontmatter.model).toBe('inherit');
    expect(data.frontmatter.version).toBe('1.0.0');
    expect(data.frontmatter.allowedTools).toEqual([]);
    expect(data.scopedHooks).toEqual([]);
    expect(data.instructions).toBe('');
    expect(data.dynamicInjections).toEqual([]);
    expect(data.referenceFiles).toEqual([]);
  });

  it('returns new instance each call', () => {
    const a = createSkillData();
    const b = createSkillData();
    expect(a).not.toBe(b);
    expect(a.frontmatter).not.toBe(b.frontmatter);
  });
});

describe('createSubagentData', () => {
  it('creates default subagent data', () => {
    const data = createSubagentData();
    expect(data.label).toBe('New Subagent');
    expect(data.agentType).toBe('general-purpose');
    expect(data.model).toBe('inherit');
    expect(data.allowedTools).toEqual([]);
    expect(data.maxTurns).toBeNull();
    expect(data.systemPrompt).toBe('');
    expect(data.scopedHooks).toEqual([]);
    expect(data.skills).toEqual([]);
  });
});

describe('createHookData', () => {
  it('creates default hook data', () => {
    const data = createHookData();
    expect(data.label).toBe('New Hook');
    expect(data.event).toBe('PreToolUse');
    expect(data.matcher).toBe('*');
    expect(data.hookType).toBe('command');
    expect(data.command).toBe('');
    expect(data.timeoutMs).toBe(60000);
    expect(data.decision).toEqual({ type: 'none', reason: '', modifyInput: false });
    expect(data.continueAfter).toBe(true);
  });
});

describe('createToolData', () => {
  it('creates default tool data', () => {
    const data = createToolData();
    expect(data.label).toBe('New Tool');
    expect(data.toolName).toBe('Bash');
    expect(data.pattern).toBe('');
    expect(data.builtin).toBe(true);
  });
});

describe('createMcpData', () => {
  it('creates default MCP data', () => {
    const data = createMcpData();
    expect(data.label).toBe('New MCP Server');
    expect(data.serverName).toBe('');
    expect(data.connection.type).toBe('url');
    expect(data.connection.url).toBe('');
    expect(data.connection.command).toBe('');
    expect(data.connection.args).toEqual([]);
    expect(data.env).toEqual({});
    expect(data.providedTools).toEqual([]);
  });
});

describe('createPluginData', () => {
  it('creates default plugin data', () => {
    const data = createPluginData();
    expect(data.label).toBe('New Plugin');
    expect(data.pluginName).toBe('');
    expect(data.version).toBe('1.0.0');
    expect(data.description).toBe('');
    expect(data.installScript).toBe('');
  });
});

describe('createCommentData', () => {
  it('creates default comment data', () => {
    const data = createCommentData();
    expect(data.label).toBe('');
    expect(data.content).toBe('');
    expect(data.color).toBe('yellow');
    expect(data.width).toBe(200);
    expect(data.height).toBe(120);
  });
});
