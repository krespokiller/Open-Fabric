// Builds the messages for one model call. Every call is stateless: it carries the task,
// the arm's context, the current project files and the feedback from the previous attempt.
// This keeps the context bounded for small models and makes arms comparable.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.mjs';
import { FORMAT_RULES } from './protocol.mjs';
import { listFiles, snapshot } from './workspace.mjs';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

export const ARMS = ['bare', 'docs', 'tests', 'of-spec', 'of-code'];
// Arms run when --arms is not given. `tests` is the control for the piece: same public-test feedback, no piece.
export const DEFAULT_ARMS = ['bare', 'docs', 'tests', 'of-spec', 'of-code'];

// Kit arms: the tool installs the whole reference service and leaves one slot (a single rule
// function) for the model. `kit-bare` gets the task and the slot contract; `kit-tests` also gets
// the public tests and their results. A kit arm id carries its slot: `kit-tests.discount`.
export const KIT_ARMS = ['kit-bare', 'kit-tests'];

export function parseArm(arm) {
  const [base, slot] = arm.split('.');
  return KIT_ARMS.includes(base) ? { base, slot: slot || null, kit: true } : { base: arm, slot: null, kit: false };
}

export function isKnownArm(arm) {
  return ARMS.includes(arm) || parseArm(arm).kit;
}

// `kit-bare` becomes one arm per slot of the stack; other arms are returned as they are.
export function expandArm(stack, arm, slots = null) {
  const { base, slot, kit } = parseArm(arm);
  if (!kit || slot) return [arm];
  const all = Object.keys(stack.kit?.slots || {});
  return all.filter((s) => !slots || slots.includes(s)).map((s) => `${base}.${s}`);
}

export function armApplies(stack, arm) {
  const { slot, kit } = parseArm(arm);
  if (kit) return Boolean(slot && stack.kit?.slots?.[slot]);
  if (arm === 'of-code') return Boolean(stack.codePiece);
  if (arm === 'docs') return fs.existsSync(path.join(ROOT, 'arms', 'docs', `${stack.name}.md`));
  return true;
}

export function armSeesPublicTests(arm) {
  return arm === 'tests' || arm === 'of-spec' || arm === 'of-code' || parseArm(arm).base === 'kit-tests';
}

function publicTestsContext() {
  const tests = read('arms/openfabric/piece.md').split('## 3. Public tests')[1] || '';
  return `# Automatic tests\n\nAfter every attempt, these public tests run against your app and you will see their results.${tests.replace('These run against your app after every attempt. Their values differ from the examples above on purpose.', '')}`;
}

function armContext(stack, arm) {
  const { base, slot, kit } = parseArm(arm);
  if (kit) {
    const file = stack.kit.slots[slot];
    const job = `# Your job: one function\n\nThis service is already assembled from verified code: the routes, the database access, authentication and every other rule in the task are installed and working. That code is read-only and its contents are not shown. One function is left for you: the slot in \`${file}\`, shown in the project files below with its contract. Implement it so the service follows the task. Write only that file; changes to any other file are rejected.`;
    return base === 'kit-tests' ? `${job}\n\n${publicTestsContext()}` : job;
  }
  if (arm === 'bare') return '';
  if (arm === 'docs') {
    return `# Reference documentation\n\nDocumentation for the frameworks and libraries used in this project.\n\n${read(`arms/docs/${stack.name}.md`)}\n\n${read('arms/docs/_postgres.md')}`;
  }
  const piece = read('arms/openfabric/piece.md');
  if (arm === 'tests') return publicTestsContext();
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

// Files of the reference that a kit arm installs, without the slot the model has to write.
export function kitInstalledFiles(stack, arm) {
  const { slot, kit } = parseArm(arm);
  if (!kit) return [];
  return listFiles(path.join(stack.dir, 'gold')).filter((f) => f !== stack.kit.slots[slot]);
}

export function buildMessages({ stack, arm, workspace, feedback, attempt, budget, history = [] }) {
  const hidden = arm === 'of-code' ? stack.codePiece.hideFromPrompt || [] : kitInstalledFiles(stack, arm);
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
    history.length > 1
      ? `# Earlier attempts in this run\n\nThe project files above already contain what you wrote. If the result has not changed between attempts, change your approach.\n\n${history.join('\n')}`
      : '',
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
