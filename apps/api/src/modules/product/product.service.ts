import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { GetProductsDto, SortField, SortOrder } from './dto/get-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  PaginatedProductResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';

/**
 * 商品服务层
 * 负责业务逻辑处理
 */
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * 获取商品列表（分页）
   *
   * @param query 查询参数
   * @returns 分页商品列表
   */
  async getProducts(
    query: GetProductsDto,
  ): Promise<PaginatedProductResponseDto> {
    const {
      page = 1,
      limit = 10,
      sourceType,
      keyword,
      sortBy = SortField.CREATED_AT,
      order = SortOrder.DESC,
    } = query;

    // 参数边界检查
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    this.logger.debug(
      `Fetching products: page=${safePage}, limit=${safeLimit}, sourceType=${sourceType}`,
    );

    const result = await this.productRepository.findMany({
      page: safePage,
      limit: safeLimit,
      sourceType,
      keyword,
      sortBy,
      order,
    });

    return {
      data: result.data.map(this.mapToResponseDto),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * 根据 ID 获取商品详情
   *
   * @param id 商品 ID
   * @returns 商品详情
   */
  async getProductById(id: string): Promise<ProductResponseDto> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    const product = await this.productRepository.findById(id.trim());

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapToResponseDto(product);
  }

  /**
   * 创建商品
   *
   * @param dto 创建商品 DTO
   * @returns 创建的商品
   */
  async createProduct(dto: CreateProductDto): Promise<ProductResponseDto> {
    // 检查来源 URL 是否已存在
    const existingProduct = await this.productRepository.findBySourceUrl(
      dto.sourceUrl,
    );

    if (existingProduct) {
      throw new ConflictException(
        `Product with source URL ${dto.sourceUrl} already exists`,
      );
    }

    this.logger.log(`Creating product: ${dto.name}`);

    const product = await this.productRepository.create({
      name: dto.name,
      description: dto.description,
      image: dto.image,
      price: dto.price,
      currency: dto.currency,
      sourceUrl: dto.sourceUrl,
      sourceId: dto.sourceId,
      sourceType: dto.sourceType,
    });

    return this.mapToResponseDto(product);
  }

  /**
   * 更新商品
   *
   * @param id 商品 ID
   * @param dto 更新商品 DTO
   * @returns 更新后的商品
   */
  async updateProduct(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    this.logger.log(`Updating product: ${id}`);

    const product = await this.productRepository.update(id.trim(), {
      name: dto.name,
      description: dto.description,
      image: dto.image,
      price: dto.price,
      currency: dto.currency,
    });

    return this.mapToResponseDto(product);
  }

  /**
   * 删除商品
   *
   * @param id 商品 ID
   */
  async deleteProduct(id: string): Promise<void> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    this.logger.log(`Deleting product: ${id}`);

    await this.productRepository.delete(id.trim());
  }

  /**
   * 检查商品是否存在
   *
   * @param id 商品 ID
   * @returns 是否存在
   */
  async productExists(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false;
    }

    return this.productRepository.exists(id.trim());
  }

  /**
   * 将数据库实体映射为响应 DTO
   */
  private mapToResponseDto(product: {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    price: string | null;
    currency: string;
    sourceUrl: string;
    sourceId: string;
    sourceType: 'X_PLATFORM' | 'AMAZON';
    createdAt: Date;
    updatedAt: Date;
  }): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description ?? undefined,
      image: product.image ?? undefined,
      price: product.price ?? undefined,
      currency: product.currency,
      sourceUrl: product.sourceUrl,
      sourceId: product.sourceId,
      sourceType: product.sourceType,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
