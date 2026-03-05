import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import {
  SearchQueryDto,
  SearchResponseDto,
  SearchSuggestionDto,
} from './dto/search.dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 搜索商品
   * GET /api/v1/search?q=keyword
   */
  @Get()
  @ApiOperation({
    summary: '搜索商品',
    description: '根据关键词搜索商品，支持按名称和描述搜索。结果按相关度排序。',
  })
  @ApiQuery({
    name: 'q',
    description: '搜索关键词',
    required: true,
    example: 'airpods',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回搜索结果',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '参数错误',
  })
  async search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.searchService.search(query);
  }

  /**
   * 获取搜索建议
   * GET /api/v1/search/suggestions?keyword=keyword
   */
  @Get('suggestions')
  @ApiOperation({
    summary: '获取搜索建议',
    description: '根据输入的关键词提供搜索建议。',
  })
  @ApiQuery({
    name: 'keyword',
    description: '输入的关键词',
    required: true,
    example: 'air',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回搜索建议',
    type: [SearchSuggestionDto],
  })
  async getSuggestions(
    @Query('keyword') keyword: string,
  ): Promise<SearchSuggestionDto[]> {
    return this.searchService.getSuggestions(keyword);
  }
}
