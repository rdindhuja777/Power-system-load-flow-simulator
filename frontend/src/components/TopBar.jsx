export default function TopBar({
  method,
  onMethodChange,
  onRun,
  loading,
  baseMVA,
  onBaseMVAChange,
  accelerationFactor,
  onAccelerationFactorChange,
  tolerance,
  onToleranceChange,
  maxIterations,
  onMaxIterationsChange,
  onToggleDarkMode,
  onSave,
  onLoad,
  onLoadSample,
  onExportPDF,
  onUndo,
  onRedo,
  onClear
}) {
  return (
    <div className="panel mb-4">
      <div className="flex flex-col gap-4 border-b border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Power System Load Flow Simulator</h1>
          <p className="text-sm text-slate-400">Interactive load flow analysis for engineering demonstrations.</p>
          <p className="text-xs text-slate-500 mt-2">Project by Indhuja R D (Register No: 312824105009)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={onUndo}>Undo</button>
          <button className="btn-secondary" onClick={onRedo}>Redo</button>
          <button className="btn-secondary" onClick={onToggleDarkMode}>Toggle Dark Mode</button>
          <button className="btn-secondary" onClick={onSave}>Save</button>
          <button className="btn-secondary" onClick={onLoad}>Load</button>
          <select className="field-input w-40" onChange={(e) => { if (e.target.value) { onLoadSample(e.target.value); e.target.value = ''; } }}>
            <option value="">Load Sample...</option>
            <option value="threeBus">3-Bus Textbook</option>
            <option value="fiveBus">5-Bus Example</option>
          </select>
          <button className="btn-secondary" onClick={onExportPDF}>PDF</button>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="field-label">Method</label>
            <select value={method} onChange={(e) => onMethodChange(e.target.value)} className="field-input w-52">
              <option value="GS">Gauss-Seidel</option>
            </select>
          </div>
          <div>
            <label className="field-label">Base MVA</label>
            <input type="number" min="1" step="1" value={baseMVA} onChange={(e) => onBaseMVAChange(Number(e.target.value))} className="field-input w-32" />
          </div>
          <div>
            <label className="field-label">Acceleration Factor</label>
            <input type="number" min="0.1" max="2.0" step="0.1" value={accelerationFactor} onChange={(e) => onAccelerationFactorChange(Number(e.target.value))} className="field-input w-40" />
          </div>
          <div>
            <label className="field-label">Tolerance</label>
            <input type="number" step="0.0001" value={tolerance} onChange={(e) => onToleranceChange(Number(e.target.value))} className="field-input w-32" />
          </div>
          <div>
            <label className="field-label">Max Iterations</label>
            <input type="number" min="1" max="200" value={maxIterations} onChange={(e) => onMaxIterationsChange(Number(e.target.value))} className="field-input w-40" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={onClear}>Clear All</button>
          <button className="btn-primary" onClick={onRun} disabled={loading}>{loading ? 'Running…' : 'Run Load Flow'}</button>
        </div>
      </div>
    </div>
  );
}
