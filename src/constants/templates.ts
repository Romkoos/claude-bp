import type { Node, Edge } from '@xyflow/react';
import { createRulesData, createSkillData, createSubagentData, createHookData } from './nodeDefaults';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'pipeline' | 'research' | 'safety' | 'starter';
  graph: {
    nodes: Node[];
    edges: Edge[];
  };
}

/* ── Template 1: PR Review Pipeline ─────────────────────────── */

const prReviewPipeline: Template = {
  id: 'pr-review',
  name: 'PR Review Pipeline',
  description: 'Automated code review with security checks and PR feedback',
  icon: '🔍',
  category: 'pipeline',
  graph: {
    nodes: [
      {
        id: 'tmpl_pr_rules',
        type: 'rules',
        position: { x: 0, y: 150 },
        data: {
          ...createRulesData(),
          label: 'Project Rules',
          content:
            '# Code Standards\n\n- Follow existing patterns\n- All functions must have JSDoc comments\n- No console.log in production code\n- Max cyclomatic complexity: 10\n',
        },
      },
      {
        id: 'tmpl_pr_fetch',
        type: 'skill',
        position: { x: 300, y: 0 },
        data: {
          ...createSkillData(),
          label: 'Fetch PR Data',
          frontmatter: {
            ...createSkillData().frontmatter,
            name: 'Fetch PR Data',
            description: 'Retrieve pull request diff and metadata',
            context: 'fork' as const,
            agent: 'Explore',
            allowedTools: ['Read', 'Grep', 'Glob', 'Bash(gh:*)'],
          },
          instructions: 'Fetch the PR diff, changed files list, and PR description using the GitHub CLI.',
        },
      },
      {
        id: 'tmpl_pr_reviewer',
        type: 'subagent',
        position: { x: 650, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Code Reviewer',
          name: 'Code Reviewer',
          description: 'Reviews code changes for quality and correctness',

          allowedTools: ['Read', 'Grep', 'Glob'],
          systemPrompt:
            'You are a senior code reviewer. Analyze the PR diff for bugs, style issues, and potential improvements. Be constructive and specific.',
        },
      },
      {
        id: 'tmpl_pr_security',
        type: 'hook',
        position: { x: 650, y: 300 },
        data: {
          ...createHookData(),
          label: 'Security Check',
          event: 'PreToolUse' as const,
          matcher: 'Bash',
          decision: { type: 'deny' as const, reason: 'Block unsafe shell commands during review', modifyInput: false },
        },
      },
      {
        id: 'tmpl_pr_write',
        type: 'skill',
        position: { x: 1000, y: 0 },
        data: {
          ...createSkillData(),
          label: 'Write Review',
          frontmatter: {
            ...createSkillData().frontmatter,
            name: 'Write Review',
            description: 'Post review comments on the PR',
            context: 'conversation' as const,
            allowedTools: ['Write', 'Bash(gh:*)'],
          },
          instructions: 'Compile findings into a structured review and post it as a PR comment.',
        },
      },
    ],
    edges: [
      {
        id: 'tmpl_pr_e1',
        source: 'tmpl_pr_rules',
        sourceHandle: 'out_context',
        target: 'tmpl_pr_fetch',
        targetHandle: 'in_context',
        type: 'typed',
        data: { pinType: 'context' },
      },
      {
        id: 'tmpl_pr_e2',
        source: 'tmpl_pr_fetch',
        sourceHandle: 'out_exec',
        target: 'tmpl_pr_reviewer',
        targetHandle: 'in_exec',
        type: 'typed',
        data: { pinType: 'exec' },
      },
      {
        id: 'tmpl_pr_e3',
        source: 'tmpl_pr_fetch',
        sourceHandle: 'out_delegation',
        target: 'tmpl_pr_reviewer',
        targetHandle: 'in_delegation',
        type: 'typed',
        data: { pinType: 'delegation' },
      },
      {
        id: 'tmpl_pr_e4',
        source: 'tmpl_pr_reviewer',
        sourceHandle: 'out_result',
        target: 'tmpl_pr_write',
        targetHandle: 'in_context',
        type: 'typed',
        data: { pinType: 'result' },
      },
      {
        id: 'tmpl_pr_e5',
        source: 'tmpl_pr_reviewer',
        sourceHandle: 'out_exec',
        target: 'tmpl_pr_write',
        targetHandle: 'in_exec',
        type: 'typed',
        data: { pinType: 'exec' },
      },
      {
        id: 'tmpl_pr_e6',
        source: 'tmpl_pr_security',
        sourceHandle: 'out_decision',
        target: 'tmpl_pr_reviewer',
        targetHandle: 'in_trigger',
        type: 'typed',
        data: { pinType: 'decision' },
      },
    ],
  },
};

