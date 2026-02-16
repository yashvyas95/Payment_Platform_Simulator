import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const logPretty = process.env.LOG_PRETTY === 'true' || isDev;

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: logPretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  redact: {
    paths: ['req.headers.authorization', '*.card.number', '*.card.cvc', '*.cvv'],
    remove: true,
  },
});
