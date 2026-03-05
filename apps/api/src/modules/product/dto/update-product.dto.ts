import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * 更新商品 DTO
 * 继承自 CreateProductDto，所有字段变为可选
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: '商品名称',
    example: 'Apple AirPods Pro 2 (Updated)',
  })
  name?: string;
}
