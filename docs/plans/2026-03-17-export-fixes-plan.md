# Export Fixes: Rules Naming & Connection Awareness — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two export bugs: (1) rules files use node label as filename instead of hardcoded "CLAUDE.md", (2) skill/subagent files include a mandatory integration section reflecting blueprint connections.

**Architecture:** Modify `fileSystemExporter.ts` — change `generateRulesFiles` to use label-based naming, add a shared `buildIntegrationSection` helper that resolves edges into directive text, wire it into `generateSkillFiles` and `generateSubagentFiles`. Update all affected tests.

**Tech Stack:** TypeScript, Vitest, ReactFlow (Node/Edge types)

---

### Task 1: Fix Rules filename — tests

**Files:**
- Modify: `src/serialization/fileSystemExporter.test.ts`

**Step 1: Write failing tests for label-based rules filenames**

Add these tests to the `generateRulesFiles` describe block, replacing the existing ones that expect `CLAUDE.md`:

```typescript
it('uses node label as filename for root scope', () => {
  const data: RulesNodeData = {
    ...createRulesData(),
    label: 'Backend Rules',
    scope: 'root',
    path: '/',
    content: '# Rules',
  };
  const node = makeNode('r1', 'rules', data as unknown as Record<string, unknown>);
  const files = generateRulesFiles([node]);
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('backend-rules.md');
  expect(files[0].content).toBe('# Rules');
  expect(files[0].type).toBe('rules');
});

it('uses node label as filename for subfolder scope', () => {
  const data: RulesNodeData = {
    ...createRulesData(),
    label: 'Component Rules',
    scope: 'subfolder',
    path: 'src/components',
    content: 'Component rules',
  };
  const node = makeNode('r2', 'rules', data as unknown as Record<string, unknown>);
  const files = generateRulesFiles([node]);
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('src/components/component-rules.md');
});

it('falls back to rules.md for empty label', () => {
  const data: RulesNodeData = {
    ...createRulesData(),
    label: '',
    scope: 'root',
    path: '',
    content: 'content',
  };
  const node = makeNode('r4', 'rules', data as unknown as Record<string, unknown>);
  const files = generateRulesFiles([node]);
  expect(files[0].path).toBe('rules.md');
});
```

Update the trailing slash test to use label:
```typescript
it('strips trailing slashes from path', () => {
  const data: RulesNodeData = {
    ...createRulesData(),
    label: 'Src Rules',
    scope: 'subfolder',
    path: 'src/',
    content: '',
  };
  const node = makeNode('r3', 'rules', data as unknown as Record<string, unknown>);
  const files = generateRulesFiles([node]);
  expect(files[0].path).toBe('src/src-rules.md');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: FAIL — paths still contain `CLAUDE.md`

---

### Task 2: Fix Rules filename — implementation

**Files:**
- Modify: `src/serialization/fileSystemExporter.ts` (lines 43-53)

**Step 1: Update generateRulesFiles to use label**

Replace the existing `generateRulesFiles` function:

```typescript
export function generateRulesFiles(nodes: Node[]): ExportedFile[] {
  const rulesNodes = nodes.filter((n) => n.type === 'rules');
  return rulesNodes.map((n) => {
    const data = n.data as unknown as RulesNodeData;
    const filename = `${slugify(data.label) || 'rules'}.md`;
    const filePath =
      data.scope === 'root' || !data.path
        ? filename
        : `${data.path.replace(/\/+$/, '')}/${filename}`;
    return { path: filePath, content: data.content ?? '', type: 'rules' as const };
  });
}
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: PASS

---

### Task 3: Update generateFileTree test for new naming

**Files:**
- Modify: `src/serialization/fileSystemExporter.test.ts`

**Step 1: Fix the generateFileTree test**

In the `generateFileTree` > `'combines all file types'` test, update the assertion:

```typescript
// Old: expect(files.some((f) => f.path === 'CLAUDE.md')).toBe(true);
// New — uses the default label from createRulesData() which is 'CLAUDE.md', slugified to 'claudemd'
// But we should set an explicit label:
```

Update the test to set an explicit label on the rules node:

