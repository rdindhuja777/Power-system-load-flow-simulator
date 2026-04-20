import { useMemo } from 'react';
import { useSimulationStore } from '../store/useSimulationStore.js';

function NumberField({ label, value, onChange, step = '0.01' }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input type="number" step={step} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} className="field-input" />
    </label>
  );
}

function OptionalNumberField({ label, value, onChange, step = '0.01', placeholder = 'Optional' }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="field-input"
      />
    </label>
  );
}

function LineFields({ selectedEdge, updateEdge }) {
  const mode = selectedEdge.data?.mode || 'impedance';

  return (
    <div className="space-y-3">
      <label>
        <span className="field-label">Line Value Type</span>
        <select
          value={mode}
          onChange={(e) => updateEdge(selectedEdge.id, { data: { ...selectedEdge.data, mode: e.target.value } })}
          className="field-input"
        >
          <option value="impedance">Impedance (R, X, B)</option>
          <option value="admittance">Admittance (G, B, Bc)</option>
        </select>
      </label>

      {mode === 'impedance' ? (
        <>
          <NumberField label="Resistance R (p.u.)" value={selectedEdge.data?.r} onChange={(value) => updateEdge(selectedEdge.id, { data: { ...selectedEdge.data, r: value } })} step="0.001" />
          <NumberField label="Reactance X (p.u.)" value={selectedEdge.data?.x} onChange={(value) => updateEdge(selectedEdge.id, { data: { ...selectedEdge.data, x: value } })} step="0.001" />
          <NumberField label="Line Charging B (p.u.)" value={selectedEdge.data?.b} onChange={(value) => updateEdge(selectedEdge.id, { data: { ...selectedEdge.data, b: value } })} step="0.001" />
        </>
      ) : (
        <>
          <NumberField label="Admittance G (p.u.)" value={selectedEdge.data?.g} onChange={(value) => updateEdge(selectedEdge.id, { data: { ...selectedEdge.data, g: value } })} step="0.001" />
          <NumberField label="Admittance B (p.u.)" value={selectedEdge.data?.b} onChange={(value) => updateEdge(selectedEdge.id, { data: { ...selectedEdge.data, b: value } })} step="0.001" />
          <NumberField label="Line Charging Bc (p.u.)" value={selectedEdge.data?.bc} onChange={(value) => updateEdge(selectedEdge.id, { data: { ...selectedEdge.data, bc: value } })} step="0.001" />
        </>
      )}
    </div>
  );
}

