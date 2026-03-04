import {
  Controller,
  Get,
  Query,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: '搜索商品',
    description: '根据关键词搜索商品',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: '搜索关键词',
    example: 'laptop',
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功搜索商品',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '搜索关键词不能为空',
  })
  async search(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    return this.searchService.search({
      query: query.trim(),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
