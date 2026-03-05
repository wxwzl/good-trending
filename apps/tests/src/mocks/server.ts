import { setupServer } from "msw/node";
import { handlers, resetMockData } from "./handlers";

export const server = setupServer(...handlers);

/**
 * Setup MSW server for testing
 * This function should be called at the top level of a test file (outside describe blocks)
 * Or use the server instance directly with your own lifecycle hooks
 */
export function setupMockServer() {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockData();
  });
  afterAll(() => server.close());
}

export { resetMockData };
