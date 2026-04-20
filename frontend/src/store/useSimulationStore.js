import { create } from 'zustand';
import { loadSystemState, saveSystemState } from '../utils/storage.js';
import { buildSimulationRequest, createDiagramFromSample } from '../utils/sampleSystems.js';

function uid(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function defaultBusPosition(index = 0) {
  return { x: 180 + (index % 3) * 180, y: 140 + Math.floor(index / 3) * 150 };
}

function busTypeFromValue(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('slack')) return 'Slack Bus';
  if (normalized.includes('pv')) return 'PV Bus';
  return 'PQ Bus';
}

function createBusData(overrides = {}) {
  return {
    type: 'PQ Bus',
    vm: 1,
    va: 0,
    voltageSetpoint: 1,
    qMin: null,
    qMax: null,
    ...overrides
  };
}

function createBusNode(index, overrides = {}) {
  const id = overrides.id || uid('bus');
  return {
    id,
    type: 'busNode',
    position: overrides.position || defaultBusPosition(index),
    data: {
      id,
      label: `Bus ${index + 1}`,
      ...createBusData(overrides.data || {})
    }
  };
}

function createGenerator(busId) {
  return {
    id: uid('gen'),
    busId,
    p: 50,
    q: 0,
    qMin: null,
    qMax: null,
    voltageSetpoint: 1.02
  };
}

function createLoad(busId) {
  return {
    id: uid('load'),
    busId,
    p: 50,
    q: 20
  };
}

function deriveLineData(edge) {
  return {
    mode: edge?.data?.mode || 'impedance',
    r: edge?.data?.r ?? 0.02,
    x: edge?.data?.x ?? 0.06,
    b: edge?.data?.b ?? 0,
    g: edge?.data?.g ?? 0,
    bc: edge?.data?.bc ?? 0
  };
}

function emptySystem() {
  return {
    nodes: [],
    edges: [],
    generators: [],
    loads: []
  };
}

function snapshotState(state) {
  return {
    nodes: state.nodes,
    edges: state.edges,
    generators: state.generators,
    loads: state.loads,
    selectedElement: state.selectedElement,
    selectedTool: state.selectedTool,
    results: state.results,
    iterations: state.iterations,
    ybus: state.ybus,
    error: state.error
  };
}

function withHistory(state, patch) {
  return {
    ...patch,
    historyPast: [...state.historyPast, snapshotState(state)].slice(-100),
    historyFuture: []
  };
}

const stored = loadSystemState();
const initial = stored || emptySystem();

