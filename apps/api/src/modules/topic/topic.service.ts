import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TopicService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findAll() {
    const topics = await this.prisma.topic.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return topics.map((topic) => ({
      ...topic,
      productCount: topic._count.products,
    }));
  }

  async findBySlug(slug: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return {
      ...topic,
      productCount: topic._count.products,
    };
  }

  async getTopicProducts(
    slug: string,
    params: { page?: number; limit?: number },
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 100);
    const skip = (page - 1) * limit;

    const topic = await this.prisma.topic.findUnique({
      where: { slug },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          topics: {
            some: {
              topicId: topic.id,
            },
          },
        },
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
      this.prisma.product.count({
        where: {
          topics: {
            some: {
              topicId: topic.id,
            },
          },
        },
      }),
    ]);

    return {
      topic,
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