export default function PropertiesPanel() {
  const selected = useSimulationStore((state) => state.selectedElement);
  const nodes = useSimulationStore((state) => state.nodes);
  const edges = useSimulationStore((state) => state.edges);
  const generators = useSimulationStore((state) => state.generators);
  const loads = useSimulationStore((state) => state.loads);
  const updateBusNode = useSimulationStore((state) => state.updateBusNode);
  const updateGenerator = useSimulationStore((state) => state.updateGenerator);
  const updateLoad = useSimulationStore((state) => state.updateLoad);
  const updateEdge = useSimulationStore((state) => state.updateEdge);

  const selectedNode = selected?.type === 'bus' ? nodes.find((node) => node.id === selected.id) : null;
  const selectedGenerator = selected?.type === 'generator' ? generators.find((item) => item.id === selected.id) : null;
  const selectedLoad = selected?.type === 'load' ? loads.find((item) => item.id === selected.id) : null;
  const selectedEdge = selected?.type === 'edge' ? edges.find((item) => item.id === selected.id) : null;

  const busOptions = useMemo(() => nodes.map((node) => ({ value: node.id, label: node.data.label })), [nodes]);

  return (
    <div className="panel h-full">
      <div className="panel-header">Properties</div>
      <div className="space-y-4 p-4 text-sm">
        {!selected ? <p className="text-slate-400">Select a bus, generator, load, or transmission line to edit its parameters.</p> : null}

        {selectedNode ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Bus</p>
              <p className="text-lg font-semibold text-white">{selectedNode.data.label}</p>
              <p className="text-xs text-slate-500">Auto-generated bus ID: {selectedNode.id}</p>
            </div>
            <label>
              <span className="field-label">Type</span>
              <select value={selectedNode.data.type} onChange={(e) => updateBusNode(selectedNode.id, { type: e.target.value })} className="field-input">
                <option>Slack Bus</option>
                <option>PV Bus</option>
                <option>PQ Bus</option>
              </select>
            </label>
            <NumberField label="Voltage Magnitude (p.u.)" value={selectedNode.data.vm} onChange={(value) => updateBusNode(selectedNode.id, { vm: value })} step="0.001" />
            <NumberField label="Voltage Angle (deg)" value={selectedNode.data.va} onChange={(value) => updateBusNode(selectedNode.id, { va: value })} step="0.1" />
            <NumberField label="Voltage Setpoint (p.u.)" value={selectedNode.data.voltageSetpoint} onChange={(value) => updateBusNode(selectedNode.id, { voltageSetpoint: value })} step="0.001" />
          </div>
        ) : null}

        {selectedGenerator ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-cyan-300">Generator</p>
              <p className="font-semibold text-white">{selectedGenerator.id}</p>
            </div>
            <label>
              <span className="field-label">Connected Bus</span>
              <select value={selectedGenerator.busId} onChange={(e) => updateGenerator(selectedGenerator.id, { busId: e.target.value })} className="field-input">
                {busOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <NumberField label="Real Power P (MW)" value={selectedGenerator.p} onChange={(value) => updateGenerator(selectedGenerator.id, { p: value })} step="0.01" />
            <NumberField label="Reactive Power Q (Mvar)" value={selectedGenerator.q} onChange={(value) => updateGenerator(selectedGenerator.id, { q: value })} step="0.01" />
            <OptionalNumberField label="Q Min (Mvar)" value={selectedGenerator.qMin} onChange={(value) => updateGenerator(selectedGenerator.id, { qMin: value })} step="0.01" />
            <OptionalNumberField label="Q Max (Mvar)" value={selectedGenerator.qMax} onChange={(value) => updateGenerator(selectedGenerator.id, { qMax: value })} step="0.01" />
            <NumberField label="Voltage Setpoint (p.u.)" value={selectedGenerator.voltageSetpoint} onChange={(value) => updateGenerator(selectedGenerator.id, { voltageSetpoint: value })} step="0.001" />
          </div>
        ) : null}

        {selectedLoad ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-300">Load</p>
              <p className="font-semibold text-white">{selectedLoad.id}</p>
            </div>
            <label>
              <span className="field-label">Connected Bus</span>
              <select value={selectedLoad.busId} onChange={(e) => updateLoad(selectedLoad.id, { busId: e.target.value })} className="field-input">
                {busOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <NumberField label="Real Power P (MW)" value={selectedLoad.p} onChange={(value) => updateLoad(selectedLoad.id, { p: value })} step="0.01" />
            <NumberField label="Reactive Power Q (Mvar)" value={selectedLoad.q} onChange={(value) => updateLoad(selectedLoad.id, { q: value })} step="0.01" />
          </div>
        ) : null}

        {selectedEdge ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-300">Transmission Line</p>
              <p className="font-semibold text-white">{selectedEdge.id}</p>
            </div>
            <label>
              <span className="field-label">From Bus</span>
              <select value={selectedEdge.source} onChange={(e) => updateEdge(selectedEdge.id, { source: e.target.value })} className="field-input">
                {busOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">To Bus</span>
              <select value={selectedEdge.target} onChange={(e) => updateEdge(selectedEdge.id, { target: e.target.value })} className="field-input">
                {busOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <LineFields selectedEdge={selectedEdge} updateEdge={updateEdge} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