const asArray = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const useSimulationStore = create((set, get) => ({
  view: initial.view || 'landing',
  method: initial.method || 'NR',
  darkMode: initial.darkMode ?? true,
  baseMVA: asNumber(initial.baseMVA, 100),
  accelerationFactor: asNumber(initial.accelerationFactor, 1),
  selectedTool: null,
  nodes: asArray(initial.nodes),
  edges: asArray(initial.edges),
  generators: asArray(initial.generators),
  loads: asArray(initial.loads),
  selectedElement: null,
  results: null,
  iterations: [],
  ybus: [],
  loading: false,
  error: null,
  tolerance: asNumber(initial.tolerance, 0.001),
  maxIterations: asNumber(initial.maxIterations, 25),
  historyPast: [],
  historyFuture: [],

  setView: (view) => set({ view }),
  setMethod: (method) => set({ method }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setTolerance: (tolerance) => set({ tolerance }),
  setBaseMVA: (baseMVA) => set({ baseMVA }),
  setAccelerationFactor: (accelerationFactor) => set({ accelerationFactor }),
  setMaxIterations: (maxIterations) => set({ maxIterations }),
  setResults: (payload) => set({
    results: payload?.results ? { ...payload.results, baseMVA: asNumber(payload?.baseMVA, get().baseMVA || 100) } : null,
    iterations: payload?.iterations || [],
    ybus: payload?.ybus || [],
    baseMVA: asNumber(payload?.baseMVA, get().baseMVA || 100)
  }),
  setSelectedElement: (selectedElement) => set({ selectedElement }),

  setNodes: (nodes) =>
    set((state) => withHistory(state, { nodes })),
  setEdges: (edges) =>
    set((state) => withHistory(state, { edges })),

  addBusNode: (position) =>
    set((state) => {
      const index = state.nodes.length;
      const node = createBusNode(index, { position });
      return withHistory(state, { nodes: [...state.nodes, node], selectedElement: { type: 'bus', id: node.id } });
    }),

  updateBusNode: (busId, patch) =>
    set((state) =>
      withHistory(state, {
        nodes: state.nodes.map((node) =>
          node.id === busId
            ? { ...node, data: { ...node.data, ...patch, type: busTypeFromValue(patch.type || node.data.type) } }
            : node
        )
      })
    ),

  addGenerator: (busId) =>
    set((state) => {
      const generator = createGenerator(busId);
      return withHistory(state, { generators: [...state.generators, generator], selectedElement: { type: 'generator', id: generator.id } });
    }),

  updateGenerator: (generatorId, patch) =>
    set((state) =>
      withHistory(state, {
        generators: state.generators.map((generator) =>
          generator.id === generatorId ? { ...generator, ...patch, busId: patch.busId || generator.busId } : generator
        )
      })
    ),

  removeGenerator: (generatorId) =>
    set((state) => withHistory(state, { generators: state.generators.filter((generator) => generator.id !== generatorId) })),

  addLoad: (busId) =>
    set((state) => {
      const load = createLoad(busId);
      return withHistory(state, { loads: [...state.loads, load], selectedElement: { type: 'load', id: load.id } });
    }),

  updateLoad: (loadId, patch) =>
    set((state) =>
      withHistory(state, {
        loads: state.loads.map((load) => (load.id === loadId ? { ...load, ...patch, busId: patch.busId || load.busId } : load))
      })
    ),

  removeLoad: (loadId) =>
    set((state) => withHistory(state, { loads: state.loads.filter((load) => load.id !== loadId) })),

  addEdge: (edge) =>
    set((state) =>
      withHistory(state, {
        edges: [...state.edges, { ...edge, data: { ...deriveLineData(edge), ...(edge.data || {}) } }]
      })
    ),

  updateEdge: (edgeId, patch) =>
    set((state) =>
      withHistory(state, {
        edges: state.edges.map((edge) =>
          edge.id === edgeId
            ? { ...edge, ...patch, data: { ...edge.data, ...patch.data } }
            : edge
        )
      })
    ),

  loadSystem: (system) =>
    set((state) => {
      const diagram = createDiagramFromSample(system);
      return withHistory(state, {
        method: system.method || 'NR',
        tolerance: system.tolerance || 0.001,
        maxIterations: system.maxIterations || 25,
        baseMVA: asNumber(system.baseMVA, 100),
        accelerationFactor: asNumber(system.accelerationFactor, 1),
        nodes: diagram.nodes,
        edges: diagram.edges,
        generators: diagram.generators,
        loads: diagram.loads,
        selectedTool: null,
        selectedElement: null,
        results: null,
        iterations: [],
        ybus: [],
        error: null,
        baseMVA: asNumber(system.baseMVA, 100),
        accelerationFactor: asNumber(system.accelerationFactor, 1),
        view: 'dashboard'
      });
    }),

  clearSystem: () =>
    set((state) =>
      withHistory(state, {
        nodes: [],
        edges: [],
        generators: [],
        loads: [],
        selectedTool: null,
        selectedElement: null,
        results: null,
        iterations: [],
        ybus: [],
        error: null,
        baseMVA: get().baseMVA
      })
    ),

  deleteSelectedElement: () =>
    set((state) => {
      const selected = state.selectedElement;
      if (!selected?.id) return state;

      if (selected.type === 'bus') {
        const nextNodes = state.nodes.filter((node) => node.id !== selected.id);
        const nextEdges = state.edges.filter((edge) => edge.source !== selected.id && edge.target !== selected.id);
        const nextGenerators = state.generators.filter((generator) => generator.busId !== selected.id);
        const nextLoads = state.loads.filter((load) => load.busId !== selected.id);
        return withHistory(state, {
          nodes: nextNodes,
          edges: nextEdges,
          generators: nextGenerators,
          loads: nextLoads,
          selectedElement: null,
          results: null,
          iterations: [],
          ybus: []
        });
      }

      if (selected.type === 'edge') {
        return withHistory(state, {
          edges: state.edges.filter((edge) => edge.id !== selected.id),
          selectedElement: null,
          results: null,
          iterations: [],
          ybus: []
        });
      }

      if (selected.type === 'generator') {
        return withHistory(state, {
          generators: state.generators.filter((generator) => generator.id !== selected.id),
          selectedElement: null,
          results: null,
          iterations: [],
          ybus: []
        });
      }

      if (selected.type === 'load') {
        return withHistory(state, {
          loads: state.loads.filter((load) => load.id !== selected.id),
          selectedElement: null,
          results: null,
          iterations: [],
          ybus: []
        });
      }

      return state;
    }),

  undo: () =>
    set((state) => {
      const previous = state.historyPast[state.historyPast.length - 1];
      if (!previous) return state;
      return {
        ...previous,
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [snapshotState(state), ...state.historyFuture].slice(0, 100)
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.historyFuture[0];
      if (!next) return state;
      return {
        ...next,
        historyPast: [...state.historyPast, snapshotState(state)].slice(-100),
        historyFuture: state.historyFuture.slice(1)
      };
    }),

  startSimulation: () => set({ view: 'dashboard' }),

  saveSystem: () => {
    const snapshot = {
      view: get().view,
      method: get().method,
      darkMode: get().darkMode,
      baseMVA: get().baseMVA,
      accelerationFactor: get().accelerationFactor,
      tolerance: get().tolerance,
      maxIterations: get().maxIterations,
      nodes: get().nodes,
      edges: get().edges,
      generators: get().generators,
      loads: get().loads
    };
    saveSystemState(snapshot);
  },

  loadSavedSystem: () => {
    const snapshot = loadSystemState();
    if (!snapshot) return;
    set({
      view: snapshot.view || 'dashboard',
      method: snapshot.method || 'NR',
      darkMode: snapshot.darkMode ?? true,
      baseMVA: asNumber(snapshot.baseMVA, 100),
      accelerationFactor: asNumber(snapshot.accelerationFactor, 1),
      tolerance: asNumber(snapshot.tolerance, 0.001),
      maxIterations: asNumber(snapshot.maxIterations, 25),
      nodes: asArray(snapshot.nodes),
      edges: asArray(snapshot.edges),
      generators: asArray(snapshot.generators),
      loads: asArray(snapshot.loads),
      selectedTool: null,
      selectedElement: null,
      results: null,
      iterations: [],
      ybus: [],
      historyPast: [],
      historyFuture: []
    });
  },

  buildRequest: () => buildSimulationRequest(get())
}));
