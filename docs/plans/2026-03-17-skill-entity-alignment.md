# Skill Entity Alignment with Official Documentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the Skill entity implementation with the official Claude Code skills documentation (https://code.claude.com/docs/en/skills), adding missing fields, removing non-standard fields, and fixing semantic mismatches.

**Architecture:** Update the SkillNodeData type to match official frontmatter fields exactly. Propagate changes through defaults, validators, UI editors, node renderer, exporter, importer, templates, tests, and descriptions. Create a reference document.

**Tech Stack:** TypeScript, React, Vitest, js-yaml

---

### Task 1: Update SkillNodeData type

**Files:**
- Modify: `src/types/nodes.ts:19-33`

**Step 1: Write the failing test**

No dedicated type test file exists — type changes are validated implicitly by all consumers. Skip to implementation.

**Step 2: Update the SkillNodeData interface**

Replace the current `SkillNodeData` interface with:

```typescript
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
```

Changes:
- **Removed**: `version` field
- **Added**: `argumentHint: string`
- **Added**: `disableModelInvocation: boolean`
- **Added**: `userInvocable: boolean`
- **Changed**: `context` from `'conversation' | 'fork'` to `'fork' | undefined`
- **Changed**: `agent` — removed `'inherit'` option, default is `'general-purpose'`
- **Changed**: `model` — simplified to `string` (empty string = not set, no `'inherit'`)

**Step 3: Verify TypeScript compilation fails on all consumers**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: Compilation errors in nodeDefaults.ts, SkillEditor.tsx, SkillNode.tsx, fileSystemExporter.ts, fileSystemImporter.ts, validate.ts, templates.ts

**Step 4: Commit**

```bash
git add src/types/nodes.ts
git commit -m "refactor: update SkillNodeData type to match official docs"
```

---

### Task 2: Update node defaults

**Files:**
- Modify: `src/constants/nodeDefaults.ts:57-76`

**Step 1: Update createSkillData()**

```typescript
export function createSkillData(): SkillNodeData {
  return {
    label: 'New Skill',
    collapsed: true,
    validation: { errors: [], warnings: [] },
    frontmatter: {
      name: '',
      description: '',
      argumentHint: '',
      disableModelInvocation: false,
      userInvocable: true,
      context: undefined,
      agent: 'general-purpose',
      allowedTools: [],
      model: '',
    },
    scopedHooks: [],
    instructions: '',
    dynamicInjections: [],
    referenceFiles: [],
  };
}
```

Changes:
- Removed `version`
- Added `argumentHint: ''`
- Added `disableModelInvocation: false`
- Added `userInvocable: true`
- Changed `context: 'conversation'` → `context: undefined`
- Changed `agent: 'inherit'` → `agent: 'general-purpose'`
- Changed `model: 'inherit'` → `model: ''`

**Step 2: Run test to verify defaults compile**

Run: `npx tsc --noEmit`
Expected: Fewer errors (nodeDefaults.ts should pass)

**Step 3: Commit**

```bash
git add src/constants/nodeDefaults.ts
git commit -m "refactor: update skill defaults to match official docs"
```

---

### Task 3: Update node descriptions

**Files:**
- Modify: `src/constants/nodeDescriptions.ts:33-57`

**Step 1: Update skill properties list**

Replace the skill `properties` array:

```typescript
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
```

**Step 2: Commit**

```bash
git add src/constants/nodeDescriptions.ts
git commit -m "refactor: update skill node descriptions to match official docs"
```

---

### Task 4: Update validators

**Files:**
- Modify: `src/validation/validate.ts:49-60`

**Step 1: Write the failing test**

Add test case to `src/validation/validate.test.ts` (create if not exists):

```typescript
it('errors when forked skill has no agent', () => {
  const skillData = createSkillData();
  skillData.frontmatter.context = 'fork';
  skillData.frontmatter.agent = '';
  const node = makeNode('s1', 'skill', skillData as unknown as Record<string, unknown>);
  const results = validateGraph([node], []);
  expect(results).toContainEqual(
    expect.objectContaining({ level: 'error', message: 'Forked skills must specify an agent type' })
  );
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/validation/validate.test.ts`
Expected: FAIL (test file may not exist yet)

