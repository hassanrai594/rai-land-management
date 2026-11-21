import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Compile these isolated data modules without adding a test runtime dependency.
const output = resolve('work/plan-check');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'package.json'), '{"type":"commonjs"}');
for (const name of [
  'site-plan.ts',
  'seed.ts',
  'validate.ts',
  'migrate-plan.ts',
  'estate-map.tsx',
]) {
  const result = ts.transpileModule(readFileSync(resolve('app', name), 'utf8'), {
    fileName: name,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  writeFileSync(resolve(output, name.replace(/\.tsx?$/, '.js')), result.outputText);
}
const require = createRequire(resolve(output, 'check.cjs'));
const { initial } = require('./seed.js');
const { planPlots, planRoads, landAreas, PLAN_VERSION } = require('./site-plan.js');
const { migratePlan } = require('./migrate-plan.js');
const { stateSchema } = require('./validate.js');
const { EstateMap, EstatePlan } = require('./estate-map.js');

const fresh = initial();
assert(stateSchema.safeParse(fresh).success);
assert.deepEqual(
  fresh.plots.map((p) => p.id),
  Array.from({ length: 96 }, (_, i) => i + 1),
);
assert(fresh.plots.every((p) => p.area === 0 && !p.verified && p.status === 'Unverified'));
assert.equal(fresh.plots.find((p) => p.id === 47).marla, 7);
assert.match(fresh.plots.find((p) => p.id === 47).notes, /discrepancy/);
assert.equal(landAreas.total, landAreas.plots + landAreas.roads);
for (const [index, a] of planPlots.entries()) {
  for (const b of planPlots.slice(index + 1)) {
    assert(
      !(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height),
      `Plots ${a.id} and ${b.id} overlap`,
    );
  }
}

// Road surfaces must fill the gaps without covering any plot.
for (const road of planRoads) {
  assert(road.width > 0 && road.height > 0);
  for (const plot of planPlots) {
    assert(
      !(
        road.x < plot.x + plot.width &&
        plot.x < road.x + road.width &&
        road.y < plot.y + plot.height &&
        plot.y < road.y + road.height
      ),
      `Road ${road.id} covers plot ${plot.id}`,
    );
  }
}
const plot = (id) => planPlots.find((p) => p.id === id);
for (const [roadId, aboveId, belowId] of [
  ['under-15', 15, 16],
  ['under-21', 21, 22],
]) {
  const road = planRoads.find((r) => r.id === roadId);
  assert.equal(road.x, plot(aboveId).x);
  assert.equal(road.y, plot(aboveId).y + plot(aboveId).height);
  assert.equal(road.y + road.height, plot(belowId).y);
  assert.equal(road.x + road.width, plot(13).x + plot(13).width);
}
const rightRoad = planRoads.find((r) => r.id === 'right');
assert.equal(rightRoad.x, plot(13).x + plot(13).width);
assert.equal(rightRoad.x + rightRoad.width, plot(12).x);
assert.equal(rightRoad.y, plot(12).y);
assert.equal(rightRoad.y + rightRoad.height, plot(1).y + plot(1).height);

const legacy = initial();
delete legacy.planVersion;
for (const p of legacy.plots)
  p.notes = 'Imported from photographed plan; verify dimensions and area.';
Object.assign(
  legacy.plots.find((p) => p.id === 47),
  { marla: 5, buyer: 'buyer-1', status: 'Sold', price: 1000 },
);
legacy.buyers.push({
  id: 'buyer-1',
  name: 'Test buyer',
  phone: '',
  cnic: '',
  email: '',
  stage: 'Buyer',
  address: '',
  notes: '',
});
legacy.payments.push({
  id: 'payment-1',
  plot: 47,
  amount: 200,
  date: '2026-11-16',
  method: 'Cash',
  reference: '',
  notes: '',
});
legacy.schedule.push({ id: 'schedule-1', plot: 47, amount: 1000, date: '2026-12-16', notes: '' });
legacy.expenses.push({
  id: 'expense-1',
  title: 'Test expense',
  amount: 100,
  date: '2026-11-16',
  category: 'Other',
  reference: '',
});
legacy.audit.push({ id: 'audit-1', action: 'Existing activity', date: '2026-11-16T00:00:00Z' });
const original = structuredClone(legacy);
const migrated = migratePlan(stateSchema.parse(legacy));
assert.equal(migrated.planVersion, PLAN_VERSION);
assert.equal(migrated.plots.find((p) => p.id === 47).marla, 7);
assert.equal(migrated.plots.find((p) => p.id === 47).status, 'Sold');
for (const key of ['buyers', 'payments', 'schedule', 'expenses', 'audit'])
  assert.deepEqual(migrated[key], original[key]);
for (const p of migrated.plots) {
  const old = original.plots.find((old) => old.id === p.id);
  for (const key of ['area', 'verified', 'price', 'buyer', 'status'])
    assert.equal(p[key], old[key]);
}
assert.deepEqual(legacy, original, 'Migration must not mutate the source');
assert.strictEqual(migratePlan(migrated), migrated, 'A repeated load must not change the data');
assert(stateSchema.safeParse(migrated).success);
for (const change of [
  { verified: true },
  { dimensions: 'Reviewed custom dimensions' },
  { marla: 6 },
]) {
  const customized = structuredClone(original);
  Object.assign(
    customized.plots.find((p) => p.id === 47),
    change,
    { notes: 'Owner notes' },
  );
  assert.deepEqual(
    migratePlan(customized).plots.find((p) => p.id === 47),
    customized.plots.find((p) => p.id === 47),
  );
}
const invalid = structuredClone(fresh);
invalid.plots[0].id = 97;
assert(!stateSchema.safeParse(invalid).success);
invalid.plots[0].id = 2;
assert(!stateSchema.safeParse(invalid).success);
assert(!stateSchema.safeParse({ ...fresh, plots: fresh.plots.slice(1) }).success);
assert(!stateSchema.safeParse({ ...fresh, planVersion: PLAN_VERSION + 1 }).success);

// Clicks and keyboard activation must select by ID even after array reordering.
const reversed = [...migrated.plots].reverse();
let selected;
const element = EstatePlan({
  plots: reversed,
  onSelect: (plot) => {
    selected = plot;
  },
});
const buttons = [];
function walk(node) {
  if (!React.isValidElement(node)) return;
  if (node.props.role === 'button') buttons.push(node);
  React.Children.forEach(node.props.children, walk);
}
walk(element);
assert.equal(buttons.length, 96);
for (const button of buttons) {
  const id = Number(button.props['aria-label'].match(/^Plot (\d+),/)[1]);
  button.props.onClick();
  assert.strictEqual(
    selected,
    reversed.find((p) => p.id === id),
  );
  for (const key of ['Enter', ' ']) {
    selected = undefined;
    let prevented = false;
    button.props.onKeyDown({
      key,
      preventDefault() {
        prevented = true;
      },
    });
    assert(prevented);
    assert.equal(selected.id, id);
  }
}
const markup = renderToStaticMarkup(element);
assert.equal((markup.match(/role="button"/g) ?? []).length, 96);
assert.match(markup, /KAHAL 11/);
assert.match(markup, /MAIN ROAD/);
assert.match(markup, /Plot 47, 7 marla/);
writeFileSync(resolve(output, 'map.html'), markup);
const interactiveMarkup = renderToStaticMarkup(
  React.createElement(EstateMap, { plots: reversed, onSelect() {} }),
);
assert.match(interactiveMarkup, /aria-label="Zoom in"/);
assert.match(interactiveMarkup, /aria-label="Zoom out"/);
assert.match(interactiveMarkup, /Fit map/);
assert.match(interactiveMarkup, /100%/);
console.log(
  'Site plan checks passed: road alignment, 96 unique non-overlapping plots, validation, migration preservation, click and keyboard selection, zoom controls.',
);
