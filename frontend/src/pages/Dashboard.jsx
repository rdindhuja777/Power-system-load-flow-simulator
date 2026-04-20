import { useMemo, useCallback, useEffect } from 'react';
import ReactFlow, { Background, ConnectionMode, Controls, ReactFlowProvider, applyEdgeChanges, applyNodeChanges, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { useSimulationStore } from '../store/useSimulationStore.js';
import { sampleSystems } from '../utils/sampleSystems.js';
import Toolbox from '../components/Toolbox.jsx';
import PropertiesPanel from '../components/PropertiesPanel.jsx';
import ResultsPanel from '../components/ResultsPanel.jsx';
import TopBar from '../components/TopBar.jsx';
import BusNode from '../components/BusNode.jsx';
import { exportPDF } from '../utils/exporters.js';
import { simulateLoadFlow } from '../utils/api.js';

const nodeTypes = { busNode: BusNode };

function CanvasInner() {
  const { project } = useReactFlow();
  const nodes = useSimulationStore((state) => state.nodes);
  const edges = useSimulationStore((state) => state.edges);
  const setNodes = useSimulationStore((state) => state.setNodes);
  const setEdges = useSimulationStore((state) => state.setEdges);
  const addBusNode = useSimulationStore((state) => state.addBusNode);
  const addEdge = useSimulationStore((state) => state.addEdge);
  const selectedTool = useSimulationStore((state) => state.selectedTool);
  const setSelectedTool = useSimulationStore((state) => state.setSelectedTool);
  const setSelectedElement = useSimulationStore((state) => state.setSelectedElement);
  const busResults = useSimulationStore((state) => state.results?.busResults || []);

  const onNodesChange = useCallback((changes) => setNodes(applyNodeChanges(changes, nodes)), [nodes, setNodes]);
  const onEdgesChange = useCallback((changes) => setEdges(applyEdgeChanges(changes, edges)), [edges, setEdges]);
  const onConnect = useCallback((connection) => {
    addEdge({
      id: `line-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      type: 'smoothstep',
      data: { mode: 'impedance', r: 0.02, x: 0.06, b: 0, g: 0, bc: 0 },
    });
  }, [addEdge]);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-power-tool') || selectedTool;
    if (!type) return;
    const position = project({ x: event.clientX, y: event.clientY });
    if (type === 'bus') {
      addBusNode(position);
    } else if (type === 'generator' || type === 'load') {
      const targetNode = nodes.find((node) => {
        const dx = node.position.x - position.x;
        const dy = node.position.y - position.y;
        return Math.sqrt(dx * dx + dy * dy) < 80;
      });
      if (targetNode) {
        const store = useSimulationStore.getState();
        if (type === 'generator') store.addGenerator(targetNode.id);
        if (type === 'load') store.addLoad(targetNode.id);
      }
    }
    setSelectedTool(null);
  }, [addBusNode, nodes, project, selectedTool, setSelectedTool]);

  const nodeColor = useCallback((node) => {
    const result = busResults.find((item) => String(item.busId) === String(node.id));
    if (!result) return '#0f172a';
    return result.voltageMagnitude >= 0.95 && result.voltageMagnitude <= 1.05 ? '#064e3b' : '#7f1d1d';
  }, [busResults]);

  return (
    <div className="relative min-h-[60vh] rounded-2xl border border-slate-800 bg-slate-950 xl:h-full xl:min-h-0">
      {nodes.length === 0 ? (
        <div className="absolute z-10 m-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-400 sm:m-4 sm:px-4 sm:py-3 sm:text-sm">
          No buses on the canvas yet. Drag a Bus from the toolbox or start with a sample system.
        </div>
      ) : null}
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          data: { ...node.data, label: node.data.label, resultColor: nodeColor(node) },
        }))}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        onNodeClick={(_event, node) => setSelectedElement({ type: 'bus', id: node.id })}
        onEdgeClick={(_event, edge) => setSelectedElement({ type: 'edge', id: edge.id })}
        fitView
      >
        <Background color="#334155" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

export default function Dashboard() {
  const method = useSimulationStore((state) => state.method);
  const setMethod = useSimulationStore((state) => state.setMethod);
  const darkMode = useSimulationStore((state) => state.darkMode);
  const toggleDarkMode = useSimulationStore((state) => state.toggleDarkMode);
  const baseMVA = useSimulationStore((state) => state.baseMVA);
  const setBaseMVA = useSimulationStore((state) => state.setBaseMVA);
  const accelerationFactor = useSimulationStore((state) => state.accelerationFactor);
  const setAccelerationFactor = useSimulationStore((state) => state.setAccelerationFactor);
  const tolerance = useSimulationStore((state) => state.tolerance);
  const setTolerance = useSimulationStore((state) => state.setTolerance);
  const maxIterations = useSimulationStore((state) => state.maxIterations);
  const setMaxIterations = useSimulationStore((state) => state.setMaxIterations);
  const loading = useSimulationStore((state) => state.loading);
  const setLoading = useSimulationStore((state) => state.setLoading);
  const setError = useSimulationStore((state) => state.setError);
  const setResults = useSimulationStore((state) => state.setResults);
  const buildRequest = useSimulationStore((state) => state.buildRequest);
  const saveSystem = useSimulationStore((state) => state.saveSystem);
  const loadSavedSystem = useSimulationStore((state) => state.loadSavedSystem);
  const loadSystem = useSimulationStore((state) => state.loadSystem);
  const undo = useSimulationStore((state) => state.undo);
  const redo = useSimulationStore((state) => state.redo);
  const deleteSelectedElement = useSimulationStore((state) => state.deleteSelectedElement);
  const results = useSimulationStore((state) => state.results);
  const iterations = useSimulationStore((state) => state.iterations);
  const selectedTool = useSimulationStore((state) => state.selectedTool);
  const setSelectedTool = useSimulationStore((state) => state.setSelectedTool);
  const nodes = useSimulationStore((state) => state.nodes);
  const edges = useSimulationStore((state) => state.edges);
  const generators = useSimulationStore((state) => state.generators);
  const loads = useSimulationStore((state) => state.loads);
  const error = useSimulationStore((state) => state.error);

  const onRun = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = buildRequest();
      const response = await simulateLoadFlow(payload);
      setResults(response);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onExportPDF = () =>
    exportPDF('load-flow-results.pdf', {
      title: 'Power System Load Flow Results',
      busResults: results?.busResults || [],
      lineResults: results?.lineResults || [],
      iterations,
      baseMVA: results?.baseMVA || baseMVA,
    });

  const onLoadSample = (sampleKey) => {
    const sample = sampleSystems[sampleKey];
    if (sample) {
      loadSystem(sample);
    }
  };

  const clearSystem = useSimulationStore((state) => state.clearSystem);

  const onDragStart = (event, type) => {
    event.dataTransfer.setData('application/x-power-tool', type);
    setSelectedTool(type);
  };

  const systemNotice = useMemo(() => {
    if (!results) return 'No simulation executed yet.';
    return results.converged
      ? 'Solved successfully.'
      : 'Solution did not converge within the configured limit.';
  }, [results]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!target) return false;
      const tag = target.tagName?.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        deleteSelectedElement();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 'z' && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelectedElement, redo, undo]);

  return (
    <div
      className={
        darkMode
          ? 'min-h-full bg-slate-950 text-slate-100'
          : 'min-h-full bg-slate-100 text-slate-900'
      }
    >
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-4 p-3 sm:p-4 lg:p-6">
        <TopBar
          method={method}
          onMethodChange={setMethod}
          onRun={onRun}
          loading={loading}
          baseMVA={baseMVA}
          onBaseMVAChange={setBaseMVA}
          accelerationFactor={accelerationFactor}
          onAccelerationFactorChange={setAccelerationFactor}
          tolerance={tolerance}
          onToleranceChange={setTolerance}
          maxIterations={maxIterations}
          onMaxIterationsChange={setMaxIterations}
          onToggleDarkMode={toggleDarkMode}
          onSave={saveSystem}
          onLoad={loadSavedSystem}
          onLoadSample={onLoadSample}
          onExportPDF={onExportPDF}
          onUndo={undo}
          onRedo={redo}
          onClear={clearSystem}
        />

        <div className="grid flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          <Toolbox
            onDragStart={onDragStart}
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
          />
          <Canvas />
          <PropertiesPanel />
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="panel border-rose-500/40 bg-rose-950/60 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          <div className="panel p-4 text-sm text-slate-300">
            <strong className="text-white">Status:</strong> {systemNotice}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="chip">Buses: {nodes.length}</span>
              <span className="chip">Lines: {edges.length}</span>
              <span className="chip">Generators: {generators.length}</span>
              <span className="chip">Loads: {loads.length}</span>
            </div>
          </div>
          <ResultsPanel
            results={results}
            iterations={iterations}
            method={method}
          />
        </div>
      </div>
    </div>
  );
}
