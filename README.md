# Power System Load Flow Simulator

A production-oriented full-stack web application for load flow analysis using the Newton-Raphson and Gauss-Seidel methods.

## Stack
- Frontend: React, Vite, Tailwind CSS, React Flow, Zustand
- Backend: Node.js, Express
- Computation: math.js
- Tests: Vitest

## Features
- Method selection landing page
- Drag-and-drop style network dashboard
- Bus, generator, load, and line configuration
- Y-bus generation
- Gauss-Seidel and Newton-Raphson solvers
- Validation for slack bus, PQ bus, and connectivity
- Iteration visualization
- Results tables and line flow summary
- Export as CSV, JSON, and PDF
- Save/load system state
- Dark mode and sample systems

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```

The frontend runs on Vite and the backend runs on Express.
