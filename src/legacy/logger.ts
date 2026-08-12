/**
 * Minimal structured logger. Replace it with something real when you build the API —
 * this exists so the legacy module has somewhere to log.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? 'info') as Level;
  return LEVELS[configured] ?? LEVELS.info;
}

function emit(level: Level, message: string, context: Record<string, unknown> = {}): void {
  if (LEVELS[level] < threshold()) return;
  console.log(JSON.stringify({ level, message, ts: new Date().toISOString(), ...context }));
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
