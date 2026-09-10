import 'dotenv/config';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 4700);
createApp().listen(port, '127.0.0.1', () => {
  console.log(`Cadence API listening on http://localhost:${port}`);
});