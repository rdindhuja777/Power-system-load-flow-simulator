import * as math from 'mathjs';

const BUS_TYPES = {
  SLACK: 'slack',
  PV: 'pv',
  PQ: 'pq'
};

const EPSILON = 1e-9;

function normalizeBusType(type) {
  const value = String(type || '').toLowerCase();
  if (value.includes('slack')) return BUS_TYPES.SLACK;
  if (value.includes('pv')) return BUS_TYPES.PV;
  return BUS_TYPES.PQ;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function busDisplayName(bus, index) {
  return bus.id != null ? String(bus.id) : String(index + 1);
}

function buildBusMap(buses) {
  const map = new Map();
  buses.forEach((bus, index) => map.set(String(bus.id), { ...bus, index, type: normalizeBusType(bus.type) }));
  return map;
}

function aggregateSources(buses, generators = [], loads = [], baseMVA = 100) {
  const busMap = buildBusMap(buses);
  const info = buses.map((bus, index) => ({
    id: String(bus.id),
    index,
    type: normalizeBusType(bus.type),
    vm: toNumber(bus.vm, 1),
    va: toNumber(bus.va, 0),
    voltageSetpoint: toNumber(bus.voltageSetpoint ?? bus.vm, 1),
    pSpec: 0,
    qSpec: 0,
    qMin: bus.qMin != null ? toNumber(bus.qMin) / baseMVA : null,
    qMax: bus.qMax != null ? toNumber(bus.qMax) / baseMVA : null
  }));

  for (const gen of generators) {
    const bus = busMap.get(String(gen.busId));
    if (!bus) continue;
    const target = info[bus.index];
    target.pSpec += toNumber(gen.p, 0) / baseMVA;
    if (gen.q != null) target.qSpec += toNumber(gen.q, 0) / baseMVA;
    if (gen.qMin != null) target.qMin = toNumber(gen.qMin) / baseMVA;
    if (gen.qMax != null) target.qMax = toNumber(gen.qMax) / baseMVA;
    if (gen.voltageSetpoint != null) target.voltageSetpoint = toNumber(gen.voltageSetpoint, target.voltageSetpoint);
  }

  for (const load of loads) {
    const bus = busMap.get(String(load.busId));
    if (!bus) continue;
    const target = info[bus.index];
    target.pSpec -= toNumber(load.p, 0) / baseMVA;
    target.qSpec -= toNumber(load.q, 0) / baseMVA;
  }

  return info;
}

export function validateSystem({ buses = [], lines = [] }) {
  const errors = [];
  if (!Array.isArray(buses) || buses.length === 0) {
    errors.push('At least one bus is required.');
    return { valid: false, errors };
  }

  const normalized = buses.map((bus) => ({ ...bus, type: normalizeBusType(bus.type) }));
  const slackCount = normalized.filter((bus) => bus.type === BUS_TYPES.SLACK).length;
  const pqCount = normalized.filter((bus) => bus.type === BUS_TYPES.PQ).length;

  if (slackCount !== 1) {
    errors.push('Exactly one slack bus is required.');
  }
  if (pqCount < 1) {
    errors.push('At least one PQ bus is required.');
  }

  const busIds = new Set(normalized.map((bus) => String(bus.id)));
  for (const line of lines) {
    if (!busIds.has(String(line.from)) || !busIds.has(String(line.to))) {
      errors.push(`Line ${line.id || `${line.from}-${line.to}`} references an unknown bus.`);
    }
  }

  if (normalized.length > 1) {
    const adj = new Map(normalized.map((bus) => [String(bus.id), new Set()]));
    for (const line of lines) {
      const from = String(line.from);
      const to = String(line.to);
      if (adj.has(from) && adj.has(to)) {
        adj.get(from).add(to);
        adj.get(to).add(from);
      }
    }
    const start = String(normalized[0].id);
    const queue = [start];
    const visited = new Set([start]);
    while (queue.length) {
      const current = queue.shift();
      for (const next of adj.get(current) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    if (visited.size !== normalized.length) {
      errors.push('The network is not connected.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function buildYBus(buses, lines) {
  const n = buses.length;
  const ybus = Array.from({ length: n }, () => Array.from({ length: n }, () => math.complex(0, 0)));
  const indexById = new Map(buses.map((bus, index) => [String(bus.id), index]));

  for (const line of lines) {
    const i = indexById.get(String(line.from));
    const j = indexById.get(String(line.to));
    if (i == null || j == null) continue;

    const { y, shunt } = resolveLineSeriesAdmittance(line);

    ybus[i][i] = math.add(ybus[i][i], y, shunt);
    ybus[j][j] = math.add(ybus[j][j], y, shunt);
    ybus[i][j] = math.subtract(ybus[i][j], y);
    ybus[j][i] = math.subtract(ybus[j][i], y);
  }

  return ybus;
}

function toRectMatrix(matrix) {
  return matrix.map((row) => row.map((value) => ({ re: math.re(value), im: math.im(value) })));
}

function initialVoltages(busInfo) {
  return busInfo.map((bus) => {
    const magnitude = bus.vm || bus.voltageSetpoint || 1;
    const angleRadians = (toNumber(bus.va, 0) * Math.PI) / 180;
    return math.complex(magnitude * Math.cos(angleRadians), magnitude * Math.sin(angleRadians));
  });
}

function angleDegrees(complexValue) {
  return (math.arg(complexValue) * 180) / Math.PI;
}

function magnitude(complexValue) {
  return math.abs(complexValue);
}

function resolveLineSeriesAdmittance(line) {
  const mode = String(line?.mode || 'impedance').toLowerCase();

  if (mode === 'admittance') {
    const g = toNumber(line.g, 0);
    const b = toNumber(line.b, 0);
    return {
      y: math.complex(g, b),
      shunt: math.complex(0, toNumber(line.bc, 0) / 2)
    };
  }

  const r = Math.abs(toNumber(line.r, 0));
  const x = Math.abs(toNumber(line.x, 0.0001)) || 0.0001;
  return {
    y: math.divide(math.complex(1, 0), math.complex(r, x)),
    shunt: math.complex(0, toNumber(line.b, 0) / 2)
  };
}

function calcBusPower(ybus, voltages, index) {
  let current = math.complex(0, 0);
  for (let j = 0; j < voltages.length; j += 1) {
    current = math.add(current, math.multiply(ybus[index][j], voltages[j]));
  }
  const power = math.multiply(voltages[index], math.conj(current));
  return { p: math.re(power), q: math.im(power) };
}

function calcAllBusPowers(ybus, voltages) {
  return voltages.map((_voltage, index) => calcBusPower(ybus, voltages, index));
}

function busResultRows(busInfo, voltages, powers) {
  return busInfo.map((bus, index) => ({
    busNo: index + 1,
    busId: bus.id,
    type: bus.type,
    voltageMagnitude: Number(magnitude(voltages[index]).toFixed(6)),
    voltageAngle: Number(angleDegrees(voltages[index]).toFixed(6)),
    pInjected: Number(powers[index].p.toFixed(6)),
    qInjected: Number(powers[index].q.toFixed(6))
  }));
}

function lineFlowRows(lines, buses, voltages) {
  const indexById = new Map(buses.map((bus, index) => [String(bus.id), index]));
  return lines.map((line) => {
    const i = indexById.get(String(line.from));
    const j = indexById.get(String(line.to));
    if (i == null || j == null) {
      return null;
    }

    const { y, shunt } = resolveLineSeriesAdmittance(line);

    const vi = voltages[i];
    const vj = voltages[j];
    const iij = math.add(math.multiply(math.subtract(vi, vj), y), math.multiply(vi, shunt));
    const iji = math.add(math.multiply(math.subtract(vj, vi), y), math.multiply(vj, shunt));
    const sij = math.multiply(vi, math.conj(iij));
    const sji = math.multiply(vj, math.conj(iji));
    const loss = math.add(sij, sji);
    const fromNo = i + 1;
    const toNo = j + 1;

    return {
      lineNo: `${fromNo}${toNo}`,
      lineId: line.id || `${line.from}-${line.to}`,
      from: String(line.from),
      to: String(line.to),
      fromNo,
      toNo,
      pFrom: Number(math.re(sij).toFixed(6)),
      qFrom: Number(math.im(sij).toFixed(6)),
      pTo: Number(math.re(sji).toFixed(6)),
      qTo: Number(math.im(sji).toFixed(6)),
      pLoss: Number(math.re(loss).toFixed(6)),
      qLoss: Number(math.im(loss).toFixed(6))
    };
  }).filter(Boolean);
}

function gaussSeidel(busInfo, ybus, maxIterations, tolerance, accelerationFactor = 1, debug = false) {
  const workingBusInfo = busInfo.map((bus) => ({ ...bus }));
  const voltages = initialVoltages(workingBusInfo);
  const iterations = [];
  const slackIndex = workingBusInfo.findIndex((bus) => bus.type === BUS_TYPES.SLACK);

  if (debug) {
    console.log(`\nGauss-Seidel Debug: maxIterations=${maxIterations}, α=${accelerationFactor}, tolerance=${tolerance}`);
    console.log('\nY-bus matrix:');
    ybus.forEach((row, i) => {
      const rowStr = row.map(y => {
        const re = math.re(y).toFixed(6);
        const im = math.im(y).toFixed(6);
        return `(${re}${im >= 0 ? '+' : ''}${im}j)`;
      }).join(' ');
      console.log(`  Row ${i}: ${rowStr}`);
    });
    console.log('\nBus specifications:');
    busInfo.forEach((bus, i) => {
      console.log(`  Bus ${i} (${bus.id}): type=${bus.type}, P_spec=${bus.pSpec.toFixed(6)}, Q_spec=${bus.qSpec.toFixed(6)}`);
    });
    console.log('\nInitial voltages:');
    voltages.forEach((v, i) => {
      console.log(`  Bus ${workingBusInfo[i].id}: ${magnitude(v).toFixed(6)}∠${angleDegrees(v).toFixed(6)}°`);
    });
  }

  const accelerate = (current, target) => {
    if (!Number.isFinite(accelerationFactor) || accelerationFactor === 1) {
      return target;
    }
    return math.add(current, math.multiply(accelerationFactor, math.subtract(target, current)));
  };

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    if (debug) console.log(`\n--- Iteration ${iteration} ---`);
    let maxDelta = 0;
    const updatedVoltages = [...voltages];

    for (let i = 0; i < workingBusInfo.length; i += 1) {
      const bus = workingBusInfo[i];
      if (i === slackIndex) continue;

      const yii = ybus[i][i];
      if (math.abs(yii) < EPSILON) continue;

      const currentVoltage = updatedVoltages[i];
      const currentType = bus.type;
      let qUsed = bus.qSpec;
      let nextType = currentType;

      if (currentType === BUS_TYPES.PV) {
        // For PV bus: Calculate Q using the CURRENT voltage, check limits
        const currentPower = calcBusPower(ybus, updatedVoltages, i);
        qUsed = currentPower.q;
        if (bus.qMin != null && qUsed < toNumber(bus.qMin)) {
          qUsed = toNumber(bus.qMin);
          nextType = BUS_TYPES.PQ;
        }
        if (bus.qMax != null && qUsed > toNumber(bus.qMax)) {
          qUsed = toNumber(bus.qMax);
          nextType = BUS_TYPES.PQ;
        }
      }

      const aValue = math.complex(bus.pSpec, -qUsed);
      let correctionSum = math.complex(0, 0);

      for (let k = 0; k < workingBusInfo.length; k += 1) {
        if (k === i) continue;
        correctionSum = math.add(correctionSum, math.multiply(ybus[i][k], updatedVoltages[k]));
      }

      const numerator = math.subtract(math.divide(aValue, math.conj(currentVoltage)), correctionSum);
      const rawNext = math.divide(numerator, yii);
      let targetVoltage = rawNext;

      if (currentType === BUS_TYPES.PV && nextType === BUS_TYPES.PV) {
        const vm = toNumber(bus.voltageSetpoint, magnitude(currentVoltage));
        const angle = math.arg(rawNext);
        targetVoltage = math.complex(vm * Math.cos(angle), vm * Math.sin(angle));
      } else if (currentType === BUS_TYPES.PV && nextType === BUS_TYPES.PQ) {
        bus.type = BUS_TYPES.PQ;
        bus.qSpec = qUsed;
      }

      const accelerated = accelerate(currentVoltage, targetVoltage);
      const updated = currentType === BUS_TYPES.PV && nextType === BUS_TYPES.PV
        ? math.complex(
          toNumber(bus.voltageSetpoint, magnitude(accelerated)) * Math.cos(math.arg(accelerated)),
          toNumber(bus.voltageSetpoint, magnitude(accelerated)) * Math.sin(math.arg(accelerated))
        )
        : accelerated;

      const delta = math.abs(math.subtract(updated, currentVoltage));
      maxDelta = Math.max(maxDelta, delta);
      updatedVoltages[i] = updated;

      if (debug) {
        const power = calcBusPower(ybus, updatedVoltages, i);
        console.log(`  Bus ${workingBusInfo[i].id} (${workingBusInfo[i].type}): old=${magnitude(currentVoltage).toFixed(6)}∠${angleDegrees(currentVoltage).toFixed(6)}° -> new=${magnitude(updated).toFixed(6)}∠${angleDegrees(updated).toFixed(6)}° (Δ=${delta.toFixed(6)})`);
        console.log(`    P_calc=${power.p.toFixed(6)}, P_spec=${bus.pSpec.toFixed(6)}, Q_calc=${power.q.toFixed(6)}, Q_used_in_update=${qUsed.toFixed(6)}`);
      }
    }

    for (let i = 0; i < workingBusInfo.length; i += 1) {
      voltages[i] = updatedVoltages[i];
    }

    const powers = calcAllBusPowers(ybus, voltages);
    iterations.push({
      iteration,
      maxDelta: Number(maxDelta.toFixed(8)),
      voltages: busResultRows(workingBusInfo, voltages, powers)
    });

    if (maxDelta < tolerance) break;
  }

  const powers = calcAllBusPowers(ybus, voltages);
  return { iterations, voltages, powers };
}

function buildJacobian(busInfo, ybus, voltages, powers) {
  const pvAndPq = busInfo
    .map((bus, index) => ({ bus, index }))
    .filter(({ bus }) => bus.type !== BUS_TYPES.SLACK);
  const pq = busInfo
    .map((bus, index) => ({ bus, index }))
    .filter(({ bus }) => bus.type === BUS_TYPES.PQ);

  const angleCount = pvAndPq.length;
  const voltageCount = pq.length;
  const size = angleCount + voltageCount;
  const J = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));

  const vm = voltages.map((v) => magnitude(v));
  const delta = voltages.map((v) => math.arg(v));
  const yMag = ybus.map((row) => row.map((value) => magnitude(value)));
  const yTheta = ybus.map((row) => row.map((value) => math.arg(value)));

  const angleIndexByBus = new Map(pvAndPq.map(({ index }, pos) => [index, pos]));
  const voltageIndexByBus = new Map(pq.map(({ index }, pos) => [index, pos]));

  for (const { index: i } of pvAndPq) {
    const rowP = angleIndexByBus.get(i);

    for (const { index: k } of pvAndPq) {
      const colTheta = angleIndexByBus.get(k);
      if (i === k) {
        let sum = 0;
        for (let n = 0; n < busInfo.length; n += 1) {
          if (n === i) continue;
          const phi = yTheta[i][n] + delta[n] - delta[i];
          sum += vm[i] * vm[n] * yMag[i][n] * Math.sin(phi);
        }
        J[rowP][colTheta] = sum;
      } else {
        const phi = yTheta[i][k] + delta[k] - delta[i];
        J[rowP][colTheta] = -vm[i] * vm[k] * yMag[i][k] * Math.sin(phi);
      }
    }

    for (const { index: k } of pq) {
      const colV = angleCount + voltageIndexByBus.get(k);
      if (i === k) {
        let sum = 2 * vm[i] * yMag[i][i] * Math.cos(yTheta[i][i]);
        for (let n = 0; n < busInfo.length; n += 1) {
          if (n === i) continue;
          const phi = yTheta[i][n] + delta[n] - delta[i];
          sum += vm[n] * yMag[i][n] * Math.cos(phi);
        }
        J[rowP][colV] = sum;
      } else {
        const phi = yTheta[i][k] + delta[k] - delta[i];
        J[rowP][colV] = vm[i] * yMag[i][k] * Math.cos(phi);
      }
    }
  }

  for (const { index: i } of pq) {
    const rowQ = angleCount + voltageIndexByBus.get(i);

    for (const { index: k } of pvAndPq) {
      const colTheta = angleIndexByBus.get(k);
      if (i === k) {
        let sum = 0;
        for (let n = 0; n < busInfo.length; n += 1) {
          if (n === i) continue;
          const phi = yTheta[i][n] + delta[n] - delta[i];
          sum += vm[i] * vm[n] * yMag[i][n] * Math.cos(phi);
        }
        J[rowQ][colTheta] = sum;
      } else {
        const phi = yTheta[i][k] + delta[k] - delta[i];
        J[rowQ][colTheta] = -vm[i] * vm[k] * yMag[i][k] * Math.cos(phi);
      }
    }

    for (const { index: k } of pq) {
      const colV = angleCount + voltageIndexByBus.get(k);
      if (i === k) {
        let sum = -2 * vm[i] * yMag[i][i] * Math.sin(yTheta[i][i]);
        for (let n = 0; n < busInfo.length; n += 1) {
          if (n === i) continue;
          const phi = yTheta[i][n] + delta[n] - delta[i];
          sum -= vm[n] * yMag[i][n] * Math.sin(phi);
        }
        J[rowQ][colV] = sum;
      } else {
        const phi = yTheta[i][k] + delta[k] - delta[i];
        J[rowQ][colV] = -vm[i] * yMag[i][k] * Math.sin(phi);
      }
    }
  }

  return { J, pvAndPq, pq };
}


function newtonRaphson(busInfo, ybus, maxIterations, tolerance, debug = false) {
  const voltages = initialVoltages(busInfo);
  const iterations = [];

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const powers = calcAllBusPowers(ybus, voltages);
    const mismatch = [];
    const pvAndPq = [];
    const pq = [];

    busInfo.forEach((bus, index) => {
      if (bus.type !== BUS_TYPES.SLACK) {
        pvAndPq.push({ bus, index });
        mismatch.push(bus.pSpec - powers[index].p);
      }
      if (bus.type === BUS_TYPES.PQ) {
        pq.push({ bus, index });
        mismatch.push(bus.qSpec - powers[index].q);
      }
    });

    const maxMismatch = Math.max(0, ...mismatch.map((value) => Math.abs(value)));
    const { J } = buildJacobian(busInfo, ybus, voltages, powers);
    const deltaValue = math.lusolve(J, mismatch.map((value) => [value]));
    const delta = (Array.isArray(deltaValue) ? deltaValue : deltaValue.valueOf()).map((row) => Number(row[0]));
    const angleCount = pvAndPq.length;

    // Debug output for each iteration
    if (debug) {
      console.log(`\nIteration ${iteration}`);
      console.log('Mismatch vector (ΔP, ΔQ):', JSON.stringify(mismatch, null, 2));
      console.log('Jacobian matrix:');
      J.forEach(row => console.log(row.map(x => Number(x).toFixed(6)).join('\t')));
      console.log('Corrections (delta):', JSON.stringify(delta, null, 2));
      console.log('Bus voltages and angles before update:');
      busInfo.forEach((bus, idx) => {
        const vm = magnitude(voltages[idx]);
        const ang = angleDegrees(voltages[idx]);
        console.log(`  Bus ${bus.id}: |V| = ${vm.toFixed(6)}, δ = ${ang.toFixed(6)}°`);
      });
    }

    pvAndPq.forEach(({ index }, position) => {
      const angle = math.arg(voltages[index]) + delta[position];
      const vm = magnitude(voltages[index]);
      voltages[index] = math.complex(vm * Math.cos(angle), vm * Math.sin(angle));
    });

    pq.forEach(({ index }, position) => {
      const vm = Math.max(magnitude(voltages[index]) + delta[angleCount + position], EPSILON);
      const angle = math.arg(voltages[index]);
      voltages[index] = math.complex(vm * Math.cos(angle), vm * Math.sin(angle));
    });

    iterations.push({
      iteration,
      maxMismatch: Number(maxMismatch.toFixed(8)),
      mismatch: mismatch.map((value) => Number(value.toFixed(8))),
      corrections: delta.map((value) => Number(Number(value).toFixed(8))),
      voltages: busInfo.map((bus, index) => ({
        busId: bus.id,
        voltageMagnitude: Number(magnitude(voltages[index]).toFixed(6)),
        voltageAngle: Number(angleDegrees(voltages[index]).toFixed(6))
      }))
    });

    if (maxMismatch < tolerance) break;
  }

  const powers = calcAllBusPowers(ybus, voltages);
  return { iterations, voltages, powers };
}


export function runLoadFlow({ buses = [], lines = [], generators = [], loads = [], method = 'NR', maxIterations = 25, tolerance = 0.001, accelerationFactor = 1, baseMVA = 100, debug = false }) {
  const normalizedBaseMVA = Math.max(toNumber(baseMVA, 100), EPSILON);
  const busInfo = aggregateSources(buses, generators, loads, normalizedBaseMVA);
  const ybus = buildYBus(buses, lines);
  const solver = method === 'GS' ? gaussSeidel : newtonRaphson;
  const { iterations, voltages, powers } = method === 'GS'
    ? solver(busInfo, ybus, maxIterations, tolerance, accelerationFactor, debug)
    : solver(busInfo, ybus, maxIterations, tolerance, debug);
  const lastIteration = iterations[iterations.length - 1] || {};
  const converged = method === 'GS' ? (lastIteration.maxDelta ?? Infinity) < tolerance : (lastIteration.maxMismatch ?? Infinity) < tolerance;

  const results = {
    busResults: busResultRows(busInfo, voltages, powers),
    lineResults: lineFlowRows(lines, buses, voltages),
    converged,
    finalVoltages: busInfo.map((bus, index) => ({
      busId: bus.id,
      voltageMagnitude: Number(magnitude(voltages[index]).toFixed(6)),
      voltageAngle: Number(angleDegrees(voltages[index]).toFixed(6))
    }))
  };

  return {
    results,
    iterations,
    ybus: toRectMatrix(ybus),
    baseMVA: normalizedBaseMVA
  };
}