/* ── Template 2: Multi-Agent Research ────────────────────────── */

const multiAgentResearch: Template = {
  id: 'multi-research',
  name: 'Multi-Agent Research',
  description: 'Fan-out research across multiple specialized agents, then merge',
  icon: '🔬',
  category: 'research',
  graph: {
    nodes: [
      {
        id: 'tmpl_mr_research',
        type: 'skill',
        position: { x: 0, y: 150 },
        data: {
          ...createSkillData(),
          label: 'Research Topic',
          frontmatter: {
            ...createSkillData().frontmatter,
            name: 'Research Topic',
            description: 'Define the research question and delegate to agents',
            context: 'conversation' as const,
          },
          instructions: 'Break down the research topic and delegate sub-questions to specialized agents.',
        },
      },
      {
        id: 'tmpl_mr_web',
        type: 'subagent',
        position: { x: 400, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Web Docs Agent',
          name: 'Web Docs Agent',
          description: 'Searches official documentation and web resources',

          allowedTools: ['WebSearch', 'WebFetch', 'Read'],
          systemPrompt: 'Search official documentation and authoritative web sources to answer the research question.',
        },
      },
      {
        id: 'tmpl_mr_so',
        type: 'subagent',
        position: { x: 400, y: 200 },
        data: {
          ...createSubagentData(),
          label: 'StackOverflow Agent',
          name: 'StackOverflow Agent',
          description: 'Searches StackOverflow for community solutions',

          allowedTools: ['WebSearch', 'WebFetch'],
          systemPrompt: 'Search StackOverflow and developer forums for practical solutions and community consensus.',
        },
      },
      {
        id: 'tmpl_mr_code',
        type: 'subagent',
        position: { x: 400, y: 400 },
        data: {
          ...createSubagentData(),
          label: 'Codebase Explorer',
          name: 'Codebase Explorer',
          description: 'Explores the local codebase for existing patterns',

          allowedTools: ['Read', 'Grep', 'Glob', 'Bash'],
          systemPrompt: 'Explore the local codebase to find existing patterns, implementations, and relevant code.',
        },
      },
      {
        id: 'tmpl_mr_merge',
        type: 'skill',
        position: { x: 800, y: 150 },
        data: {
          ...createSkillData(),
          label: 'Merge Findings',
          frontmatter: {
            ...createSkillData().frontmatter,
            name: 'Merge Findings',
            description: 'Synthesize results from all research agents',
            context: 'conversation' as const,
          },
          instructions:
            'Combine findings from all research agents into a cohesive summary. Highlight consensus, conflicts, and recommended approach.',
        },
      },
    ],
    edges: [
      {
        id: 'tmpl_mr_e1',
        source: 'tmpl_mr_research',
        sourceHandle: 'out_delegation',
        target: 'tmpl_mr_web',
        targetHandle: 'in_delegation',
        type: 'typed',
        data: { pinType: 'delegation' },
      },
      {
        id: 'tmpl_mr_e2',
        source: 'tmpl_mr_research',
        sourceHandle: 'out_delegation',
        target: 'tmpl_mr_so',
        targetHandle: 'in_delegation',
        type: 'typed',
        data: { pinType: 'delegation' },
      },
      {
        id: 'tmpl_mr_e3',
        source: 'tmpl_mr_research',
        sourceHandle: 'out_delegation',
        target: 'tmpl_mr_code',
        targetHandle: 'in_delegation',
        type: 'typed',
        data: { pinType: 'delegation' },
      },
      {
        id: 'tmpl_mr_e4',
        source: 'tmpl_mr_web',
        sourceHandle: 'out_result',
        target: 'tmpl_mr_merge',
        targetHandle: 'in_context',
        type: 'typed',
        data: { pinType: 'result' },
      },
      {
        id: 'tmpl_mr_e5',
        source: 'tmpl_mr_so',
        sourceHandle: 'out_result',
        target: 'tmpl_mr_merge',
        targetHandle: 'in_context',
        type: 'typed',
        data: { pinType: 'result' },
      },
      {
        id: 'tmpl_mr_e6',
        source: 'tmpl_mr_code',
        sourceHandle: 'out_result',
        target: 'tmpl_mr_merge',
        targetHandle: 'in_context',
        type: 'typed',
        data: { pinType: 'result' },
      },
    ],
  },
};

/* ── Template 3: Safe Deployment ─────────────────────────────── */

