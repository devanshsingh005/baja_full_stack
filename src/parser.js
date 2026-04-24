const EDGE_PATTERN = /^[A-Z]->[A-Z]$/;

function normalizeEntry(entry) {
  if (typeof entry !== 'string') {
    return {
      original: String(entry),
      trimmed: '',
      isString: false,
    };
  }

  return {
    original: entry,
    trimmed: entry.trim(),
    isString: true,
  };
}

function parseAndValidate(data) {
  const validEdges = [];
  const invalidEntries = [];

  for (const rawEntry of data) {
    const normalized = normalizeEntry(rawEntry);
    const { original, trimmed, isString } = normalized;

    if (!isString || trimmed === '' || !EDGE_PATTERN.test(trimmed)) {
      invalidEntries.push(original);
      continue;
    }

    const [parent, child] = trimmed.split('->');
    if (parent === child) {
      invalidEntries.push(original);
      continue;
    }

    validEdges.push(trimmed);
  }

  return { validEdges, invalidEntries };
}

function dedupeEdges(validEdges) {
  const dedupedEdges = [];
  const duplicateEdges = [];
  const seen = new Set();
  const duplicatesSeen = new Set();

  for (const edge of validEdges) {
    if (!seen.has(edge)) {
      seen.add(edge);
      dedupedEdges.push(edge);
      continue;
    }

    if (!duplicatesSeen.has(edge)) {
      duplicatesSeen.add(edge);
      duplicateEdges.push(edge);
    }
  }

  return { dedupedEdges, duplicateEdges };
}

module.exports = {
  EDGE_PATTERN,
  parseAndValidate,
  dedupeEdges,
};
