import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SearchService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async search(params: { query: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { name: { contains: params.query, mode: 'insensitive' as const } },
        {
          description: { contains: params.query, mode: 'insensitive' as const },
        },
      ],
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          topics: {
            include: {
              topic: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      query: params.query,
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
