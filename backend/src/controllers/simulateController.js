import { z } from 'zod';
import { sampleSystems } from '../services/sampleSystems.js';
import { runLoadFlow, validateSystem } from '../services/loadFlow.js';

const busSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  type: z.string(),
  vm: z.number().optional(),
  va: z.number().optional(),
  voltageSetpoint: z.number().optional(),
  qMin: z.number().optional(),
  qMax: z.number().optional()
});

const lineSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  from: z.union([z.string(), z.number()]).transform(String),
  to: z.union([z.string(), z.number()]).transform(String),
  mode: z.enum(['impedance', 'admittance']).optional(),
  r: z.number().default(0),
  x: z.number().default(0.0001),
  b: z.number().default(0),
  g: z.number().optional(),
  bc: z.number().optional()
});

const sourceSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  busId: z.union([z.string(), z.number()]).transform(String),
  p: z.number().optional(),
  q: z.number().optional(),
  qMin: z.number().optional(),
  qMax: z.number().optional(),
  voltageSetpoint: z.number().optional(),
  pf: z.number().optional()
});

const requestSchema = z.object({
  method: z.enum(['NR', 'GS']),
  maxIterations: z.number().int().positive().optional(),
  tolerance: z.number().positive().optional(),
  accelerationFactor: z.number().positive().optional(),
  baseMVA: z.number().positive().optional(),
  buses: z.array(busSchema).default([]),
  lines: z.array(lineSchema).default([]),
  generators: z.array(sourceSchema).default([]),
  loads: z.array(sourceSchema).default([])
});

export function handleSampleSystems(_req, res) {
  res.json(sampleSystems);
}

export function handleSimulate(req, res) {
  console.log('Received simulation request:', JSON.stringify(req.body, null, 2));
  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid simulation payload',
      details: parsed.error.flatten()
    });
  }

  try {
    const payload = parsed.data;
    console.log('Parsed payload lines:', JSON.stringify(payload.lines, null, 2));
    const validation = validateSystem(payload);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'SystemValidationError',
        message: 'System validation failed',
        details: validation.errors
      });
    }

    const result = runLoadFlow({
      ...payload,
      maxIterations: payload.maxIterations ?? 25,
      tolerance: payload.tolerance ?? 0.001,
      accelerationFactor: payload.accelerationFactor ?? 1,
      baseMVA: payload.baseMVA ?? 100,
      debug: payload.debug === true
    });

    res.json({
      method: payload.method,
      validation,
      results: result.results,
      iterations: result.iterations,
      ybus: result.ybus,
      baseMVA: result.baseMVA
    });
  } catch (error) {
    res.status(500).json({
      error: 'SimulationError',
      message: error.message
    });
  }
}
