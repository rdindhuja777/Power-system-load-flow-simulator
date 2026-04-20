import { Router } from 'express';
import { handleSimulate, handleSampleSystems } from '../controllers/simulateController.js';

export const simulateRouter = Router();

simulateRouter.post('/simulate', handleSimulate);
simulateRouter.get('/sample-systems', handleSampleSystems);
