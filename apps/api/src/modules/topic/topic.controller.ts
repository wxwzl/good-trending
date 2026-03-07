import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TopicService } from './topic.service';
import {
  CreateTopicDto,
  UpdateTopicDto,
  GetTopicsDto,
  GetTopicProductsDto,
  TopicResponseDto,
  TopicWithProductCountDto,
} from './dto/topic.dto';

@ApiTags('topics')
@Controller('topics')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  /**
   * 获取分类列表
   * GET /api/v1/topics
   */
  @Get()
  @ApiOperation({
    summary: '获取分类列表',
    description: '获取所有分类，包含每个分类下的商品数量。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回分类列表',
  })
  async getTopics(@Query() query: GetTopicsDto) {
    return this.topicService.getTopics(query);
  }

  /**
   * 获取分类详情
   * GET /api/v1/topics/:slug
   */
  @Get(':slug')
  @ApiOperation({
    summary: '获取分类详情',
    description: '根据 slug 获取分类详细信息，包含商品数量。',
  })
  @ApiParam({
    name: 'slug',
    description: '分类 slug',
    example: 'electronics',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回分类详情',
    type: TopicWithProductCountDto,
  })
  @ApiResponse({
    status: 404,
    description: '分类不存在',
  })
  async getTopicBySlug(
    @Param('slug') slug: string,
  ): Promise<TopicWithProductCountDto> {
    return this.topicService.getTopicBySlug(slug);
  }

  /**
   * 获取分类下的商品
   * GET /api/v1/topics/:slug/products
   */
  @Get(':slug/products')
  @ApiOperation({
    summary: '获取分类商品',
    description: '获取指定分类下的所有商品。',
  })
  @ApiParam({
    name: 'slug',
    description: '分类 slug',
    example: 'electronics',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回商品列表',
  })
  @ApiResponse({
    status: 404,
    description: '分类不存在',
  })
  async getProductsByTopic(
    @Param('slug') slug: string,
    @Query() query: GetTopicProductsDto,
  ) {
    return this.topicService.getProductsByTopic(slug, query);
  }

  /**
   * 创建分类
   * POST /api/v1/topics
   */
  @Post()
  @ApiOperation({
    summary: '创建分类',
    description: '创建新分类。slug 和 name 必须唯一。',
  })
  @ApiResponse({
    status: 201,
    description: '分类创建成功',
    type: TopicResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '参数验证失败',
  })
  @ApiResponse({
    status: 409,
    description: 'slug 或 name 已存在',
  })
  async createTopic(@Body() dto: CreateTopicDto): Promise<TopicResponseDto> {
    return this.topicService.createTopic(dto);
  }

  /**
   * 更新分类
   * PATCH /api/v1/topics/:slug
   */
  @Patch(':slug')
  @ApiOperation({
    summary: '更新分类',
    description: '更新分类信息。只更新请求中包含的字段。',
  })
  @ApiParam({
    name: 'slug',
    description: '分类 slug',
    example: 'electronics',
  })
  @ApiResponse({
    status: 200,
    description: '分类更新成功',
    type: TopicResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '分类不存在',
  })
  async updateTopic(
    @Param('slug') slug: string,
    @Body() dto: UpdateTopicDto,
  ): Promise<TopicResponseDto> {
    return this.topicService.updateTopic(slug, dto);
  }
}
