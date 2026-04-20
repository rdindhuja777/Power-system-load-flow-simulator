import IterationChart from './IterationChart.jsx';

function fmt(value, digits = 4) {
  return Number(value ?? 0).toFixed(digits);
}

function rectVoltage(vm, angleDeg) {
  const vmValue = Number(vm ?? 0);
  const angleRad = (Number(angleDeg ?? 0) * Math.PI) / 180;
  const re = vmValue * Math.cos(angleRad);
  const im = vmValue * Math.sin(angleRad);
  return `${fmt(re)} ${im >= 0 ? '+' : '-'} j${fmt(Math.abs(im))}`;
}

function signedComplex(puP, puQ, baseMVA) {
  const p = Number(puP ?? 0);
  const q = Number(puQ ?? 0);
  return {
    pu: `${fmt(p)} ${q >= 0 ? '+' : '-'} j${fmt(Math.abs(q))}`,
    mw: `${fmt(p * baseMVA)} ${q >= 0 ? '+' : '-'} j${fmt(Math.abs(q * baseMVA))}`
  };
}

function mwLabel(complexText) {
  const [real, imag] = complexText.split(/\s[+-]\sj/);
  const sign = complexText.includes(' + j') ? '+' : '-';
  return `${real} MW ${sign} j${imag} Mvar`;
}

function subscript(text) {
  return <sub>{text}</sub>;
}

function flowLabel(prefix, from, to) {
  return <>{prefix}{subscript(`${from}${to}`)}</>;
}

function flowExpression(from, to, valueText) {
  return <>{'V'}{subscript(from)}I*{subscript(`${from}${to}`)} = {valueText}</>;
}

function lossExpression(from, to, valueText) {
  return <>{'S'}{subscript(`${from}${to}`)} + {'S'}{subscript(`${to}${from}`)} = {valueText}</>;
}

function lineFormulaName(row, baseMVA) {
  const from = String(row.fromNo ?? row.from ?? '').trim();
  const to = String(row.toNo ?? row.to ?? '').trim();
  const sft = signedComplex(row.pFrom, row.qFrom, baseMVA);
  const stf = signedComplex(row.pTo, row.qTo, baseMVA);
  const loss = signedComplex(row.pLoss, row.qLoss, baseMVA);

  return {
    forward: flowExpression(from, to, `(${sft.pu} pu) = ${mwLabel(sft.mw)}`),
    reverse: flowExpression(to, from, `(${stf.pu} pu) = ${mwLabel(stf.mw)}`),
    loss: lossExpression(from, to, `(${loss.pu} pu) = ${mwLabel(loss.mw)}`)
  };
}

function lineFlowRows(lineRows, baseMVA) {
  return lineRows.flatMap((row) => {
    const formulas = lineFormulaName(row, baseMVA);
    return [
      { flow: flowLabel('S', row.fromNo ?? row.from, row.toNo ?? row.to), value: formulas.forward },
      { flow: flowLabel('S', row.toNo ?? row.to, row.fromNo ?? row.from), value: formulas.reverse }
    ];
  });
}

function lineLossRows(lineRows, baseMVA) {
  return lineRows.map((row) => {
    const formulas = lineFormulaName(row, baseMVA);
    return {
      line: flowLabel('SL', row.fromNo ?? row.from, row.toNo ?? row.to),
      loss: formulas.loss
    };
  });
}

function ResultTable({ title, columns, rows }) {
  return (
    <div className="panel overflow-hidden">
      <div className="panel-header">{title}</div>
      <div className="overflow-auto">
        <table className="min-w-[640px] text-left text-sm sm:min-w-full">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-800">
                {Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-200">{value}</td>)}
              </tr>
            )) : (
              <tr><td className="px-4 py-4 text-slate-400" colSpan={columns.length}>No results yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ResultsPanel({ results, iterations, method }) {
  const busRows = results?.busResults || [];
  const lineRows = results?.lineResults || [];
  const baseMVA = Number(results?.baseMVA ?? 100);
  const busColor = (vm) => (vm >= 0.95 && vm <= 1.05 ? 'bg-emerald-500/80' : 'bg-rose-500/80');

  return (
    <div className="space-y-4">
      <IterationChart iterations={iterations} method={method} />
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>System Status</span>
          <span className={`chip ${results?.converged ? 'border-emerald-500/40 text-emerald-300' : 'border-amber-500/40 text-amber-300'}`}>
            {results?.converged ? 'Converged' : 'In progress / not converged'}
          </span>
        </div>
        <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-4">
          {busRows.map((bus) => (
            <div key={bus.busNo ?? bus.busId} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Bus {bus.busNo ?? bus.busId}</span>
                <span className={`h-3 w-3 rounded-full ${busColor(bus.voltageMagnitude)}`} />
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <div>V = {bus.voltageMagnitude.toFixed(4)} p.u.</div>
                <div>V = {rectVoltage(bus.voltageMagnitude, bus.voltageAngle)} p.u.</div>
                <div>δ = {bus.voltageAngle.toFixed(3)}°</div>
                <div>P = {bus.pInjected.toFixed(4)}</div>
                <div>Q = {bus.qInjected.toFixed(4)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ResultTable
        title="Bus Results Table"
        columns={['Bus No', 'Voltage Magnitude', 'Voltage Angle', 'Voltage (x+jy)', 'P injected', 'Q injected']}
        rows={busRows.map((row) => ({
          busNo: row.busNo ?? row.busId,
          voltageMagnitude: row.voltageMagnitude,
          voltageAngle: row.voltageAngle,
          voltageRect: rectVoltage(row.voltageMagnitude, row.voltageAngle),
          pInjected: row.pInjected,
          qInjected: row.qInjected
        }))}
      />
      <ResultTable
        title="Line Flow Results"
        columns={['Flow', 'Expression']}
        rows={lineFlowRows(lineRows, baseMVA).map((row) => ({ flow: row.flow, expression: row.value }))}
      />
      <ResultTable
        title="Line Losses"
        columns={['Line Loss', 'Expression']}
        rows={lineLossRows(lineRows, baseMVA).map((row) => ({ lineLoss: row.line, expression: row.loss }))}
      />
    </div>
  );
}
