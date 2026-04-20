export const sampleSystems = {
  threeBus: {
    method: 'NR',
    tolerance: 0.001,
    maxIterations: 20,
    accelerationFactor: 1,
    buses: [
      { id: '1', type: 'Slack Bus', vm: 1.025, va: 0 },
      { id: '2', type: 'PQ Bus', vm: 1.0, va: 0 },
      { id: '3', type: 'PV Bus', vm: 1.03, va: 0 }
    ],
    baseMVA: 100,
    generators: [
      { id: 'g1', busId: '1', p: 0, q: 0, voltageSetpoint: 1.025 },
      { id: 'g3', busId: '3', p: 300, voltageSetpoint: 1.03 }
    ],
    loads: [{ id: 'l2', busId: '2', p: 400, q: 200 }],
    lines: [
      { id: '12', from: '1', to: '2', r: 0, x: 0.025, b: 0 },
      { id: '13', from: '1', to: '3', r: 0, x: 0.05, b: 0 },
      { id: '23', from: '2', to: '3', r: 0, x: 0.025, b: 0 }
    ]
  },
  fiveBus: {
    method: 'GS',
    tolerance: 0.001,
    maxIterations: 25,
    accelerationFactor: 1,
    buses: [
      { id: '1', type: 'Slack Bus', vm: 1.04, va: 0 },
      { id: '2', type: 'PV Bus', vm: 1.01, va: 0 },
      { id: '3', type: 'PQ Bus', vm: 1.0, va: 0 },
      { id: '4', type: 'PQ Bus', vm: 1.0, va: 0 },
      { id: '5', type: 'PQ Bus', vm: 1.0, va: 0 }
    ],
    baseMVA: 100,
    generators: [
      { id: 'g1', busId: '1', p: 0, q: 0, voltageSetpoint: 1.04 },
      { id: 'g2', busId: '2', p: 50, qMin: -40, qMax: 40, voltageSetpoint: 1.01 }
    ],
    loads: [
      { id: 'l1', busId: '3', p: 90, q: 30 },
      { id: 'l2', busId: '4', p: 40, q: 15 },
      { id: 'l3', busId: '5', p: 60, q: 20 }
    ],
    lines: [
      { id: '12', from: '1', to: '2', r: 0.02, x: 0.08, b: 0.04 },
      { id: '13', from: '1', to: '3', r: 0.01, x: 0.04, b: 0.02 },
      { id: '23', from: '2', to: '3', r: 0.0125, x: 0.05, b: 0.025 },
      { id: '24', from: '2', to: '4', r: 0.015, x: 0.06, b: 0.03 },
      { id: '35', from: '3', to: '5', r: 0.02, x: 0.08, b: 0.04 },
      { id: '45', from: '4', to: '5', r: 0.025, x: 0.1, b: 0.05 }
    ]
  }
};

export function createDiagramFromSample(system) {
  const nodes = system.buses.map((bus, index) => ({
    id: String(bus.id),
    type: 'busNode',
    position: { x: 180 + (index % 3) * 220, y: 140 + Math.floor(index / 3) * 180 },
    data: {
      id: String(bus.id),
      label: `Bus ${bus.id}`,
      type: bus.type,
      vm: bus.vm,
      va: bus.va,
      voltageSetpoint: bus.vm,
      qMin: null,
      qMax: null
    }
  }));

  const edges = system.lines.map((line) => ({
    id: String(line.id || `${line.from}-${line.to}`),
    source: String(line.from),
    target: String(line.to),
    type: 'smoothstep',
    data: { mode: line.mode || 'impedance', r: line.r, x: line.x, b: line.b, g: line.g, bc: line.bc }
  }));

  return {
    nodes,
    edges,
    generators: system.generators.map((item) => ({ ...item, busId: String(item.busId) })),
    loads: system.loads.map((item) => ({ ...item, busId: String(item.busId) }))
  };
}

export function buildSimulationRequest(state) {
  const busOrder = (node) => {
    const explicit = Number(node?.data?.order);
    if (Number.isFinite(explicit)) return explicit;

    const fromLabel = String(node?.data?.label || '').match(/(\d+)/);
    if (fromLabel) return Number(fromLabel[1]);

    const fromId = String(node?.id || '').match(/(\d+)/);
    if (fromId) return Number(fromId[1]);

    return Number.MAX_SAFE_INTEGER;
  };

  const orderedNodes = [...state.nodes].sort((a, b) => busOrder(a) - busOrder(b));

  return {
    method: state.method,
    maxIterations: state.maxIterations,
    tolerance: state.tolerance,
    baseMVA: Number(state.baseMVA ?? 100),
    accelerationFactor: Number(state.accelerationFactor ?? 1),
    buses: orderedNodes.map((node) => ({
      id: String(node.id),
      type: node.data.type,
      vm: Number(node.data.vm ?? 1),
      va: Number(node.data.va ?? 0),
      voltageSetpoint: Number(node.data.voltageSetpoint ?? node.data.vm ?? 1),
      qMin: node.data.qMin != null ? Number(node.data.qMin) : undefined,
      qMax: node.data.qMax != null ? Number(node.data.qMax) : undefined
    })),
    lines: state.edges.map((edge) => ({
      id: edge.id,
      from: String(edge.source),
      to: String(edge.target),
      mode: edge.data?.mode || 'impedance',
      r: Number(edge.data?.r ?? 0.02),
      x: Number(edge.data?.x ?? 0.06),
      b: Number(edge.data?.b ?? 0),
      g: Number(edge.data?.g ?? 0),
      bc: Number(edge.data?.bc ?? 0)
    })),
    generators: state.generators.map((gen) => ({
      ...gen,
      busId: String(gen.busId),
      p: Number(gen.p),
      q: Number(gen.q ?? 0),
      qMin: gen.qMin != null && gen.qMin !== '' ? Number(gen.qMin) : undefined,
      qMax: gen.qMax != null && gen.qMax !== '' ? Number(gen.qMax) : undefined
    })),
    loads: state.loads.map((load) => ({ ...load, busId: String(load.busId), p: Number(load.p), q: Number(load.q) }))
  };
}
