import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { GetProductsDto } from './dto/get-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductResponseDto,
  PaginatedProductResponseDto,
} from './dto/product-response.dto';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * 获取商品列表
   * GET /api/v1/products
   */
  @Get()
  @ApiOperation({
    summary: '获取商品列表',
    description: '支持分页、筛选和排序。默认按创建时间倒序排列。',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功返回商品列表',
    type: PaginatedProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数错误',
  })
  async getProducts(
    @Query() query: GetProductsDto,
  ): Promise<PaginatedProductResponseDto> {
    return this.productService.getProducts(query);
  }

  /**
   * 获取单个商品
   * GET /api/v1/products/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: '获取商品详情',
    description: '根据商品 ID 获取商品详细信息。',
  })
  @ApiParam({
    name: 'id',
    description: '商品 ID',
    example: 'clh1234567890abcdef',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功返回商品详情',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '商品不存在',
  })
  async getProductById(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.productService.getProductById(id);
  }

  /**
   * 创建商品
   * POST /api/v1/products
   */
  @Post()
  @ApiOperation({
    summary: '创建商品',
    description: '创建新商品。sourceUrl 必须唯一。',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '商品创建成功',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数验证失败',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '来源 URL 已存在',
  })
  async createProduct(
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productService.createProduct(dto);
  }

  /**
   * 更新商品
   * PUT /api/v1/products/:id
   */
  @Put(':id')
  @ApiOperation({
    summary: '更新商品',
    description: '更新商品信息。只更新请求中包含的字段。',
  })
  @ApiParam({
    name: 'id',
    description: '商品 ID',
    example: 'clh1234567890abcdef',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '商品更新成功',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '商品不存在',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数验证失败',
  })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productService.updateProduct(id, dto);
  }

  /**
   * 删除商品
   * DELETE /api/v1/products/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除商品',
    description: '根据 ID 删除商品。',
  })
  @ApiParam({
    name: 'id',
    description: '商品 ID',
    example: 'clh1234567890abcdef',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '商品删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '商品不存在',
  })
  async deleteProduct(@Param('id') id: string): Promise<void> {
    return this.productService.deleteProduct(id);
  }
}