**Step 3: Update the forked-skill validation**

Change the condition from checking `agent === 'inherit'` to checking for empty/falsy agent:

```typescript
if (nodeType === 'skill') {
  const skillData = data as unknown as SkillNodeData;
  if (
    skillData.frontmatter.context === 'fork' &&
    !skillData.frontmatter.agent
  ) {
    results.push({
      nodeId: node.id,
      level: 'error',
      message: 'Forked skills must specify an agent type',
    });
  }
}
```

Also add a new warning for `disableModelInvocation` + no `description`:

```typescript
if (nodeType === 'skill') {
  const skillData = data as unknown as SkillNodeData;
  if (!skillData.frontmatter.description) {
    results.push({
      nodeId: node.id,
      level: 'warning',
      message: "Skill without description won't be auto-discovered",
    });
  }
  if (skillData.frontmatter.disableModelInvocation && !skillData.frontmatter.userInvocable) {
    results.push({
      nodeId: node.id,
      level: 'warning',
      message: 'Skill with both disableModelInvocation and userInvocable=false will never be invoked',
    });
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/validation/validate.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/validation/validate.ts src/validation/validate.test.ts
git commit -m "refactor: update skill validation for new frontmatter fields"
```

---

### Task 5: Update SkillEditor UI

**Files:**
- Modify: `src/components/PropertiesPanel/SkillEditor.tsx`

**Step 1: Update the editor component**

Changes to make:
1. **Remove** the version field
2. **Add** argument-hint text input
3. **Add** disable-model-invocation checkbox
4. **Add** user-invocable checkbox
5. **Change** context selector: "Inline (default)" for undefined, "Fork" for 'fork'
6. **Change** agent selector: remove "Inherit" option, show only when context is 'fork'
7. **Change** model selector: remove "Inherit", add empty "Not set" option

New fields to add (inside Frontmatter section, after description):

```tsx
<div data-testid="field-skill-argument-hint">
  <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Argument Hint</label>
  <input value={d.frontmatter.argumentHint} onChange={(e) => updateFm({ argumentHint: e.target.value })} placeholder="[issue-number]" className="bp-input text-xs" />
</div>
<div data-testid="field-skill-disable-model-invocation" className="flex items-center gap-2">
  <input type="checkbox" checked={d.frontmatter.disableModelInvocation} onChange={(e) => updateFm({ disableModelInvocation: e.target.checked })} className="bp-checkbox" />
  <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Disable Model Invocation</label>
</div>
<div data-testid="field-skill-user-invocable" className="flex items-center gap-2">
  <input type="checkbox" checked={d.frontmatter.userInvocable} onChange={(e) => updateFm({ userInvocable: e.target.checked })} className="bp-checkbox" />
  <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>User Invocable</label>
</div>
```

Context selector update:
```tsx
<select value={d.frontmatter.context ?? ''} onChange={(e) => updateFm({ context: e.target.value === 'fork' ? 'fork' : undefined })} className="bp-select text-xs">
  <option value="">Inline (default)</option>
  <option value="fork">Fork</option>
</select>
```

Agent selector update (remove 'inherit' option):
```tsx
{d.frontmatter.context === 'fork' && (
  <div data-testid="field-skill-agent">
    <label ...>Agent</label>
    <select value={d.frontmatter.agent} onChange={(e) => updateFm({ agent: e.target.value })} className="bp-select text-xs">
      <option value="general-purpose">General Purpose</option>
      <option value="Explore">Explore</option>
      <option value="Plan">Plan</option>
    </select>
  </div>
)}
```

Model selector update:
```tsx
<select value={d.frontmatter.model} onChange={(e) => updateFm({ model: e.target.value })} className="bp-select text-xs">
  <option value="">Not set</option>
  <option value="sonnet">Sonnet</option>
  <option value="opus">Opus</option>
  <option value="haiku">Haiku</option>
</select>
```

