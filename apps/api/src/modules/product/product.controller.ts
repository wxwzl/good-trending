import { Controller, Get, Param, Query, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { ProductQueryDto, ProductResponseDto } from './product.dto';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({
    summary: '获取商品列表',
    description: '支持分页、筛选和搜索',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取商品列表',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    example: 10,
  })
  @ApiQuery({
    name: 'sourceType',
    required: false,
    description: '来源类型',
    enum: ['X_PLATFORM', 'AMAZON'],
  })
  @ApiQuery({
    name: 'topicId',
    required: false,
    description: '分类 ID',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: '搜索关键词',
  })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sourceType: query.sourceType,
      topicId: query.topicId,
      keyword: query.keyword,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取商品详情',
    description: '根据 ID 获取单个商品的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '商品 ID',
    example: 'clx123456789',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取商品详情',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '商品不存在',
  })
  async findOne(@Param('id') id: string) {
    return this.productService.findById(id);
  }
}
