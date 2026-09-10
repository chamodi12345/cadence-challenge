import express from 'express';
import cors from 'cors';
import { authRouter } from './auth/auth.routes';
import { usersRouter } from './users/users.routes';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  return app;
}