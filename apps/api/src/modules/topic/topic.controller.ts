import { Controller, Get, Param, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TopicService } from './topic.service';

@ApiTags('topics')
@Controller('topics')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Get()
  @ApiOperation({
    summary: '获取所有分类',
    description: '获取所有商品分类列表',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取分类列表',
  })
  async findAll() {
    return this.topicService.findAll();
  }

  @Get(':slug')
  @ApiOperation({
    summary: '获取分类详情',
    description: '根据 slug 获取分类详情',
  })
  @ApiParam({
    name: 'slug',
    description: '分类 slug',
    example: 'electronics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取分类详情',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '分类不存在',
  })
  async findBySlug(@Param('slug') slug: string) {
    return this.topicService.findBySlug(slug);
  }

  @Get(':slug/products')
  @ApiOperation({
    summary: '获取分类下的商品',
    description: '根据分类 slug 获取商品列表',
  })
  @ApiParam({
    name: 'slug',
    description: '分类 slug',
    example: 'electronics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取商品列表',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '分类不存在',
  })
  async getTopicProducts(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.topicService.getTopicProducts(slug, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
