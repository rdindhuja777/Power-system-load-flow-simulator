import { useSimulationStore } from '../store/useSimulationStore.js';
import { sampleSystems } from '../utils/sampleSystems.js';

const descriptions = {
  GS: {
    title: 'Gauss-Seidel',
    text: 'Simple iterative method that is easy to demonstrate and useful for step-by-step understanding.'
  }
};

export default function LandingPage() {
  const method = useSimulationStore((state) => state.method);
  const setMethod = useSimulationStore((state) => state.setMethod);
  const loadSystem = useSimulationStore((state) => state.loadSystem);

  const startSimulation = () => {
    const demo = sampleSystems.fiveBus;
    loadSystem(demo);
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_40%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-6 py-10">
      <div className="w-full max-w-5xl panel overflow-hidden">
        <div className="grid gap-8 p-8 lg:grid-cols-2 lg:p-12">
          <div className="space-y-6">
            <span className="chip border-cyan-500/40 text-cyan-300">Power System Analysis</span>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Power System Load Flow Simulator</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                Build, validate, and solve electrical networks with interactive visualization, numerical iteration tracking, and engineering-friendly results.
              </p>
            </div>
            <div className="space-y-3">
              {Object.entries(descriptions).map(([key, item]) => (
                <button key={key} onClick={() => setMethod(key)} className={`w-full rounded-2xl border p-4 text-left transition ${method === key ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-950 hover:border-cyan-500'}`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                    <span className="chip">{method === key ? 'Selected' : 'Choose'}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
                </button>
              ))}
            </div>
            <button className="btn-primary text-base" onClick={startSimulation}>Start Simulation</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Features</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>• React Flow drag-and-drop network canvas</li>
                <li>• Automatic Y-bus formation and validation</li>
                <li>• Gauss-Seidel solver</li>
                <li>• Export, save/load, and dark mode support</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Demonstration Ready</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Suitable for engineering labs, classroom demonstrations, and load flow method comparison exercises.
              </p>
              <div className="mt-6 border-t border-slate-700 pt-4">
                <p className="text-sm font-semibold text-cyan-300">Indhuja R D</p>
                <p className="text-sm text-slate-400">Register No: 312824105009</p>
                <p className="mt-3 text-sm font-semibold text-cyan-300">C Subathra</p>
                <p className="text-sm text-slate-400">Register No: 312824105027</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
