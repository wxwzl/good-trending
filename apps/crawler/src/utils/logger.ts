import winston from 'winston'
import chalk from 'chalk'

const { combine, timestamp, printf, colorize, align } = winston.format

// Custom format for console output
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const ts = chalk.gray(timestamp as string)
  let levelStr = level.toUpperCase()

  switch (level) {
    case 'error':
      levelStr = chalk.red(levelStr)
      break
    case 'warn':
      levelStr = chalk.yellow(levelStr)
      break
    case 'info':
      levelStr = chalk.blue(levelStr)
      break
    case 'debug':
      levelStr = chalk.gray(levelStr)
      break
  }

  let metaStr = ''
  if (Object.keys(metadata).length > 0) {
    metaStr = chalk.gray(` ${JSON.stringify(metadata)}`)
  }

  return `${ts} [${levelStr}] ${message}${metaStr}`
})

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
    }),
  ],
})

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/crawler-error.log',
      level: 'error',
    })
  )
  logger.add(
    new winston.transports.File({
      filename: 'logs/crawler-combined.log',
    })
  )
}

export default logger