const safeDeployment: Template = {
  id: 'safe-deploy',
  name: 'Safe Deployment',
  description: 'Guarded deploy pipeline with tests, bash protection, and notifications',
  icon: '🛡️',
  category: 'safety',
  graph: {
    nodes: [
      {
        id: 'tmpl_sd_session',
        type: 'hook',
        position: { x: 0, y: 0 },
        data: {
          ...createHookData(),
          label: 'Load Environment',
          event: 'SessionStart' as const,
          matcher: '*',
          command: 'cat .env.deploy',
          injectSystemMessage: 'Deployment environment variables loaded.',
        },
      },
      {
        id: 'tmpl_sd_deploy',
        type: 'skill',
        position: { x: 300, y: 100 },
        data: {
          ...createSkillData(),
          label: 'Deploy',
          frontmatter: {
            ...createSkillData().frontmatter,
            name: 'Deploy',
            description: 'Execute deployment steps',
            context: 'conversation' as const,
            allowedTools: ['Bash', 'Write', 'Read'],
          },
          instructions: 'Run the deployment script and verify each step completes successfully.',
        },
      },
      {
        id: 'tmpl_sd_test',
        type: 'subagent',
        position: { x: 650, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Test Runner',
          name: 'Test Runner',
          description: 'Runs the test suite to verify deployment',

          allowedTools: ['Bash', 'Read', 'Grep'],
          systemPrompt: 'Run the project test suite and report results. Fail the pipeline if any tests fail.',
        },
      },
      {
        id: 'tmpl_sd_guard',
        type: 'hook',
        position: { x: 650, y: 250 },
        data: {
          ...createHookData(),
          label: 'Bash Guard',
          event: 'PreToolUse' as const,
          matcher: 'Bash',
          decision: { type: 'deny' as const, reason: 'Block destructive shell commands (rm -rf, drop, etc.)', modifyInput: false },
          command: 'echo "Checking command safety..."',
        },
      },
      {
        id: 'tmpl_sd_notify',
        type: 'hook',
        position: { x: 1000, y: 100 },
        data: {
          ...createHookData(),
          label: 'Notify on Complete',
          event: 'Stop' as const,
          matcher: '*',
          command: 'echo "Deployment complete" | notify-send',
          decision: { type: 'none' as const, reason: '', modifyInput: false },
        },
      },
    ],
    edges: [
      {
        id: 'tmpl_sd_e1',
        source: 'tmpl_sd_session',
        sourceHandle: 'out_context',
        target: 'tmpl_sd_deploy',
        targetHandle: 'in_context',
        type: 'typed',
        data: { pinType: 'context' },
      },
      {
        id: 'tmpl_sd_e2',
        source: 'tmpl_sd_deploy',
        sourceHandle: 'out_delegation',
        target: 'tmpl_sd_test',
        targetHandle: 'in_delegation',
        type: 'typed',
        data: { pinType: 'delegation' },
      },
      {
        id: 'tmpl_sd_e3',
        source: 'tmpl_sd_deploy',
        sourceHandle: 'out_exec',
        target: 'tmpl_sd_test',
        targetHandle: 'in_exec',
        type: 'typed',
        data: { pinType: 'exec' },
      },
      {
        id: 'tmpl_sd_e4',
        source: 'tmpl_sd_guard',
        sourceHandle: 'out_decision',
        target: 'tmpl_sd_test',
        targetHandle: 'in_trigger',
        type: 'typed',
        data: { pinType: 'decision' },
      },
      {
        id: 'tmpl_sd_e5',
        source: 'tmpl_sd_test',
        sourceHandle: 'out_exec',
        target: 'tmpl_sd_notify',
        targetHandle: 'in_trigger',
        type: 'typed',
        data: { pinType: 'trigger' },
      },
    ],
  },
};

/* ── Template 4: Starter Config ──────────────────────────────── */

const starterConfig: Template = {
  id: 'starter',
  name: 'Starter Config',
  description: 'Minimal starting point with project rules and a single skill',
  icon: '🚀',
  category: 'starter',
  graph: {
    nodes: [
      {
        id: 'tmpl_st_rules',
        type: 'rules',
        position: { x: 0, y: 100 },
        data: {
          ...createRulesData(),
          label: 'Project Rules',
          content: '# Project Rules\n\nAdd your project-specific rules and context here.\n',
        },
      },
      {
        id: 'tmpl_st_skill',
        type: 'skill',
        position: { x: 400, y: 100 },
        data: {
          ...createSkillData(),
          label: 'My First Skill',
          frontmatter: {
            ...createSkillData().frontmatter,
            name: 'My First Skill',
            description: 'A starting skill to customize',
          },
          instructions: 'Describe what this skill should do.',
        },
      },
    ],
    edges: [
      {
        id: 'tmpl_st_e1',
        source: 'tmpl_st_rules',
        sourceHandle: 'out_context',
        target: 'tmpl_st_skill',
        targetHandle: 'in_context',
        type: 'typed',
        data: { pinType: 'context' },
      },
    ],
  },
};

export const TEMPLATES: Template[] = [prReviewPipeline, multiAgentResearch, safeDeployment, starterConfig];