**Step 2: Run test**

Run: `npx vitest run src/components/PropertiesPanel/SkillEditor.test.tsx`
Expected: Some tests may need updating

**Step 3: Commit**

```bash
git add src/components/PropertiesPanel/SkillEditor.tsx
git commit -m "refactor: update SkillEditor UI for official docs alignment"
```

---

### Task 6: Update SkillEditor tests

**Files:**
- Modify: `src/components/PropertiesPanel/SkillEditor.test.tsx`

**Step 1: Update existing tests**

- Change `context: 'conversation'` references to `context: undefined`
- Update "hides agent selector when context is conversation" → "hides agent selector when context is inline"
- Add tests for new fields: argumentHint, disableModelInvocation, userInvocable
- Remove any test referencing `version`

**Step 2: Add new tests**

```typescript
it('shows argument hint field', () => {
  render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
  expect(screen.getByTestId('field-skill-argument-hint')).toBeInTheDocument();
});

it('shows disable model invocation checkbox', () => {
  render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
  expect(screen.getByTestId('field-skill-disable-model-invocation')).toBeInTheDocument();
});

it('shows user invocable checkbox', () => {
  render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
  expect(screen.getByTestId('field-skill-user-invocable')).toBeInTheDocument();
});

it('hides agent selector when context is inline', () => {
  render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
  expect(screen.queryByTestId('field-skill-agent')).not.toBeInTheDocument();
});
```

**Step 3: Run tests**

Run: `npx vitest run src/components/PropertiesPanel/SkillEditor.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/PropertiesPanel/SkillEditor.test.tsx
git commit -m "test: update SkillEditor tests for new frontmatter fields"
```

---

### Task 7: Update SkillNode renderer

**Files:**
- Modify: `src/components/Nodes/SkillNode.tsx`

**Step 1: Update context badge rendering**

Change the badge logic:
- When `context` is `undefined` (inline): show "inline" badge with green color
- When `context` is `'fork'`: show "fork" badge with purple color
- Remove `'conversation'` string reference

```tsx
<span
  className="bp-badge"
  style={{
    background: nodeData.frontmatter.context === 'fork' ? '#8b5cf630' : '#10b98130',
    color: nodeData.frontmatter.context === 'fork' ? '#c4b5fd' : '#6ee7b7',
  }}
>
  {nodeData.frontmatter.context === 'fork' ? 'fork' : 'inline'}
</span>
```

**Step 2: Update agent badge condition**

Change `agent !== 'inherit'` to just check agent exists:

```tsx
{nodeData.frontmatter.context === 'fork' && nodeData.frontmatter.agent && (
  <span className="bp-badge" style={{ background: '#3b82f630', color: '#93c5fd' }}>
    {nodeData.frontmatter.agent}
  </span>
)}
```

**Step 3: Update expanded inline context selector**

Same changes as SkillEditor: change option values from `'conversation'`/`'fork'` to `''`/`'fork'`, remove `'inherit'` from agent selector.

```tsx
<select
  value={nodeData.frontmatter.context ?? ''}
  onChange={(e) => updateFrontmatter({ context: e.target.value === 'fork' ? 'fork' : undefined })}
  className="bp-select"
>
  <option value="">Inline (default)</option>
  <option value="fork">Fork</option>
</select>
{nodeData.frontmatter.context === 'fork' && (
  <select
    value={nodeData.frontmatter.agent}
    onChange={(e) => updateFrontmatter({ agent: e.target.value })}
    className="bp-select"
  >
    <option value="general-purpose">General Purpose</option>
    <option value="Explore">Explore</option>
    <option value="Plan">Plan</option>
  </select>
)}
```

**Step 4: Commit**

```bash
git add src/components/Nodes/SkillNode.tsx
git commit -m "refactor: update SkillNode renderer for official docs alignment"
```

---

### Task 8: Update file system exporter

**Files:**
- Modify: `src/serialization/fileSystemExporter.ts:185-257`

