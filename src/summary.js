function buildSummary(hierarchies) {
  let totalTrees = 0;
  let totalCycles = 0;
  let largestTreeRoot = null;
  let largestDepth = -1;

  for (const hierarchy of hierarchies) {
    if (hierarchy.has_cycle) {
      totalCycles += 1;
      continue;
    }

    totalTrees += 1;

    if (
      hierarchy.depth > largestDepth ||
      (hierarchy.depth === largestDepth &&
        (largestTreeRoot === null || hierarchy.root.localeCompare(largestTreeRoot) < 0))
    ) {
      largestDepth = hierarchy.depth;
      largestTreeRoot = hierarchy.root;
    }
  }

  return {
    total_trees: totalTrees,
    total_cycles: totalCycles,
    largest_tree_root: largestTreeRoot,
  };
}

module.exports = {
  buildSummary,
};
