import { app } from './app.js';

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`Power system backend listening on http://localhost:${port}`);
});
