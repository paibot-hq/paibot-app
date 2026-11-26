import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { APP_CATALOG } from '../../src/lib/app-catalog.ts';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { AI_DS_CATALOG } from '../../src/tools/ai-ds/catalog.ts';
import { LEARN_EDGES, LEARN_NODES, LEARN_ROADMAPS, connectionsFor } from '../../src/lib/learn-roadmaps.ts';

const mathItems = new Set(
  MATH_CATALOG.flatMap(unit => unit.items.map(item => `/math/${unit.id}/${item.id}`)),
);
const aiDsItems = new Set(
  AI_DS_CATALOG.flatMap(unit => unit.items.map(item => `/ai-ds/${unit.id}/${item.id}`)),
);
const labHrefs = new Set(APP_CATALOG.filter(app => app.href).map(app => app.href));

describe('learn-roadmaps', () => {
  it('every LEARN_NODES entry resolves to an existing catalog page', () => {
    for (const [id, node] of Object.entries(LEARN_NODES)) {
      assert.equal(node.id, id);
      if (node.kind === 'math') {
        assert.ok(mathItems.has(node.href), `Missing math item for ${id}: ${node.href}`);
      } else if (node.kind === 'ai-ds') {
        assert.ok(aiDsItems.has(node.href), `Missing ai-ds item for ${id}: ${node.href}`);
      } else {
        assert.ok(labHrefs.has(node.href), `Missing lab tool for ${id}: ${node.href}`);
      }
    }
  });

  it('every roadmap stage references known nodes without duplicates', () => {
    for (const roadmap of LEARN_ROADMAPS) {
      const seen = new Set();
      for (const stage of roadmap.stages) {
        assert.ok(stage.nodes.length > 0, `Empty stage ${roadmap.id}/${stage.id}`);
        for (const nodeId of stage.nodes) {
          assert.ok(LEARN_NODES[nodeId], `Unknown node ${nodeId} in roadmap ${roadmap.id}`);
          assert.ok(!seen.has(nodeId), `Duplicate node ${nodeId} in roadmap ${roadmap.id}`);
          seen.add(nodeId);
        }
      }
    }
  });

  it('every dependency edge references known nodes and forms no self-loops', () => {
    for (const edge of LEARN_EDGES) {
      assert.ok(LEARN_NODES[edge.from], `Unknown edge.from: ${edge.from}`);
      assert.ok(LEARN_NODES[edge.to], `Unknown edge.to: ${edge.to}`);
      assert.notEqual(edge.from, edge.to);
    }
  });

  it('connectionsFor returns prerequisites, leadsTo, and roadmaps for chain-rule and transformer', () => {
    const chain = connectionsFor('math:derivative/chain-rule');
    assert.ok(chain.leadsTo.some(c => c.node.id === 'ai-ds:nn/backpropagation'));
    assert.ok(chain.roadmaps.some(r => r.id === 'transformer'));

    const transformer = connectionsFor('ai-ds:arch/transformer');
    assert.ok(transformer.prerequisites.some(c => c.node.id === 'ai-ds:arch/attention'));
    assert.ok(transformer.prerequisites.some(c => c.node.id === 'ai-ds:arch/skip-connections'));
  });
});
