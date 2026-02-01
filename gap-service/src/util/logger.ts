type LogMeta = Record<string, unknown>;

const toPayload = (level: 'info' | 'warn' | 'error', message: string, meta?: LogMeta) => {
  const payload: LogMeta = {
    level,
    message,
    time: new Date().toISOString()
  };
  if (meta) {
    Object.assign(payload, meta);
  }
  return payload;
};

export const logger = {
  info(message: string, meta?: LogMeta) {
    console.log(JSON.stringify(toPayload('info', message, meta)));
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(JSON.stringify(toPayload('warn', message, meta)));
  },
  error(message: string, meta?: LogMeta) {
    console.error(JSON.stringify(toPayload('error', message, meta)));
  }
};
