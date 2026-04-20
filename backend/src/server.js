import { app } from './app.js';

// For local development and Vercel compatibility
if (process.env.NODE_ENV !== 'production') {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`Power system backend listening on http://localhost:${port}`);
  });
}
