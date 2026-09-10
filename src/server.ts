import 'dotenv/config';
import { createApp } from './app';

const port = process.env.PORT ?? 3001;
createApp().listen(port, () => {
  console.log(`Cadence API listening on http://localhost:${port}`);
});