**Step 1: Update generateSkillFiles() frontmatter generation**

Replace the defaults and frontmatter building logic:

```typescript
const fm: Record<string, unknown> = {};

if (data.frontmatter) {
  if (data.frontmatter.name) fm['name'] = data.frontmatter.name;
  if (data.frontmatter.description) fm['description'] = data.frontmatter.description;
  if (data.frontmatter.argumentHint) fm['argument-hint'] = data.frontmatter.argumentHint;
  if (data.frontmatter.disableModelInvocation) fm['disable-model-invocation'] = true;
  if (data.frontmatter.userInvocable === false) fm['user-invocable'] = false;
  if (data.frontmatter.context === 'fork') fm['context'] = 'fork';
  if (data.frontmatter.context === 'fork' && data.frontmatter.agent)
    fm['agent'] = data.frontmatter.agent;
  if (data.frontmatter.allowedTools?.length)
    fm['allowed-tools'] = data.frontmatter.allowedTools.join(', ');
  if (data.frontmatter.model) fm['model'] = data.frontmatter.model;
}
```

Key changes:
- **Removed**: `version` export
- **Added**: `argument-hint`, `disable-model-invocation`, `user-invocable`
- **Changed**: `context` — only export when `'fork'` (don't export `'conversation'`)
- **Changed**: `agent` — only export when context is fork
- **Changed**: `allowed-tools` — kebab-case key, comma-separated string value (matching docs format)
- **Changed**: `model` — only export when non-empty
- **Removed**: old `defaults` object check pattern

**Step 2: Run exporter tests**

Run: `npx vitest run src/serialization/fileSystemExporter.test.ts`
Expected: Some tests fail (need updating in Task 10)

**Step 3: Commit**

```bash
git add src/serialization/fileSystemExporter.ts
git commit -m "refactor: update skill exporter for official docs alignment"
```

---

### Task 9: Update file system importer

**Files:**
- Modify: `src/serialization/fileSystemImporter.ts:152-183`

**Step 1: Update buildSkillNode() to handle new fields**

```typescript
function buildSkillNode(
  fm: Record<string, unknown>,
  body: string,
  referenceFiles: string[],
  yIndex: number,
): Node {
  const base = createSkillData();
  const data: SkillNodeData = {
    ...base,
    label: typeof fm['name'] === 'string' ? fm['name'] : 'Imported Skill',
    frontmatter: {
      name: typeof fm['name'] === 'string' ? fm['name'] : '',
      description: typeof fm['description'] === 'string' ? fm['description'] : '',
      argumentHint: typeof fm['argument-hint'] === 'string' ? fm['argument-hint'] : '',
      disableModelInvocation: fm['disable-model-invocation'] === true,
      userInvocable: fm['user-invocable'] !== false,
      context: fm['context'] === 'fork' ? 'fork' : undefined,
      agent: typeof fm['agent'] === 'string' ? fm['agent'] : 'general-purpose',
      allowedTools: parseAllowedTools(fm['allowed-tools'] ?? fm['allowed_tools']),
      model: typeof fm['model'] === 'string' ? fm['model'] : '',
    },
    scopedHooks: parseScopedHooks(fm['hooks']),
    instructions: body,
    dynamicInjections: extractDynamicInjections(body),
    referenceFiles,
  };
  return {
    id: generateId(),
    type: 'skill',
    position: { x: X_POSITIONS.skill, y: yIndex * Y_STEP },
    data: data as unknown as Record<string, unknown>,
  };
}
```

Key changes:
- **Removed**: `version` import
- **Added**: `argumentHint` from `argument-hint`
- **Added**: `disableModelInvocation` from `disable-model-invocation`
- **Added**: `userInvocable` from `user-invocable` (defaults to `true`)
- **Changed**: `context` — `'fork'` or `undefined` (not `'conversation'`)
- **Changed**: `agent` default from `'inherit'` to `'general-purpose'`
- **Changed**: `model` default from `'inherit'` to `''`
- **Changed**: `allowed-tools` — support kebab-case key (fallback to snake_case for backward compat)

**Step 2: Commit**

```bash
git add src/serialization/fileSystemImporter.ts
git commit -m "refactor: update skill importer for official docs alignment"
```

---

### Task 10: Update templates

**Files:**
- Modify: `src/constants/templates.ts`

**Step 1: Update all template skill nodes**

For every skill in templates, update:
- Remove `context: 'conversation' as const` → just don't set it (it's undefined by default via createSkillData)
- Remove any `version` references
- All `context: 'fork' as const` stays as-is

