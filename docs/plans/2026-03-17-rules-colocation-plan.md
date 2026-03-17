# Rules Co-location Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rules files co-locate with their linked target nodes (skills/subagents), and validator catches duplicate rules names targeting the same node.

**Architecture:** Modify `generateRulesFiles` to accept edges/allNodes, resolve target directories from connected nodes, produce one file per target. Update `buildIntegrationSection` to reference the co-located filename. Add validation rule in `validateGraph`.

**Tech Stack:** TypeScript, Vitest, ReactFlow (Node/Edge types)

---

### Task 1: Add helper to resolve target directory for a node

**Files:**
- Modify: `src/serialization/fileSystemExporter.ts`
- Modify: `src/serialization/fileSystemExporter.test.ts`

**Step 1: Write failing tests**

Add to `fileSystemExporter.test.ts`, new describe block:

```typescript
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
```

Also add `getNodeDir` to imports from `./fileSystemExporter`.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: FAIL — `getNodeDir` not exported

**Step 3: Implement getNodeDir**

Add to `fileSystemExporter.ts` after `slugify`, before `getNodeLabel`:

```typescript
export function getNodeDir(node: Node): string | null {
  if (node.type === 'skill') {
    const data = node.data as unknown as SkillNodeData;
    const name = data.frontmatter?.name || 'untitled-skill';
    return `.claude/skills/${slugify(name)}`;
  }
  if (node.type === 'subagent') {
    const data = node.data as unknown as SubagentNodeData;
    return '.claude/agents';
  }
  return null;
}
```

**Step 4: Run tests**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: PASS

---

### Task 2: Update generateRulesFiles for co-location

**Files:**
- Modify: `src/serialization/fileSystemExporter.ts`
- Modify: `src/serialization/fileSystemExporter.test.ts`

**Step 1: Write failing tests**

Replace the existing `generateRulesFiles` tests (keep 'skips non-rules nodes') with:

```typescript
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

  it('skips non-rules nodes', () => {
    const node = makeNode('s1', 'skill', createSkillData() as unknown as Record<string, unknown>);
    expect(generateRulesFiles([node], [], [node])).toHaveLength(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: FAIL — signature mismatch

**Step 3: Implement updated generateRulesFiles**

Replace `generateRulesFiles` in `fileSystemExporter.ts`:

```typescript
export function generateRulesFiles(nodes: Node[], edges: Edge[] = [], allNodes: Node[] = []): ExportedFile[] {
  const rulesNodes = nodes.filter((n) => n.type === 'rules');
  return rulesNodes.flatMap((n) => {
    const data = n.data as unknown as RulesNodeData;
    const filename = `${slugify(data.label) || 'rules'}.md`;
    const content = data.content ?? '';

    // Find context edges from this rules node
    const contextTargets = edges
      .filter((e) => e.source === n.id && (e.data as Record<string, unknown>)?.pinType === 'context')
      .map((e) => allNodes.find((nd) => nd.id === e.target))
      .filter((nd): nd is Node => nd != null);

    // If linked to targets, co-locate with each target
    if (contextTargets.length > 0) {
      return contextTargets.map((target) => {
        const dir = getNodeDir(target);
        return {
          path: dir ? `${dir}/${filename}` : filename,
          content,
          type: 'rules' as const,
        };
      });
    }

    // No connections — use scope/path as fallback
    const filePath =
      data.scope === 'root' || !data.path
        ? filename
        : `${data.path.replace(/\/+$/, '')}/${filename}`;
    return [{ path: filePath, content, type: 'rules' as const }];
  });
}
```

**Step 4: Update generateFileTree to pass edges/allNodes to generateRulesFiles**

```typescript
export function generateFileTree(nodes: Node[], edges: Edge[]): ExportedFile[] {
  const filteredNodes = nodes.filter((n) => n.type !== 'comment');
  return [
    ...generateRulesFiles(filteredNodes, edges, filteredNodes),
    ...generateSkillFiles(filteredNodes, edges, filteredNodes),
    ...generateSubagentFiles(filteredNodes, edges, filteredNodes),
    ...generateSettingsJson(filteredNodes, edges),
  ];
}
```

**Step 5: Run tests**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: PASS

---

### Task 3: Update integration section to reference co-located filename

**Files:**
- Modify: `src/serialization/fileSystemExporter.ts`
- Modify: `src/serialization/fileSystemExporter.test.ts`

**Step 1: Write failing test**

Update the existing test `'includes context source (rules) as mandatory rules'` in the `buildIntegrationSection` describe block:

```typescript
it('includes context source (rules) as co-located file reference', () => {
  const rulesNode = makeNode('r1', 'rules', { ...createRulesData(), label: 'Backend Rules' } as unknown as Record<string, unknown>);
  const skillNode = makeNode('s1', 'skill', { ...createSkillData(), frontmatter: { ...createSkillData().frontmatter, name: 'deploy' } } as unknown as Record<string, unknown>);
  const edge: Edge = { id: 'e1', source: 'r1', target: 's1', sourceHandle: 'out_context', targetHandle: 'in_context', data: { pinType: 'context' } };
  const result = buildIntegrationSection(skillNode, [edge], [rulesNode, skillNode]);
  expect(result).toContain('MANDATORY');
  expect(result).toContain('backend-rules.md');
  expect(result).toContain('co-located in this directory');
});
```

Also update the skill integration test in `generateSkillFiles`:

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
  expect(skillFile.content).toContain('security-rules.md');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: FAIL — old text doesn't match

**Step 3: Update buildIntegrationSection**

In `buildIntegrationSection`, change the `case 'context'` block for rules nodes:

```typescript
case 'context':
  if (sourceNode.type === 'mcp') {
    lines.push(`You MUST use MCP server "${label}" and its provided tools.`);
  } else if (sourceNode.type === 'rules') {
    const rulesData = sourceNode.data as unknown as RulesNodeData;
    const rulesFilename = `${slugify(rulesData.label) || 'rules'}.md`;
    lines.push(`You MUST load and follow all rules from file: "${rulesFilename}" (co-located in this directory).`);
  } else {
    lines.push(`You MUST load and follow all rules from: "${label}".`);
  }
  break;
