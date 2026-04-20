import { Handle, Position } from 'reactflow';
import { useSimulationStore } from '../store/useSimulationStore.js';

export default function BusNode({ id, data }) {
  const selectedElement = useSimulationStore((state) => state.selectedElement);
  const setSelectedElement = useSimulationStore((state) => state.setSelectedElement);
  const generators = useSimulationStore((state) => state.generators.filter((item) => item.busId === id));
  const loads = useSimulationStore((state) => state.loads.filter((item) => item.busId === id));
  const busResults = useSimulationStore((state) => state.results?.busResults || []);
  const result = busResults.find((item) => String(item.busId) === String(id));
  const isSelected = selectedElement?.type === 'bus' && selectedElement.id === id;
  const voltageOk = !result || (result.voltageMagnitude >= 0.95 && result.voltageMagnitude <= 1.05);

  const onDrop = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-power-tool');
    const store = useSimulationStore.getState();
    if (type === 'generator') {
      store.addGenerator(id);
    } else if (type === 'load') {
      store.addLoad(id);
    }
  };

  return (
    <div
      onClick={() => setSelectedElement({ type: 'bus', id })}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      style={{ backgroundColor: data.resultColor || undefined }}
      className={`rounded-2xl border-2 px-3 py-2 text-xs shadow-lg transition sm:px-4 sm:py-3 sm:text-sm ${isSelected ? 'border-cyan-400 bg-cyan-500/10' : voltageOk ? 'border-emerald-500/40 bg-slate-900' : 'border-rose-400 bg-rose-950/30'}`}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-white !bg-cyan-400" />
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-white">{data.label}</p>
            <p className="text-xs text-slate-400">{data.type}</p>
          </div>
          <span className="chip">{id}</span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-xs text-slate-300 sm:grid-cols-2 sm:gap-2">
          <div>V: {data.vm?.toFixed?.(3) ?? data.vm ?? 1.0} p.u.</div>
          <div>δ: {data.va?.toFixed?.(3) ?? data.va ?? 0}°</div>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {generators.map((generator) => (
            <button key={generator.id} onClick={(event) => { event.stopPropagation(); setSelectedElement({ type: 'generator', id: generator.id }); }} className="chip border-cyan-500/50 text-cyan-200">
              Gen
            </button>
          ))}
          {loads.map((load) => (
            <button key={load.id} onClick={(event) => { event.stopPropagation(); setSelectedElement({ type: 'load', id: load.id }); }} className="chip border-amber-500/50 text-amber-200">
              Load
            </button>
          ))}
          <button onClick={(event) => { event.stopPropagation(); useSimulationStore.getState().addGenerator(id); }} className="chip border-slate-600 text-slate-200">+ Gen</button>
          <button onClick={(event) => { event.stopPropagation(); useSimulationStore.getState().addLoad(id); }} className="chip border-slate-600 text-slate-200">+ Load</button>
        </div>
        {result ? (
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-2 text-xs text-slate-300">
            <div>Vm: {result.voltageMagnitude.toFixed(4)} p.u.</div>
            <div>Angle: {result.voltageAngle.toFixed(3)}°</div>
          </div>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-white !bg-cyan-400" />
    </div>
  );
}
