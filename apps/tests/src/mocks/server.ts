import { setupServer } from 'msw/node'
import { handlers, resetMockData } from './handlers'

export const server = setupServer(...handlers)

/**
 * Setup MSW server for testing
 */
export function setupMockServer() {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    resetMockData()
  })

  afterAll(() => {
    server.close()
  })
}

export { resetMockData }
