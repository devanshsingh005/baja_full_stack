function buildForest(dedupedEdges) {
  const parsedEdges = dedupedEdges.map((edge) => {
    const [parent, child] = edge.split('->');
    return { parent, child };
  });

  const parentOf = new Map();
  const keptEdges = [];

  for (const edge of parsedEdges) {
    if (parentOf.has(edge.child)) {
      continue;
    }

    parentOf.set(edge.child, edge.parent);
    keptEdges.push(edge);
  }

  const adjacencyUndirected = new Map();
  const childrenMap = new Map();
  const childSet = new Set();
  const nodeOrder = [];
  const nodeSeen = new Set();

  const ensureNode = (node) => {
    if (!adjacencyUndirected.has(node)) {
      adjacencyUndirected.set(node, new Set());
    }

    if (!childrenMap.has(node)) {
      childrenMap.set(node, []);
    }

    if (!nodeSeen.has(node)) {
      nodeSeen.add(node);
      nodeOrder.push(node);
    }
  };

  for (const { parent, child } of keptEdges) {
    ensureNode(parent);
    ensureNode(child);

    adjacencyUndirected.get(parent).add(child);
    adjacencyUndirected.get(child).add(parent);

    childrenMap.get(parent).push(child);
    childSet.add(child);
  }

  for (const [, children] of childrenMap.entries()) {
    children.sort((a, b) => a.localeCompare(b));
  }

  const components = [];
  const visitedUndirected = new Set();

  for (const startNode of nodeOrder) {
    if (visitedUndirected.has(startNode)) {
      continue;
    }

    const queue = [startNode];
    visitedUndirected.add(startNode);
    const nodes = [];

    while (queue.length > 0) {
      const node = queue.shift();
      nodes.push(node);

      for (const next of adjacencyUndirected.get(node) || []) {
        if (visitedUndirected.has(next)) {
          continue;
        }

        visitedUndirected.add(next);
        queue.push(next);
      }
    }

    components.push(nodes);
  }

  const hasCycleInComponent = (componentSet) => {
    const visiting = new Set();
    const visited = new Set();

    const dfs = (node) => {
      if (visiting.has(node)) {
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visiting.add(node);
      for (const child of childrenMap.get(node) || []) {
        if (!componentSet.has(child)) {
          continue;
        }

        if (dfs(child)) {
          return true;
        }
      }
      visiting.delete(node);
      visited.add(node);
      return false;
    };

    for (const node of componentSet) {
      if (!visited.has(node) && dfs(node)) {
        return true;
      }
    }

    return false;
  };

  const buildTreeObject = (node) => {
    const subtree = {};

    for (const child of childrenMap.get(node) || []) {
      subtree[child] = buildTreeObject(child);
    }

    return subtree;
  };

  const computeDepth = (node) => {
    const children = childrenMap.get(node) || [];
    if (children.length === 0) {
      return 1;
    }

    let maxChildDepth = 0;
    for (const child of children) {
      maxChildDepth = Math.max(maxChildDepth, computeDepth(child));
    }

    return 1 + maxChildDepth;
  };

  const hierarchies = components.map((componentNodes) => {
    const componentSet = new Set(componentNodes);
    const candidateRoots = componentNodes
      .filter((node) => !childSet.has(node))
      .sort((a, b) => a.localeCompare(b));

    const root = candidateRoots.length > 0
      ? candidateRoots[0]
      : [...componentNodes].sort((a, b) => a.localeCompare(b))[0];

    const hasCycle = hasCycleInComponent(componentSet);

    if (hasCycle) {
      return {
        root,
        tree: {},
        has_cycle: true,
      };
    }

    return {
      root,
      tree: {
        [root]: buildTreeObject(root),
      },
      depth: computeDepth(root),
    };
  });

  return { hierarchies };
}

module.exports = {
  buildForest,
};
