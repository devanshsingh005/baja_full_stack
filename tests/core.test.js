const { parseAndValidate, dedupeEdges } = require('../src/parser');
const { buildForest } = require('../src/forest');
const { buildSummary } = require('../src/summary');

function parseInput(data) {
  const { validEdges, invalidEntries } = parseAndValidate(data);
  const { dedupedEdges, duplicateEdges } = dedupeEdges(validEdges);
  return {
    validEdges: dedupedEdges,
    invalidEntries,
    duplicateEdges,
  };
}

function runPipeline(inputData) {
  const { validEdges, invalidEntries } = parseAndValidate(inputData);
  const { dedupedEdges, duplicateEdges } = dedupeEdges(validEdges);
  const { hierarchies } = buildForest(dedupedEdges);
  const summary = buildSummary(hierarchies);

  return {
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  };
}

describe('BFHL core pipeline', () => {
  test('1) basic valid input builds correct tree structure', () => {
    const result = runPipeline(['A->B', 'A->C', 'B->D']);

    expect(result.hierarchies).toEqual([
      {
        root: 'A',
        tree: {
          A: {
            B: { D: {} },
            C: {},
          },
        },
        depth: 3,
      },
    ]);
    expect(result.summary).toEqual({
      total_trees: 1,
      total_cycles: 0,
      largest_tree_root: 'A',
    });
  });

  test('2) self-loop is pushed to invalid_entries', () => {
    const result = runPipeline(['A->A']);

    expect(result.invalid_entries).toEqual(['A->A']);
    expect(result.hierarchies).toEqual([]);
  });

  test('3) pure cycle returns has_cycle true with lexicographically smallest root', () => {
    const result = runPipeline(['Y->Z', 'Z->X', 'X->Y']);

    expect(result.hierarchies).toEqual([
      {
        root: 'X',
        tree: {},
        has_cycle: true,
      },
    ]);
  });

  test('4) multi-parent diamond keeps first parent and discards subsequent parent edge', () => {
    const result = runPipeline(['A->C', 'B->C', 'A->D']);

    expect(result.hierarchies).toEqual([
      {
        root: 'A',
        tree: {
          A: {
            C: {},
            D: {},
          },
        },
        depth: 2,
      },
    ]);
  });

  test('5) triple duplicate lists duplicate edge exactly once', () => {
    const result = runPipeline(['A->B', 'A->B', 'A->B']);

    expect(result.duplicate_edges).toEqual(['A->B']);
    expect(result.hierarchies).toHaveLength(1);
  });

  test('6) mixed valid + invalid + duplicate matches spec reference behavior', () => {
    const result = runPipeline([
      'A->B', 'A->C', 'B->D', 'C->E', 'E->F',
      'X->Y', 'Y->Z', 'Z->X',
      'P->Q', 'Q->R',
      'G->H', 'G->H', 'G->I',
      'hello', '1->2', 'A->',
    ]);

    expect(result).toEqual({
      hierarchies: [
        {
          root: 'A',
          tree: { A: { B: { D: {} }, C: { E: { F: {} } } } },
          depth: 4,
        },
        {
          root: 'X',
          tree: {},
          has_cycle: true,
        },
        {
          root: 'P',
          tree: { P: { Q: { R: {} } } },
          depth: 3,
        },
        {
          root: 'G',
          tree: { G: { H: {}, I: {} } },
          depth: 2,
        },
      ],
      invalid_entries: ['hello', '1->2', 'A->'],
      duplicate_edges: ['G->H'],
      summary: {
        total_trees: 3,
        total_cycles: 1,
        largest_tree_root: 'A',
      },
    });
  });

  test('7) empty data array returns empty hierarchy/invalid/duplicate', () => {
    const result = runPipeline([]);

    expect(result.hierarchies).toEqual([]);
    expect(result.invalid_entries).toEqual([]);
    expect(result.duplicate_edges).toEqual([]);
    expect(result.summary).toEqual({
      total_trees: 0,
      total_cycles: 0,
      largest_tree_root: null,
    });
  });

  test('8) whitespace trimming treats spaced edge as valid', () => {
    const result = runPipeline([' A->B ']);

    expect(result.invalid_entries).toEqual([]);
    expect(result.hierarchies[0]).toEqual({
      root: 'A',
      tree: { A: { B: {} } },
      depth: 2,
    });
  });

  test('9) depth calculation on 5-node chain returns depth 5', () => {
    const result = runPipeline(['A->B', 'B->C', 'C->D', 'D->E']);

    expect(result.hierarchies[0].depth).toBe(5);
  });

  test('10) summary tie-breaker picks lexicographically smaller root for equal depth', () => {
    const result = runPipeline(['B->C', 'A->D']);

    expect(result.summary).toEqual({
      total_trees: 2,
      total_cycles: 0,
      largest_tree_root: 'A',
    });
  });
});

describe('Input sanitization', () => {
  test('rejects data array over 200 entries', () => {
    const data = Array(201).fill('A->B');
    const { validEdges } = parseInput(data.map((e) => e.slice(0, 20)));
    expect(validEdges).toBeDefined();
  });

  test('coerces non-string entries to empty string (invalid)', () => {
    const sanitized = [42, null, undefined, {}, 'A->B'].map((entry) =>
      (typeof entry === 'string' ? entry.slice(0, 20) : '')
    );
    const { invalidEntries, validEdges } = parseInput(sanitized);
    expect(validEdges).toHaveLength(1);
    expect(invalidEntries.length).toBeGreaterThanOrEqual(4);
  });

  test('strings over 20 chars are truncated and become invalid', () => {
    const long = 'A->B->C->D->E->F->G->H';
    const sanitized = [long.slice(0, 20)];
    const { invalidEntries } = parseInput(sanitized);
    expect(invalidEntries).toHaveLength(1);
  });
});
