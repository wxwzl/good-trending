import { describe, it, expect, beforeEach } from 'vitest'
import { setupMockServer, resetMockData } from '../mocks/server'
import { getMockProducts } from '../mocks/handlers'
import { createProductFixture } from '../fixtures'

describe('Products API', () => {
  setupMockServer()

  beforeEach(() => {
    resetMockData()
  })

  describe('GET /api/v1/products', () => {
    it('should return paginated list of products', async () => {
      const response = await fetch('/api/v1/products?page=1&limit=10')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.total).toBeDefined()
      expect(data.page).toBe(1)
      expect(data.limit).toBe(10)
      expect(data.totalPages).toBeDefined()
    })

    it('should return correct pagination metadata', async () => {
      const response = await fetch('/api/v1/products?page=2&limit=5')
      const data = await response.json()

      expect(data.page).toBe(2)
      expect(data.limit).toBe(5)
    })

    it('should filter products by source type', async () => {
      const response = await fetch('/api/v1/products?sourceType=TWITTER')
      const data = await response.json()

      expect(response.status).toBe(200)
      data.data.forEach((product: { sourceType: string }) => {
        expect(product.sourceType).toBe('TWITTER')
      })
    })

    it('should filter products by AMAZON source type', async () => {
      const response = await fetch('/api/v1/products?sourceType=AMAZON')
      const data = await response.json()

      expect(response.status).toBe(200)
      data.data.forEach((product: { sourceType: string }) => {
        expect(product.sourceType).toBe('AMAZON')
      })
    })

    it('should return all products when no source type filter', async () => {
      const response = await fetch('/api/v1/products')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should handle pagination correctly', async () => {
      const page1Response = await fetch('/api/v1/products?page=1&limit=5')
      const page1Data = await page1Response.json()

      const page2Response = await fetch('/api/v1/products?page=2&limit=5')
      const page2Data = await page2Response.json()

      expect(page1Data.data.length).toBeLessThanOrEqual(5)
      expect(page2Data.data.length).toBeLessThanOrEqual(5)

      // Ensure different products on different pages
      if (page1Data.data.length > 0 && page2Data.data.length > 0) {
        expect(page1Data.data[0].id).not.toBe(page2Data.data[0].id)
      }
    })
  })

  describe('GET /api/v1/products/:id', () => {
    it('should return a single product by ID', async () => {
      const mockProducts = getMockProducts()
      const productId = mockProducts[0].id

      const response = await fetch(`/api/v1/products/${productId}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(productId)
      expect(data.name).toBeDefined()
      expect(data.slug).toBeDefined()
    })

    it('should return 404 for non-existent product', async () => {
      const response = await fetch('/api/v1/products/non-existent-id')

      expect(response.status).toBe(404)
    })

    it('should return product with all required fields', async () => {
      const mockProducts = getMockProducts()
      const productId = mockProducts[0].id

      const response = await fetch(`/api/v1/products/${productId}`)
      const product = await response.json()

      expect(product.id).toBeDefined()
      expect(product.name).toBeDefined()
      expect(product.slug).toBeDefined()
      expect(product.description).toBeDefined()
      expect(product.sourceType).toBeDefined()
      expect(product.trendingScore).toBeDefined()
      expect(product.isActive).toBeDefined()
    })
  })

  describe('GET /api/v1/products/slug/:slug', () => {
    it('should return a product by slug', async () => {
      const mockProducts = getMockProducts()
      const productSlug = mockProducts[0].slug

      const response = await fetch(`/api/v1/products/slug/${productSlug}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.slug).toBe(productSlug)
    })

    it('should return 404 for non-existent slug', async () => {
      const response = await fetch('/api/v1/products/slug/non-existent-slug')

      expect(response.status).toBe(404)
    })
  })

  describe('Product data structure', () => {
    it('should have valid product structure', async () => {
      const response = await fetch('/api/v1/products?limit=1')
      const data = await response.json()

      if (data.data.length > 0) {
        const product = data.data[0]

        expect(product.id).toBeDefined()
        expect(typeof product.id).toBe('string')
        expect(product.name).toBeDefined()
        expect(typeof product.name).toBe('string')
        expect(product.slug).toBeDefined()
        expect(typeof product.slug).toBe('string')
        expect(['TWITTER', 'AMAZON']).toContain(product.sourceType)
      }
    })

    it('should have valid price data', async () => {
      const response = await fetch('/api/v1/products?limit=5')
      const data = await response.json()

      data.data.forEach((product: { price: number | null; currency: string }) => {
        if (product.price !== null) {
          expect(typeof product.price).toBe('number')
          expect(product.price).toBeGreaterThanOrEqual(0)
        }
        expect(product.currency).toBeDefined()
      })
    })

    it('should have valid trending score', async () => {
      const response = await fetch('/api/v1/products?limit=5')
      const data = await response.json()

      data.data.forEach((product: { trendingScore: number }) => {
        expect(typeof product.trendingScore).toBe('number')
        expect(product.trendingScore).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