```typescript
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
```

**Step 2: Run all tests**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: PASS

---

### Task 4: Integration section helper — tests

**Files:**
- Modify: `src/serialization/fileSystemExporter.test.ts`

**Step 1: Write tests for buildIntegrationSection**

Add a new describe block:

```typescript
describe('buildIntegrationSection', () => {
  it('returns empty string when no connections exist', () => {
    const node = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    const result = buildIntegrationSection(node, [], []);
    expect(result).toBe('');
  });

  it('includes context source (rules) as mandatory rules', () => {
    const rulesNode = makeNode('r1', 'rules', { ...createRulesData(), label: 'Backend Rules' } as unknown as Record<string, unknown>);
    const skillNode = makeNode('s1', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'deploy' } } as unknown as Record<string, unknown>);
    const edge: Edge = { id: 'e1', source: 'r1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } };
    const result = buildIntegrationSection(skillNode, [edge], [rulesNode, skillNode]);
    expect(result).toContain('MANDATORY');
    expect(result).toContain('Backend Rules');
    expect(result).toContain('MUST load and follow all rules from');
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: FAIL — `buildIntegrationSection` not exported

---

### Task 5: Integration section helper — implementation

**Files:**
- Modify: `src/serialization/fileSystemExporter.ts`

**Step 1: Add buildIntegrationSection function**

Add after the `slugify` function (around line 37), before the generators:

```typescript
function getNodeLabel(nodeId: string, allNodes: Node[]): string {
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node) return 'unknown';
  const data = node.data as Record<string, unknown>;
  // For subagents, prefer 'name'; for skills, prefer frontmatter.name; otherwise label
  if (node.type === 'subagent') return (data.name as string) || (data.label as string) || 'unknown';
  if (node.type === 'skill') {
    const fm = data.frontmatter as Record<string, unknown> | undefined;
    return (fm?.name as string) || (data.label as string) || 'unknown';
  }
  if (node.type === 'mcp') return (data.serverName as string) || (data.label as string) || 'unknown';
  if (node.type === 'tool') return (data.toolName as string) || (data.label as string) || 'unknown';
  return (data.label as string) || 'unknown';
}

export function buildIntegrationSection(
  node: Node,
  edges: Edge[],
  allNodes: Node[],
): string {
  const lines: string[] = [];

  // Incoming edges (this node is target)
  const incoming = edges.filter((e) => e.target === node.id);
  // Outgoing edges (this node is source)
  const outgoing = edges.filter((e) => e.source === node.id);

  // Context in — rules or MCP providing context
  for (const e of incoming) {
    const sourceNode = allNodes.find((n) => n.id === e.source);
    if (!sourceNode) continue;
    const pinType = (e.data as Record<string, unknown>)?.pinType;

    if (pinType === 'context') {
      const label = getNodeLabel(e.source, allNodes);
      if (sourceNode.type === 'mcp') {
        lines.push(`You MUST use MCP server "${label}" and its provided tools.`);
      } else {
        lines.push(`You MUST load and follow all rules from: "${label}".`);
      }
    }

    if (pinType === 'delegation') {
      const label = getNodeLabel(e.source, allNodes);
      lines.push(`You are invoked by: "${label}".`);
    }

    if (pinType === 'exec') {
      const label = getNodeLabel(e.source, allNodes);
      lines.push(`You receive execution from: "${label}".`);
    }

    if (pinType === 'trigger') {
      const label = getNodeLabel(e.source, allNodes);
      lines.push(`You are triggered by hook: "${label}".`);
    }

    if (pinType === 'bundle') {
      const label = getNodeLabel(e.source, allNodes);
      lines.push(`You are part of plugin bundle: "${label}".`);
    }
  }

  // Outgoing edges
  for (const e of outgoing) {
    const targetNode = allNodes.find((n) => n.id === e.target);
    if (!targetNode) continue;
    const pinType = (e.data as Record<string, unknown>)?.pinType;

    if (pinType === 'delegation') {
      const label = getNodeLabel(e.target, allNodes);
      lines.push(`You MUST delegate to the "${label}" subagent when appropriate.`);
    }

    if (pinType === 'exec') {
      const label = getNodeLabel(e.target, allNodes);
      lines.push(`After completion, you MUST hand off execution to: "${label}".`);
    }

    if (pinType === 'tool-access') {
      const label = getNodeLabel(e.target, allNodes);
      lines.push(`You have access to tool: "${label}".`);
    }
  }

  if (lines.length === 0) return '';

  return `\n\n---\n## MANDATORY: Integration Requirements\n${lines.join('\n')}`;
}
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: PASS

