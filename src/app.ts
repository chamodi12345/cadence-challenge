import express from 'express';
import cors from 'cors';
import { authRouter } from './auth/auth.routes';
import { usersRouter } from './users/users.routes';

import { rulesRouter } from './rules/rules.routes';

import { payoutsRouter } from './payouts/payouts.routes';
import { statementsRouter } from './statements/statements.routes';
import { bookingsRouter } from './bookings/bookings.routes';




export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/rules', rulesRouter);
  app.use('/payouts', payoutsRouter);
app.use('/statements', statementsRouter);
app.use('/bookings', bookingsRouter);
  return app;
}