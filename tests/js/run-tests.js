#!/usr/bin/env node
/**
 * JS TEST HARNESS — run with `npm test` or `node tests/js/run-tests.js`.
 *
 * Dependency-free (plain Node asserts). Covers the DOM-free JS modules
 * that the pytest suite cannot reach:
 *
 *   1. DeltaUtils        — patch compute/apply round-trips (live save path)
 *   2. DiagramEditorCore — diagram CRUD, migration, unsaved-change logic
 *   3. OrthogonalRouter  — path parsing/rounding basics
 *   4. Block catalogs    — data integrity of types and templates
 *   5. Static sweep      — calls to editor/renderer methods must exist
 *      (this exact check found renderer.renderAllConnections() and
 *       editor.snapPointToGrid() being called despite not existing)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

// Browser-global shim for classic-script modules
global.window = {};

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log('  FAIL ' + name + '\n       ' + String(err.message || err).split('\n')[0]);
  }
}

function section(title) {
  console.log('\n== ' + title + ' ==');
}

// =====================================================================
// 1. DeltaUtils
// =====================================================================
section('DeltaUtils');
const DeltaUtils = require(path.join(SRC, 'utils', 'delta-utils.js'));

const roundTrip = (oldDoc, newDoc) => {
  const patch = DeltaUtils.computePatch(oldDoc, newDoc);
  const applied = DeltaUtils.applyPatch(oldDoc, patch);
  assert.deepStrictEqual(applied, newDoc);
  return patch;
};

test('identical docs produce empty patch', () => {
  const doc = { blocks: [{ id: 'a', x: 1 }] };
  assert.deepStrictEqual(DeltaUtils.computePatch(doc, doc), []);
});

test('modify round-trips', () => {
  roundTrip(
    { blocks: [{ id: 'a', x: 1 }, { id: 'b', x: 2 }], meta: { v: 1 } },
    { blocks: [{ id: 'a', x: 9 }, { id: 'b', x: 2 }], meta: { v: 1 } }
  );
});

test('add/remove block use whole-list replace and round-trip', () => {
  const patch = roundTrip(
    { blocks: [{ id: 'a', x: 1 }] },
    { blocks: [{ id: 'a', x: 1 }, { id: 'b', x: 2 }] }
  );
  assert.strictEqual(patch.length, 1);
  assert.strictEqual(patch[0].op, 'replace');
  assert.strictEqual(patch[0].path, '/blocks');
  roundTrip(
    { blocks: [{ id: 'a', x: 1 }, { id: 'b', x: 2 }] },
    { blocks: [{ id: 'a', x: 1 }] }
  );
});

test('reorder + modify round-trips without cross-contamination', () => {
  const oldDoc = { blocks: [{ id: 'a', n: 'A' }, { id: 'b', n: 'B' }, { id: 'c', n: 'C' }] };
  const newDoc = { blocks: [{ id: 'c', n: 'C2' }, { id: 'b', n: 'B' }, { id: 'a', n: 'A' }] };
  const applied = DeltaUtils.applyPatch(oldDoc, DeltaUtils.computePatch(oldDoc, newDoc));
  const byId = Object.fromEntries(applied.blocks.map(b => [b.id, b]));
  assert.strictEqual(byId.a.n, 'A');
  assert.strictEqual(byId.c.n, 'C2');
});

test('multi-element index-list shrink round-trips (reverse removals)', () => {
  roundTrip(
    { c: [{ id: 'x' }], w: [[1, 2], [3, 4], [5, 6], [7, 8]] },
    { c: [{ id: 'x' }], w: [[1, 2]] }
  );
});

test('removed dict key round-trips', () => {
  roundTrip({ m: { a: 1, b: 2 } }, { m: { a: 1 } });
});

test('applyPatch does not mutate the input document', () => {
  const oldDoc = { blocks: [{ id: 'a', x: 1 }] };
  const snapshot = JSON.parse(JSON.stringify(oldDoc));
  DeltaUtils.applyPatch(oldDoc, [{ op: 'replace', path: '/blocks/0/x', value: 5 }]);
  assert.deepStrictEqual(oldDoc, snapshot);
});

// =====================================================================
// 2. DiagramEditorCore
// =====================================================================
section('DiagramEditorCore');
// Make DeltaUtils visible the way the browser sees it (bare global)
global.DeltaUtils = DeltaUtils;
const DiagramEditorCore = require(path.join(SRC, 'core', 'diagram-editor.js'));

const makeEditor = () => new DiagramEditorCore();

test('empty diagram carries schema identifiers', () => {
  const d = makeEditor().diagram;
  assert.strictEqual(d.schemaVersion, DiagramEditorCore.SCHEMA_VERSION);
  assert.strictEqual(d.schema, 'system-blocks-v2');
  assert.deepStrictEqual(d.blocks, []);
  assert.deepStrictEqual(d.connections, []);
});

test('addBlock applies defaults and default attributes', () => {
  const ed = makeEditor();
  const b = ed.addBlock({ name: 'Motor', type: 'Mechanical', x: 40, y: 60 });
  assert.ok(b.id);
  assert.strictEqual(b.width, 160);
  assert.strictEqual(b.height, 100);
  assert.strictEqual(b.status, 'Placeholder');
  assert.ok('Part Number' in b.attributes);
});

test('addBlock ignores caller-supplied id', () => {
  const ed = makeEditor();
  const b = ed.addBlock({ id: 'evil', name: 'X' });
  assert.notStrictEqual(b.id, 'evil');
});

test('duplicate connection of same type is rejected', () => {
  const ed = makeEditor();
  const a = ed.addBlock({ name: 'A' });
  const b = ed.addBlock({ name: 'B' });
  assert.ok(ed.addConnection(a.id, b.id, 'power'));
  assert.strictEqual(ed.addConnection(a.id, b.id, 'power'), null);
  assert.ok(ed.addConnection(a.id, b.id, 'data'), 'different type must be allowed');
});

test('self-connections and unknown endpoints are rejected', () => {
  const ed = makeEditor();
  const a = ed.addBlock({ name: 'A' });
  assert.strictEqual(ed.addConnection(a.id, a.id, 'data'), null);
  assert.strictEqual(ed.addConnection(a.id, 'ghost', 'data'), null);
});

test('removeBlock cascades to connections, stubs, and groups', () => {
  const ed = makeEditor();
  const a = ed.addBlock({ name: 'A' });
  const b = ed.addBlock({ name: 'B' });
  ed.addConnection(a.id, b.id, 'data');
  ed.addNamedStub('5V', a.id);
  ed.diagram.groups.push({ id: 'g1', name: 'G', blockIds: [a.id, b.id] });

  ed.removeBlock(a.id);
  assert.strictEqual(ed.diagram.connections.length, 0);
  assert.strictEqual(ed.diagram.namedStubs.length, 0);
  assert.deepStrictEqual(ed.diagram.groups[0].blockIds, [b.id]);
});

test('migrateDiagram upgrades 0.9 documents', () => {
  const doc = { blocks: [{ id: 'a', name: 'A' }], connections: [] };
  DiagramEditorCore.migrateDiagram(doc);
  assert.strictEqual(doc.schemaVersion, '1.0');
  assert.deepStrictEqual(doc.blocks[0].requirements, []);
});

test('hasUnsavedChanges: dirty flag wins, markSaved resets', () => {
  const ed = makeEditor();
  ed.markSaved();
  assert.strictEqual(ed.hasUnsavedChanges(), false);
  ed.addBlock({ name: 'A' });
  assert.strictEqual(ed.hasUnsavedChanges(), true);
  ed.markSaved();
  assert.strictEqual(ed.hasUnsavedChanges(), false);
  // Page-level ops only set the dirty flag — no diagram delta
  ed._markDirty();
  assert.strictEqual(ed.hasUnsavedChanges(), true, 'dirty flag must win over empty delta');
});

test('getDelta reflects edits since markSaved', () => {
  const ed = makeEditor();
  ed.markSaved();
  assert.deepStrictEqual(ed.getDelta(), []);
  ed.addBlock({ name: 'A' });
  assert.ok(ed.getDelta().length > 0);
});

// =====================================================================
// 3. OrthogonalRouter
// =====================================================================
section('OrthogonalRouter');
const OrthogonalRouter = require(path.join(SRC, 'core', 'orthogonal-router.js'));

test('routes a straight unobstructed segment directly', () => {
  const r = new OrthogonalRouter();
  assert.strictEqual(r.computePath(0, 50, 100, 50, []), 'M 0 50 L 100 50');
});

test('routes around an obstacle without crossing it', () => {
  const r = new OrthogonalRouter();
  const obstacle = { x: 40, y: 20, width: 20, height: 60 };
  const d = r.computePath(0, 50, 100, 50, [obstacle]);
  const points = OrthogonalRouter.parseMLPoints(d);
  assert.ok(points.length >= 2);
  // No sampled point may sit strictly inside the obstacle
  for (let i = 0; i < points.length - 1; i++) {
    for (let t = 0; t <= 1; t += 0.1) {
      const x = points[i].x + (points[i + 1].x - points[i].x) * t;
      const y = points[i].y + (points[i + 1].y - points[i].y) * t;
      const inside = x > obstacle.x + 1 && x < obstacle.x + obstacle.width - 1 &&
                     y > obstacle.y + 1 && y < obstacle.y + obstacle.height - 1;
      assert.ok(!inside, `path crosses obstacle at ${x},${y}`);
    }
  }
});

test('roundCorners preserves endpoints', () => {
  const r = new OrthogonalRouter();
  const rounded = r.roundCorners('M 0 0 L 50 0 L 50 50');
  assert.ok(rounded.startsWith('M 0 0'));
  assert.ok(rounded.endsWith('L 50 50'));
  assert.ok(rounded.includes('Q'), 'corner should be rounded with a quadratic curve');
});

// =====================================================================
// 4. Block catalogs and templates
// =====================================================================
section('Block catalogs');
const Electrical = require(path.join(SRC, 'types', 'electrical-blocks.js'));
const Mechanical = require(path.join(SRC, 'types', 'mechanical-blocks.js'));
const Software = require(path.join(SRC, 'types', 'software-blocks.js'));
const Templates = require(path.join(SRC, 'types', 'block-templates.js'));

const E = Electrical.ElectricalBlockTypes || Electrical;
const M = Mechanical.MechanicalBlockTypes || Mechanical;
const S = Software.SoftwareBlockTypes || Software;
const T = Templates.BlockTemplateSystem || Templates;

const collectTypes = () => {
  const all = [];
  for (const c of E.getCategories()) {
    for (const [k, v] of Object.entries(E.getTypesByCategory(c))) all.push(['E', k, v]);
  }
  for (const [k, v] of Object.entries(M.getAll())) all.push(['M', k, v]);
  for (const [k, v] of Object.entries(S.getAll())) all.push(['S', k, v]);
  return all;
};

test('catalog APIs used by the shape palette exist', () => {
  assert.strictEqual(typeof E.getType, 'function');
  assert.strictEqual(typeof E.getCategories, 'function');
  assert.strictEqual(typeof E.getTypesByCategory, 'function');
  assert.strictEqual(typeof M.getAll, 'function');
  assert.strictEqual(typeof S.getAll, 'function');
  assert.strictEqual(typeof T.createFromTemplate, 'function');
});

test('no duplicate type ids across catalogs', () => {
  const seen = new Map();
  for (const [lib, key] of collectTypes()) {
    assert.ok(!seen.has(key), `duplicate type id '${key}' in ${seen.get(key)} and ${lib}`);
    seen.set(key, lib);
  }
});

test('every type has name and specifications (tooltip contract)', () => {
  for (const [lib, key, def] of collectTypes()) {
    assert.ok(def.name, `${lib}:${key} missing name`);
    assert.notStrictEqual(def.specifications, undefined, `${lib}:${key} missing specifications`);
  }
});

test('every template creates blocks with in-range connection indices', () => {
  const templates = T.getAllTemplates();
  assert.ok(Object.keys(templates).length > 0);
  for (const id of Object.keys(templates)) {
    const result = T.createFromTemplate(id, { x: 0, y: 0 });
    assert.ok(result, `template ${id} returned falsy`);
    const n = result.blocks.length;
    for (const c of result.connections || []) {
      assert.ok(c.from.component >= 0 && c.from.component < n, `${id}: from index out of range`);
      assert.ok(c.to.component >= 0 && c.to.component < n, `${id}: to index out of range`);
    }
    for (const b of result.blocks) {
      assert.strictEqual(typeof b.x, 'number', `${id}: block '${b.name}' missing x`);
      assert.strictEqual(typeof b.y, 'number', `${id}: block '${b.name}' missing y`);
    }
  }
});

// =====================================================================
// 5. Static sweep — phantom method calls
// =====================================================================
section('Static sweep');

const methodsOf = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set(['constructor']);
  for (const m of src.matchAll(/^  (?:static\s+|async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm)) {
    if (!['if', 'for', 'while', 'switch', 'catch'].includes(m[1])) names.add(m[1]);
  }
  return names;
};

test('all editor/renderer method calls resolve to real methods', () => {
  const editorMethods = methodsOf(path.join(SRC, 'core', 'diagram-editor.js'));
  const rendererMethods = methodsOf(path.join(SRC, 'ui', 'diagram-renderer.js'));

  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(e.name)) files.push(p);
    }
  };
  walk(SRC);

  const skip = new Set(['then', 'catch', 'call', 'apply', 'bind', 'hasOwnProperty', 'toString']);
  const phantoms = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const check = (re, methods, label) => {
      for (const m of src.matchAll(re)) {
        if (methods.has(m[1]) || skip.has(m[1])) continue;
        phantoms.push(`${path.relative(ROOT, f)}: ${label}.${m[1]}()`);
      }
    };
    check(/(?:window\.diagramEditor|this\.editor|\beditor)\.([A-Za-z_$][\w$]*)\s*\(/g, editorMethods, 'editor');
    check(/(?:window\.diagramRenderer|this\.renderer|\brenderer)\.([A-Za-z_$][\w$]*)\s*\(/g, rendererMethods, 'renderer');
  }
  assert.deepStrictEqual(phantoms, [], 'phantom method calls found');
});

// =====================================================================
// Summary
// =====================================================================
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  for (const { name, err } of failures) {
    console.error(`\nFAIL ${name}\n${err.stack || err}`);
  }
  process.exit(1);
}
