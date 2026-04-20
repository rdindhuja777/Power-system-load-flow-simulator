import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { sampleSystems } from './sampleSystems.js';
import { runLoadFlow, validateSystem } from './loadFlow.js';

describe('load flow validation', () => {
  it('accepts the 3-bus sample system', () => {
    const validation = validateSystem(sampleSystems.threeBus);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});

describe('load flow solver', () => {
  it('produces bus and line results', () => {
    const result = runLoadFlow(sampleSystems.threeBus);
    expect(result.results.busResults).toHaveLength(3);
    expect(result.results.lineResults.length).toBeGreaterThan(0);
    expect(result.ybus).toHaveLength(3);
    expect(result.iterations.length).toBeGreaterThan(0);
  });
});

describe('simulate endpoint', () => {
  it('returns simulation results', async () => {
    const response = await request(app).post('/simulate').send(sampleSystems.threeBus);
    expect(response.status).toBe(200);
    expect(response.body.results.busResults).toHaveLength(3);
  });
});