Templates to update:
1. **PR Review Pipeline**: `tmpl_pr_fetch` (context: fork stays), `tmpl_pr_write` (remove `context: 'conversation' as const`)
2. **Multi-Agent Research**: `tmpl_mr_research`, `tmpl_mr_merge` (remove `context: 'conversation' as const`)
3. **Safe Deployment**: `tmpl_sd_deploy` (remove `context: 'conversation' as const`)
4. **Starter Config**: `tmpl_st_skill` (no context set — uses default)

**Step 2: Run test**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/constants/templates.ts
git commit -m "refactor: update skill templates for official docs alignment"
```

---

### Task 11: Update serialization tests

**Files:**
- Modify: `src/serialization/fileSystemExporter.test.ts`
- Modify: `src/serialization/fileSystemImporter.test.ts`

**Step 1: Update exporter tests**

- Change all `context: 'conversation'` to `context: undefined`
- Change all `agent: 'inherit'` to `agent: 'general-purpose'`
- Change all `model: 'inherit'` to `model: ''`
- Remove all `version: '1.0.0'` references
- Add `argumentHint: ''`, `disableModelInvocation: false`, `userInvocable: true` to all skill data
- Update frontmatter assertions: check `allowed-tools` (kebab-case), not `allowed_tools`
- Add tests for new fields: argument-hint, disable-model-invocation, user-invocable

**Step 2: Update importer tests**

- Same field updates as exporter
- Add test for importing kebab-case frontmatter keys
- Add backward compat test for `allowed_tools` snake_case

**Step 3: Run all serialization tests**

Run: `npx vitest run src/serialization/`
Expected: PASS

**Step 4: Commit**

```bash
git add src/serialization/fileSystemExporter.test.ts src/serialization/fileSystemImporter.test.ts
git commit -m "test: update serialization tests for skill entity alignment"
```

---

### Task 12: Run full test suite

**Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Fix any remaining failures**

Check for any other files referencing old field names (`version` in skill context, `'conversation'`, `'inherit'` for agent/model).

**Step 3: Commit fixes if any**

---

### Task 13: Create skill entity reference document

**Files:**
- Create: `docs/skill-entity-reference.md`

**Step 1: Write the reference document**

Follow the same structure as `docs/subagent-entity-reference.md`. Include:
- Overview
- Frontmatter Fields tables (Required, Optional)
- Invocation Control matrix
- Context modes (inline vs fork)
- Agent options
- Model options
- String substitutions (documentation only)
- Dynamic injections
- Supporting files
- Export format example
- Import rules
- Interaction with other entities table
- Skill locations & priority

**Step 2: Commit**

```bash
git add docs/skill-entity-reference.md
git commit -m "docs: add skill entity reference document"
```

---

### Task 14: Update E2E test suites

**Step 1: Update relevant E2E suites**

Update test suites that cover skill editing (suite-006) and export/import (suite-015, suite-016) to reflect:
- Removed version field
- New argument-hint, disable-model-invocation, user-invocable fields
- Changed context options (Inline/Fork instead of Conversation/Fork)
- Changed model options (Not set instead of Inherit)

**Step 2: Run E2E suites**

Ensure dev server is running, then:
```bash
node pw_test_runner.cjs --input docs/test-suites/suite-006-*.json --output-dir test-results
```

**Step 3: Commit**

```bash
git add docs/test-suites/
git commit -m "test: update E2E suites for skill entity alignment"
```
