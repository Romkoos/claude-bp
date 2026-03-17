import { describe, it, expect } from 'vitest';
import {
  parseFrontmatterMd,
  parseAllowedTools,
  parseScopedHooks,
  extractDynamicInjections,
  parseSkillMd,
} from './fileSystemImporter';

describe('parseFrontmatterMd', () => {
  it('parses valid frontmatter', () => {
    const content = '---\nname: test\ndescription: hello\n---\nBody content';
    const result = parseFrontmatterMd(content);
    expect(result.frontmatter.name).toBe('test');
    expect(result.frontmatter.description).toBe('hello');
    expect(result.body).toBe('Body content');
  });

  it('returns empty frontmatter for no frontmatter', () => {
    const result = parseFrontmatterMd('Just body content');
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('Just body content');
  });

  it('handles empty content', () => {
    const result = parseFrontmatterMd('');
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('');
  });

  it('handles frontmatter with no body', () => {
    const content = '---\nname: test\n---\n';
    const result = parseFrontmatterMd(content);
    expect(result.frontmatter.name).toBe('test');
    expect(result.body).toBe('');
  });

  it('handles invalid YAML gracefully', () => {
    const content = '---\n: : invalid yaml [[\n---\nBody';
    const result = parseFrontmatterMd(content);
    // Invalid YAML — treated as no frontmatter
    expect(result.body).toBe('Body');
  });

  it('handles multiline body after frontmatter', () => {
    const content = '---\nkey: value\n---\nLine 1\nLine 2\nLine 3';
    const result = parseFrontmatterMd(content);
    expect(result.body).toBe('Line 1\nLine 2\nLine 3');
  });

  it('handles windows-style line endings', () => {
    const content = '---\r\nname: test\r\n---\r\nBody';
    const result = parseFrontmatterMd(content);
    expect(result.frontmatter.name).toBe('test');
    expect(result.body).toBe('Body');
  });
});

describe('parseAllowedTools', () => {
  it('returns empty array for null', () => {
    expect(parseAllowedTools(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseAllowedTools(undefined)).toEqual([]);
  });

  it('wraps string in array', () => {
    expect(parseAllowedTools('Read')).toEqual(['Read']);
  });

  it('returns empty array for empty string', () => {
    expect(parseAllowedTools('')).toEqual([]);
  });

  it('returns array as-is (stringified)', () => {
    expect(parseAllowedTools(['Read', 'Write'])).toEqual(['Read', 'Write']);
  });

  it('converts non-string array items to strings', () => {
    expect(parseAllowedTools([1, true, 'Bash'])).toEqual(['1', 'true', 'Bash']);
  });

  it('returns empty array for non-string/non-array', () => {
    expect(parseAllowedTools(42)).toEqual([]);
    expect(parseAllowedTools({})).toEqual([]);
  });
});

describe('parseScopedHooks', () => {
  it('returns empty for non-array', () => {
    expect(parseScopedHooks(null)).toEqual([]);
    expect(parseScopedHooks('string')).toEqual([]);
    expect(parseScopedHooks(42)).toEqual([]);
  });

  it('parses valid hook array', () => {
    const hooks = [
      { event: 'PreToolUse', matcher: 'Bash', type: 'command', command: 'echo test' },
    ];
    const result = parseScopedHooks(hooks);
    expect(result).toHaveLength(1);
    expect(result[0].event).toBe('PreToolUse');
    expect(result[0].matcher).toBe('Bash');
    expect(result[0].type).toBe('command');
    expect(result[0].command).toBe('echo test');
  });

  it('handles http type', () => {
    const hooks = [{ event: 'Stop', type: 'http', command: 'http://example.com' }];
    const result = parseScopedHooks(hooks);
    expect(result[0].type).toBe('http');
  });

  it('defaults to command type for unknown', () => {
    const hooks = [{ event: 'Stop', type: 'unknown', command: 'cmd' }];
    const result = parseScopedHooks(hooks);
    expect(result[0].type).toBe('command');
  });

  it('filters out null/non-object entries', () => {
    const hooks = [null, 42, 'string', { event: 'Stop', command: 'echo' }];
    const result = parseScopedHooks(hooks);
    expect(result).toHaveLength(1);
  });

  it('defaults missing matcher to empty string', () => {
    const hooks = [{ event: 'PreToolUse', command: 'echo' }];
    const result = parseScopedHooks(hooks);
    expect(result[0].matcher).toBe('');
  });
});

describe('extractDynamicInjections', () => {
  it('extracts backtick commands', () => {
    const body = '! `cat file.txt`\nSome text\n! `ls -la`';
    const result = extractDynamicInjections(body);
    expect(result).toEqual(['cat file.txt', 'ls -la']);
  });

  it('returns empty for no injections', () => {
    expect(extractDynamicInjections('Just text')).toEqual([]);
  });

  it('handles empty string', () => {
    expect(extractDynamicInjections('')).toEqual([]);
  });

  it('ignores non-injection backtick lines', () => {
    const body = 'Use `cat file.txt` for reading\n! `echo test`';
    const result = extractDynamicInjections(body);
    expect(result).toEqual(['echo test']);
  });
});

describe('parseSkillMd', () => {
  it('parses valid skill with name', () => {
    const content = '---\nname: deploy\n---\nDeploy instructions';
    const result = parseSkillMd(content);
    expect(result).not.toBeNull();
    expect(result!.frontmatter.name).toBe('deploy');
    expect(result!.body).toBe('Deploy instructions');
  });

  it('parses valid skill with description only', () => {
    const content = '---\ndescription: Does stuff\n---\nBody';
    const result = parseSkillMd(content);
    expect(result).not.toBeNull();
  });

  it('returns null for skill without name and description', () => {
    const content = '---\nversion: 1.0.0\n---\nBody';
    const result = parseSkillMd(content);
    expect(result).toBeNull();
  });

  it('returns null for content with no frontmatter', () => {
    const content = 'Just instructions without frontmatter';
    const result = parseSkillMd(content);
    expect(result).toBeNull();
  });
});
