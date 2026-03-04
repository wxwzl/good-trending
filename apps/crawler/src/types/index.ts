export type SourceType = 'TWITTER' | 'AMAZON'

export interface CrawlerConfig {
  source: SourceType | 'ALL'
  headless: boolean
  timeout: number
  maxRetries: number
  concurrency: number
}

export interface CrawledProduct {
  name: string
  description: string
  imageUrl: string
  sourceUrl: string
  sourceType: SourceType
  sourceId: string
  price: number | null
  currency: string
  rating: number | null
  reviewCount: number
  topics: string[]
  tags: string[]
}

export interface CrawlerResult {
  source: SourceType
  products: CrawledProduct[]
  totalCount: number
  errors: CrawlerError[]
  duration: number
  timestamp: Date
}

export interface CrawlerError {
  url: string
  message: string
  stack?: string
}

export interface TwitterTrendingData {
  name: string
  description: string
  url: string
  mentions: number
  sentiment: number
}

export interface AmazonProductData {
  asin: string
  name: string
  description: string
  imageUrl: string
  price: number
  currency: string
  rating: number
  reviewCount: number
  url: string
  categories: string[]
}

export type CrawlerStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface CrawlerState {
  status: CrawlerStatus
  currentSource: SourceType | null
  progress: number
  startTime: Date | null
  endTime: Date | null
  error: string | null
}