---

### Task 6: Wire integration section into generateSkillFiles and generateSubagentFiles

**Files:**
- Modify: `src/serialization/fileSystemExporter.ts`

**Step 1: Update function signatures to accept edges and allNodes**

Change `generateSkillFiles`:
```typescript
export function generateSkillFiles(nodes: Node[], edges: Edge[], allNodes: Node[]): ExportedFile[] {
```

Change `generateSubagentFiles`:
```typescript
export function generateSubagentFiles(nodes: Node[], edges: Edge[], allNodes: Node[]): ExportedFile[] {
```

**Step 2: Append integration section to file body**

In `generateSkillFiles`, change the content line (around line 109):
```typescript
const integrationSection = buildIntegrationSection(n, edges, allNodes);
files.push({
  path: `${dirPath}/SKILL.md`,
  content: `${fmBlock}${body}${integrationSection}`,
  type: 'skill',
});
```

In `generateSubagentFiles`, change the return (around line 160):
```typescript
const integrationSection = buildIntegrationSection(n, edges, allNodes);
return {
  path: `.claude/agents/${slug}.md`,
  content: `${fmBlock}${body}${integrationSection}`,
  type: 'subagent' as const,
};
```

**Step 3: Update generateFileTree to pass edges and allNodes**

```typescript
export function generateFileTree(nodes: Node[], edges: Edge[]): ExportedFile[] {
  const filteredNodes = nodes.filter((n) => n.type !== 'comment');
  return [
    ...generateRulesFiles(filteredNodes),
    ...generateSkillFiles(filteredNodes, edges, filteredNodes),
    ...generateSubagentFiles(filteredNodes, edges, filteredNodes),
    ...generateSettingsJson(filteredNodes, edges),
  ];
}
```

**Step 4: Run tests**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: PASS (existing tests still pass — they pass empty edges/nodes)

---

### Task 7: Update existing skill/subagent tests for new signatures

**Files:**
- Modify: `src/serialization/fileSystemExporter.test.ts`

**Step 1: Update all generateSkillFiles calls to pass edges and allNodes**

Every call to `generateSkillFiles([node])` becomes `generateSkillFiles([node], [], [node])`.
Every call to `generateSubagentFiles([node])` becomes `generateSubagentFiles([node], [], [node])`.

**Step 2: Add integration test for skill with connections**

```typescript
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
  expect(skillFile.content).toContain('Security Rules');
});
```

**Step 3: Add integration test for subagent with connections**

```typescript
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
```

**Step 4: Run all tests**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: PASS

---

### Task 8: Update default label for Rules nodes

**Files:**
- Modify: `src/constants/nodeDefaults.ts` (line 47)

**Step 1: Change default label**

Change `label: 'CLAUDE.md'` to `label: 'Project Rules'` in `createRulesData()`.

**Step 2: Run all unit tests**

Run: `npx vitest run`
Expected: PASS — verify no other tests depend on the old label

---

### Task 9: Update E2E test suite

**Files:**
- Modify: `docs/test-suites/suite-015-export.json`

**Step 1: Update TC-141**

Change the assertion from expecting "CLAUDE.md" to expecting ".md" (the rules file will be named from the label). Update the test name and description.

**Step 2: Add new test case TC-308 for integration section in export**

Add a test that loads a template with connections, opens export, clicks a skill file, and verifies the content preview contains "MANDATORY".

---

### Task 10: Run full test suite and verify

**Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: all pass

**Step 2: Run E2E export suite**

Run: `node pw_test_runner.cjs --input docs/test-suites/suite-015-export.json --output-dir test-results`
Expected: all pass
