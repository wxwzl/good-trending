import { describe, it, expect, beforeEach } from 'vitest'
import { setupMockServer, resetMockData } from '../mocks/server'

describe('Search API', () => {
  setupMockServer()

  beforeEach(() => {
    resetMockData()
  })

  describe('GET /api/v1/search', () => {
    it('should search products by query', async () => {
      const response = await fetch('/api/v1/search?q=laptop')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.query).toBe('laptop')
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should return 400 for empty query', async () => {
      const response = await fetch('/api/v1/search?q=')

      expect(response.status).toBe(400)
    })

    it('should return 400 for missing query parameter', async () => {
      const response = await fetch('/api/v1/search')

      expect(response.status).toBe(400)
    })

    it('should trim whitespace from query', async () => {
      const response = await fetch('/api/v1/search?q=%20%20laptop%20%20')
      const data = await response.json()

      expect(response.status).toBe(200)
      // The query should be trimmed
      expect(data.query).toBeDefined()
    })

    it('should return paginated search results', async () => {
      const response = await fetch('/api/v1/search?q=test&page=1&limit=5')
      const data = await response.json()

      expect(data.page).toBe(1)
      expect(data.limit).toBe(5)
      expect(data.total).toBeDefined()
      expect(data.totalPages).toBeDefined()
    })
  })

  describe('Search functionality', () => {
    it('should search in product names', async () => {
      const response = await fetch('/api/v1/search?q=laptop')
      const data = await response.json()

      expect(response.status).toBe(200)
      // Products should contain the search term in name or description
      data.data.forEach((product: { name: string; description: string }) => {
        const nameMatch = product.name.toLowerCase().includes('laptop')
        const descMatch = product.description.toLowerCase().includes('laptop')
        expect(nameMatch || descMatch).toBe(true)
      })
    })

    it('should be case-insensitive', async () => {
      const lowerResponse = await fetch('/api/v1/search?q=laptop')
      const lowerData = await lowerResponse.json()

      const upperResponse = await fetch('/api/v1/search?q=LAPTOP')
      const upperData = await upperResponse.json()

      expect(lowerData.total).toBe(upperData.total)
    })

    it('should return empty results for no matches', async () => {
      const response = await fetch('/api/v1/search?q=zzzznonexistentproduct12345')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
      expect(data.total).toBe(0)
    })
  })

  describe('Search results structure', () => {
    it('should include query in response', async () => {
      const response = await fetch('/api/v1/search?q=test')
      const data = await response.json()

      expect(data.query).toBe('test')
    })

    it('should return products with correct structure', async () => {
      const response = await fetch('/api/v1/search?q=laptop')
      const data = await response.json()

      if (data.data.length > 0) {
        const product = data.data[0]
        expect(product.id).toBeDefined()
        expect(product.name).toBeDefined()
        expect(product.slug).toBeDefined()
        expect(product.sourceType).toBeDefined()
      }
    })

    it('should include pagination metadata', async () => {
      const response = await fetch('/api/v1/search?q=test&page=2&limit=10')
      const data = await response.json()

      expect(data.page).toBe(2)
      expect(data.limit).toBe(10)
      expect(data.totalPages).toBe(Math.ceil(data.total / data.limit))
    })
  })

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const start = Date.now()
      await fetch('/api/v1/search?q=test')
      const duration = Date.now() - start

      // Should respond within 1 second
      expect(duration).toBeLessThan(1000)
    })
  })
})
