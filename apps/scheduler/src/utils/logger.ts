import winston from 'winston'

const { combine, timestamp, printf, colorize } = winston.format

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const metaStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : ''
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`
})

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
    }),
  ],
})

if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/scheduler-error.log',
      level: 'error',
    })
  )
  logger.add(
    new winston.transports.File({
      filename: 'logs/scheduler-combined.log',
    })
  )
}

export default logger
