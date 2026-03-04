import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProductService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    sourceType?: string;
    topicId?: string;
    keyword?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.sourceType) {
      where.sourceType = params.sourceType;
    }

    if (params.topicId) {
      where.topics = {
        some: {
          topicId: params.topicId,
        },
      };
    }

    if (params.keyword) {
      where.OR = [
        { name: { contains: params.keyword, mode: 'insensitive' } },
        { description: { contains: params.keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
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
          tags: {
            include: {
              tag: true,
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
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        topics: {
          include: {
            topic: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        trends: {
          orderBy: {
            date: 'desc',
          },
          take: 30,
        },
        histories: {
          orderBy: {
            date: 'desc',
          },
          take: 30,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
