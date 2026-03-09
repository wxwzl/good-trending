import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';
import { SourceType } from '@good-trending/dto';

describe('SearchController', () => {
  let controller: SearchController;
  let service: jest.Mocked<SearchService>;

  const mockSearchResponse = {
    items: [
      {
        id: 'test-id-123',
        slug: 'apple-airpods-pro',
        name: 'Apple AirPods Pro',
        description: 'Wireless earbuds',
        image: 'https://example.com/image.jpg',
        price: '249.99',
        currency: 'USD',
        discoveredFrom: SourceType.AMAZON,
        relevanceScore: 0.95,
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
    query: 'airpods',
  };

  const mockSuggestions = [
    { text: 'airpods', count: 100 },
    { text: 'airpods pro', count: 50 },
  ];

  const mockService = {
    search: jest.fn(),
    getSuggestions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    service = module.get(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should_return_search_results', async () => {
      // Arrange
      const query: SearchQueryDto = { q: 'airpods' };
      service.search.mockResolvedValue(mockSearchResponse);

      // Act
      const result = await controller.search(query);

      // Assert
      expect(service.search).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockSearchResponse);
    });

    it('should_pass_all_query_params_to_service', async () => {
      // Arrange
      const query: SearchQueryDto = {
        q: 'airpods',
        page: 2,
        limit: 20,
        discoveredFrom: SourceType.AMAZON,
        categoryId: 'topic-123',
      };
      service.search.mockResolvedValue(mockSearchResponse);

      // Act
      await controller.search(query);

      // Assert
      expect(service.search).toHaveBeenCalledWith(query);
    });
  });

  describe('getSuggestions', () => {
    it('should_return_search_suggestions', async () => {
      // Arrange
      service.getSuggestions.mockResolvedValue(mockSuggestions);

      // Act
      const result = await controller.getSuggestions('air');

      // Assert
      expect(service.getSuggestions).toHaveBeenCalledWith('air');
      expect(result).toEqual(mockSuggestions);
    });
  });
});
