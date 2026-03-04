// Re-export Prisma types
export * from '@prisma/client'

// Export the client instance
export { prisma, default as prismaClient } from './client'
