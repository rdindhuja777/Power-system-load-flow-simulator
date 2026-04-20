const items = [
  { type: 'bus', label: 'Bus', description: 'Create a new bus node' },
  { type: 'generator', label: 'Generator', description: 'Attach to a bus' },
  { type: 'load', label: 'Load', description: 'Attach to a bus' },
  { type: 'line', label: 'Transmission Line', description: 'Connect buses on the canvas' }
];

export default function Toolbox({ onDragStart, selectedTool, onSelectTool }) {
  return (
    <div className="panel h-auto xl:h-full">
      <div className="panel-header">Toolbox</div>
      <div className="space-y-3 p-3 sm:p-4">
        <p className="text-xs leading-5 text-slate-400">
          Drag buses, generators, and loads onto the canvas. Connect bus handles to create transmission lines.
        </p>
        {items.map((item) => (
          <button
            key={item.type}
            draggable
            onDragStart={(event) => onDragStart(event, item.type)}
            onClick={() => onSelectTool(item.type)}
            className={`w-full rounded-2xl border p-3 text-left transition ${selectedTool === item.type ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-950 hover:border-cyan-500'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{item.label}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Drag</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
