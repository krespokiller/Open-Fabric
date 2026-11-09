// Builds the messages for one model call. Every call is stateless: it carries the task,
// the arm's context, the current project files and the feedback from the previous attempt.
// This keeps the context bounded for small models and makes arms comparable.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.mjs';
import { FORMAT_RULES } from './protocol.mjs';
import { snapshot } from './workspace.mjs';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

export const ARMS = ['bare', 'docs', 'tests', 'of-spec', 'of-code'];
// Arms run when --arms is not given. `tests` is the control for the piece: same public-test feedback, no piece.
export const DEFAULT_ARMS = ['bare', 'docs', 'tests', 'of-spec', 'of-code'];

export function armApplies(stack, arm) {
  if (arm === 'of-code') return Boolean(stack.codePiece);
  if (arm === 'docs') return fs.existsSync(path.join(ROOT, 'arms', 'docs', `${stack.name}.md`));
  return true;
}

export function armSeesPublicTests(arm) {
  return arm === 'tests' || arm === 'of-spec' || arm === 'of-code';
}

function armContext(stack, arm) {
  if (arm === 'bare') return '';
  if (arm === 'docs') {
    return `# Reference documentation\n\nDocumentation for the frameworks and libraries used in this project.\n\n${read(`arms/docs/${stack.name}.md`)}\n\n${read('arms/docs/_postgres.md')}`;
  }
  const piece = read('arms/openfabric/piece.md');
  if (arm === 'tests') {
    const tests = piece.split('## 3. Public tests')[1] || '';
    return `# Automatic tests\n\nAfter every attempt, these public tests run against your app and you will see their results.${tests.replace('These run against your app after every attempt. Their values differ from the examples above on purpose.', '')}`;
  }
  if (arm === 'of-spec') {
    return `# OpenFabric piece to implement\n\nThis project uses OpenFabric. Implement the task by following this verified piece. Its public tests run after every attempt.\n\n${piece}`;
  }
  if (arm === 'of-code') {
    // The code is installed, so the agent only needs the rules (for the slot) and the public tests,
    // not the reference design: that is the compact-index idea being measured.
    const rules = '## 1.' + piece.split('## 1.')[1].split('## 2. Reference design')[0];
    const tests = piece.split('## 3. Public tests')[1] || '';
    return `# OpenFabric piece (installed)\n\nThe verified code of this piece is already installed in the project under lib/of/ (see lib/of/MOUNT.md in the project files). Do not rewrite it. Mount it and fill its slot. Its public tests run after every attempt.\n\n${rules.trim()}\n\n## Public tests${tests}`;
  }
  throw new Error(`unknown arm ${arm}`);
}

export function buildMessages({ stack, arm, workspace, feedback, attempt, budget }) {
  const hidden = arm === 'of-code' ? stack.codePiece.hideFromPrompt || [] : [];
  const snap = snapshot(workspace, { ignore: stack.snapshotIgnore || [], hidden });
  const readOnly = (stack.readOnly || []).join(', ');
  const system = [
    `You are an expert software engineer working inside an existing ${stack.label} project.`,
    'You cannot run commands. After each answer, the files you write are applied to the project; then the project is built with its Dockerfile, started with an empty PostgreSQL database, and checked automatically. You will see the results in the next message.',
    `Read-only files (do not write them): ${readOnly || 'none'}. You may change dependency manifests if you need a library.`,
    FORMAT_RULES,
  ].join('\n\n');
  const user = [
    read('task/task.md'),
    armContext(stack, arm),
    `# Project files\n\nTree:\n${snap.tree}\n\n${snap.contents}`,
    `# Status\n\nThis is attempt ${attempt} of ${budget}.\n\n${feedback || 'This is the first attempt. Nothing has been built yet.'}`,
    'Write the files now. Every file goes in its own <<<FILE relative/path ... >>>FILE block, as described in the output format. Do not write step-by-step explanations or code outside those blocks: only the blocks are applied to the project.',
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
