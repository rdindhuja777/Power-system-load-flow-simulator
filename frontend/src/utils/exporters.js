import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

function mwLabel(puP, puQ, baseMVA = 100) {
  const p = Number(puP ?? 0) * baseMVA;
  const q = Number(puQ ?? 0) * baseMVA;
  return `${fmt(p)} MW ${q >= 0 ? '+' : '-'} j${fmt(Math.abs(q))} Mvar`;
}

function toSubscript(value) {
  const map = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉'
  };
  return String(value ?? '').split('').map((ch) => map[ch] || ch).join('');
}

function flowLabel(prefix, from, to) {
  return `${prefix}${toSubscript(`${from}${to}`)}`;
}

function drawWithSubscript(doc, x, y, prefix, subscript, options = {}) {
  const mainSize = options.mainSize || 10;
  const subSize = options.subSize || 7;
  const subShift = options.subShift || 1.8;
  doc.setFontSize(mainSize);
  doc.text(prefix, x, y);
  const prefixWidth = doc.getTextWidth(prefix);
  doc.setFontSize(subSize);
  doc.text(String(subscript), x + prefixWidth, y + subShift);
}

function drawFlowExpression(doc, x, y, from, to, rhs, baseMVA) {
  doc.setFontSize(9.5);
  doc.text(`V`, x, y);
  const vWidth = doc.getTextWidth('V');
  doc.setFontSize(7);
  doc.text(String(from), x + vWidth, y + 1.8);
  let cursor = x + vWidth + doc.getTextWidth(String(from));
  doc.setFontSize(9.5);
  doc.text('I*', cursor + 1.2, y);
  cursor += 1.2 + doc.getTextWidth('I*');
  doc.setFontSize(7);
  doc.text(String(`${from}${to}`), cursor, y + 1.8);
  cursor += doc.getTextWidth(String(`${from}${to}`));
  doc.setFontSize(9.5);
  doc.text(` = ${rhs}`, cursor + 1.2, y);
}

function drawLossExpression(doc, x, y, from, to, rhs) {
  doc.setFontSize(9.5);
  doc.text('S', x, y);
  const sWidth = doc.getTextWidth('S');
  doc.setFontSize(7);
  doc.text(String(`${from}${to}`), x + sWidth, y + 1.8);
  let cursor = x + sWidth + doc.getTextWidth(String(`${from}${to}`));
  doc.setFontSize(9.5);
  doc.text(' + S', cursor + 1.2, y);
  cursor += 1.2 + doc.getTextWidth(' + S');
  doc.setFontSize(7);
  doc.text(String(`${to}${from}`), cursor, y + 1.8);
  cursor += doc.getTextWidth(String(`${to}${from}`));
  doc.setFontSize(9.5);
  doc.text(` = ${rhs}`, cursor + 1.2, y);
}

function downloadBlob(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(filename, data) {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json');
}

export function exportCSV(filename, rows) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map((key) => JSON.stringify(row[key] ?? '')).join(','));
  }
  downloadBlob(filename, lines.join('\n'), 'text/csv');
}

export function exportPDF(filename, { title, busResults = [], lineResults = [], iterations = [], baseMVA = 100 }) {
  const systemBaseMVA = Number(baseMVA || 100);
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);

  autoTable(doc, {
    head: [['Bus No', 'Vm (p.u.)', 'Angle (deg)', 'V (x+jy) p.u.', 'P injected', 'Q injected']],
    body: busResults.map((row) => [
      row.busNo ?? row.busId,
      fmt(row.voltageMagnitude),
      fmt(row.voltageAngle, 3),
      rectVoltage(row.voltageMagnitude, row.voltageAngle),
      fmt(row.pInjected),
      fmt(row.qInjected)
    ]),
    startY: 32,
    theme: 'grid'
  });

  autoTable(doc, {
    head: [['Flow', 'Expression']],
    body: lineResults.flatMap((row) => ([
      ['', ''],
      ['', '']
    ])),
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const row = lineResults[Math.floor(data.row.index / 2)];
      const isForward = data.row.index % 2 === 0;
      const from = row.fromNo ?? row.from;
      const to = row.toNo ?? row.to;
      const rhs = isForward
        ? `(${fmt(row.pFrom)} ${row.qFrom >= 0 ? '+' : '-'} j${fmt(Math.abs(row.qFrom))} pu) = ${mwLabel(row.pFrom, row.qFrom, systemBaseMVA)}`
        : `(${fmt(row.pTo)} ${row.qTo >= 0 ? '+' : '-'} j${fmt(Math.abs(row.qTo))} pu) = ${mwLabel(row.pTo, row.qTo, systemBaseMVA)}`;

      if (data.column.index === 0) {
        const labelPrefix = 'S';
        const sub = isForward ? `${from}${to}` : `${to}${from}`;
        drawWithSubscript(doc, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1.5, labelPrefix, sub);
      }

      if (data.column.index === 1) {
        drawFlowExpression(doc, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1.5, isForward ? from : to, isForward ? to : from, rhs, systemBaseMVA);
      }
    },
    startY: doc.lastAutoTable.finalY + 8,
    theme: 'grid'
  });

  autoTable(doc, {
    head: [['Line Loss', 'Expression']],
    body: lineResults.map(() => ['', '']),
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const row = lineResults[data.row.index];
      const from = row.fromNo ?? row.from;
      const to = row.toNo ?? row.to;
      const rhs = `(${fmt(row.pLoss)} ${row.qLoss >= 0 ? '+' : '-'} j${fmt(Math.abs(row.qLoss))} pu) = ${mwLabel(row.pLoss, row.qLoss, systemBaseMVA)}`;

      if (data.column.index === 0) {
        drawWithSubscript(doc, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1.5, 'SL', `${from}${to}`);
      }

      if (data.column.index === 1) {
        drawLossExpression(doc, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1.5, from, to, rhs);
      }
    },
    startY: doc.lastAutoTable.finalY + 8,
    theme: 'grid'
  });

  if (iterations.length) {
    autoTable(doc, {
      head: [['Iteration', 'Max mismatch / delta']],
      body: iterations.map((row) => [row.iteration, row.maxMismatch ?? row.maxDelta]),
      startY: doc.lastAutoTable.finalY + 8,
      theme: 'grid'
    });
  }

  doc.save(filename);
}