```

**Step 4: Run tests**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: PASS

---

### Task 4: Add validator for duplicate rules names targeting same node

**Files:**
- Modify: `src/validation/validate.ts`
- Modify: `src/validation/validate.test.ts`

**Step 1: Write failing tests**

Add to `validate.test.ts`:

```typescript
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
```

NOTE: check `validate.test.ts` for the existing `makeNode` helper and imports. Use the same pattern.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/validation/validate.test.ts`
Expected: FAIL

**Step 3: Implement validation rule**

Add to `validateGraph` in `validate.ts`, before `return results;` (after the duplicate name detection block):

```typescript
// Duplicate rules labels targeting same node (error)
const rulesContextEdges = edges.filter(
  (e) => (e.data as Record<string, unknown>)?.pinType === 'context'
    && validatableNodes.find((n) => n.id === e.source)?.type === 'rules'
);
const rulesPerTarget = new Map<string, Map<string, string[]>>();
for (const edge of rulesContextEdges) {
  const sourceNode = validatableNodes.find((n) => n.id === edge.source);
  if (!sourceNode) continue;
  const label = ((sourceNode.data as Record<string, unknown>).label as string) ?? '';
  if (!label) continue;
  if (!rulesPerTarget.has(edge.target)) rulesPerTarget.set(edge.target, new Map());
  const targetMap = rulesPerTarget.get(edge.target)!;
  const ids = targetMap.get(label) ?? [];
  ids.push(edge.source);
  targetMap.set(label, ids);
}
rulesPerTarget.forEach((labelMap, targetId) => {
  const targetNode = validatableNodes.find((n) => n.id === targetId);
  const targetName = targetNode ? getNodeLabel(targetNode) : targetId;
  labelMap.forEach((ids, label) => {
    if (ids.length > 1) {
      ids.forEach((id) => {
        results.push({
          nodeId: id,
          level: 'error',
          message: `Duplicate rules name "${label}" targeting "${targetName}"`,
        });
      });
    }
  });
});
```

You'll need a `getNodeLabel` helper in validate.ts. Add before `validateGraph`:

```typescript
function getNodeLabel(node: Node): string {
  const data = node.data as Record<string, unknown>;
  if (node.type === 'subagent') return (data.name as string) || (data.label as string) || 'unknown';
  if (node.type === 'skill') {
    const fm = data.frontmatter as Record<string, unknown> | undefined;
    return (fm?.name as string) || (data.label as string) || 'unknown';
  }
  return (data.label as string) || 'unknown';
}
```

**Step 4: Run tests**

Run: `npx vitest run src/validation/validate.test.ts`
Expected: PASS

---

### Task 5: Update generateFileTree test and E2E suite

**Files:**
- Modify: `src/serialization/fileSystemExporter.test.ts`
- Modify: `docs/test-suites/suite-015-export.json`

**Step 1: Update generateFileTree test**

The `'combines all file types'` test already passes edges to `generateRulesFiles` via `generateFileTree`. It has no edges, so rules go to root. No change needed — verify it still passes.

**Step 2: Update E2E suite**

In `suite-015-export.json`, the starter template has rules connected to skills, so TC-141 should expect the rules file inside the `.claude/skills/` directory. Update TC-141:

```json
{
  "id": "TC-141",
  "name": "Export file tree co-locates rules with linked skill",
  "priority": "critical",
  "phase": 3,
  "url": "/",
  "steps": [
    { "action": "navigate", "target": "/" },
    { "action": "click", "target": "[data-testid='template-starter']" },
    { "action": "click", "target": "[data-testid='confirm-load-template']" },
    { "action": "click", "target": "[data-testid='toolbar-export']" }
  ],
  "assertions": [
    { "type": "textContains", "target": "[data-testid='export-file-tree']", "expected": "project-rules.md", "description": "Rules file co-located in skill directory" }
  ]
}
```

**Step 3: Run all tests**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Run: `npx vitest run src/validation/validate.test.ts`
Expected: PASS

---

### Task 6: Run full test suite

**Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: all pass

**Step 2: Run E2E export suite**

Run: `node pw_test_runner.cjs --input docs/test-suites/suite-015-export.json --output-dir test-results`
Expected: all pass
