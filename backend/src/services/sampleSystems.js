export const sampleSystems = {
  threeBus: {
    method: 'NR',
    tolerance: 0.001,
    maxIterations: 20,
    buses: [
      { id: '1', type: 'Slack Bus', vm: 1.025, va: 0 },
      { id: '2', type: 'PQ Bus', vm: 1.0, va: 0 },
      { id: '3', type: 'PV Bus', vm: 1.03, va: 0 }
    ],
    generators: [
      { id: 'g1', busId: '1', p: 0, q: 0, voltageSetpoint: 1.025 },
      { id: 'g3', busId: '3', p: 300, voltageSetpoint: 1.03 }
    ],
    loads: [
      { id: 'l2', busId: '2', p: 400, q: 200 }
    ],
    lines: [
      { id: '12', from: '1', to: '2', r: 0, x: 0.025, b: 0 },
      { id: '13', from: '1', to: '3', r: 0, x: 0.05, b: 0 },
      { id: '23', from: '2', to: '3', r: 0, x: 0.025, b: 0 }
    ]
  },
  fiveBus: {
    method: 'GS',
    tolerance: 0.001,
    maxIterations: 25,
    buses: [
      { id: '1', type: 'Slack Bus', vm: 1.04, va: 0 },
      { id: '2', type: 'PV Bus', vm: 1.01, va: 0 },
      { id: '3', type: 'PQ Bus', vm: 1.0, va: 0 },
      { id: '4', type: 'PQ Bus', vm: 1.0, va: 0 },
      { id: '5', type: 'PQ Bus', vm: 1.0, va: 0 }
    ],
    generators: [
      { id: 'g1', busId: '1', p: 0, q: 0, voltageSetpoint: 1.04 },
      { id: 'g2', busId: '2', p: 0.5, qMin: -0.4, qMax: 0.4, voltageSetpoint: 1.01 }
    ],
    loads: [
      { id: 'l1', busId: '3', p: 0.9, q: 0.3 },
      { id: 'l2', busId: '4', p: 0.4, q: 0.15 },
      { id: 'l3', busId: '5', p: 0.6, q: 0.2 }
    ],
    lines: [
      { id: '12', from: '1', to: '2', r: 0.02, x: 0.08, b: 0.04 },
      { id: '13', from: '1', to: '3', r: 0.01, x: 0.04, b: 0.02 },
      { id: '23', from: '2', to: '3', r: 0.0125, x: 0.05, b: 0.025 },
      { id: '24', from: '2', to: '4', r: 0.015, x: 0.06, b: 0.03 },
      { id: '35', from: '3', to: '5', r: 0.02, x: 0.08, b: 0.04 },
      { id: '45', from: '4', to: '5', r: 0.025, x: 0.1, b: 0.05 }
    ]
  }
};
