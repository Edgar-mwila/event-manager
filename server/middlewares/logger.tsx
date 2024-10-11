import { logger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";

export function pinoLogger() {
  return logger({
    pino: pino(pretty()),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
}