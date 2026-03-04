import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TrendingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getTrending(params: { date?: string; topic?: string; limit?: number }) {
    const limit = Math.min(params.limit || 20, 100);
    const targetDate = params.date ? new Date(params.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const where: any = {
      date: targetDate,
    };

    if (params.topic) {
      where.product = {
        topics: {
          some: {
            topic: {
              slug: params.topic,
            },
          },
        },
      };
    }

    const trends = await this.prisma.trend.findMany({
      where,
      take: limit,
      orderBy: {
        rank: 'asc',
      },
      include: {
        product: {
          include: {
            topics: {
              include: {
                topic: true,
              },
            },
          },
        },
      },
    });

    return {
      products: trends.map((trend) => ({
        ...trend.product,
        rank: trend.rank,
        score: trend.score,
        mentions: trend.mentions,
        views: trend.views,
        likes: trend.likes,
      })),
      date: targetDate.toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };
  }
}
