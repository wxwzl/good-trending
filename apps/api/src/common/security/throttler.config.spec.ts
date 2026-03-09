import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ThrottlerConfigService,
  CustomThrottlerGuard,
} from './throttler.config';
import { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler';

describe('ThrottlerConfigService', () => {
  let service: ThrottlerConfigService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
    } as unknown as ConfigService;
    service = new ThrottlerConfigService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create throttler options with default and search throttlers', () => {
    const options: ThrottlerModuleOptions = service.createThrottlerOptions();

    // Check if options is an object with throttlers property
    expect(options).toBeDefined();
    const throttlers = Array.isArray(options)
      ? options
      : (options as any).throttlers;
    expect(throttlers).toBeDefined();
    expect(throttlers).toHaveLength(2);
  });

  it('should configure default throttler with 100 requests per minute', () => {
    const options: ThrottlerModuleOptions = service.createThrottlerOptions();
    const throttlers: ThrottlerOptions[] = Array.isArray(options)
      ? options
      : (options as any).throttlers;
    const defaultThrottler = throttlers.find((t) => t.name === 'default');

    expect(defaultThrottler).toBeDefined();
    expect(defaultThrottler?.ttl).toBe(60000); // 1 minute
    expect(defaultThrottler?.limit).toBe(100); // 100 requests
  });

  it('should configure search throttler with 20 requests per minute', () => {
    const options: ThrottlerModuleOptions = service.createThrottlerOptions();
    const throttlers: ThrottlerOptions[] = Array.isArray(options)
      ? options
      : (options as any).throttlers;
    const searchThrottler = throttlers.find((t) => t.name === 'search');

    expect(searchThrottler).toBeDefined();
    expect(searchThrottler?.ttl).toBe(60000); // 1 minute
    expect(searchThrottler?.limit).toBe(20); // 20 requests
  });
});

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;
  let mockOptions: ThrottlerModuleOptions;
  let mockStorageService: any;
  let mockReflector: Reflector;

  beforeEach(async () => {
    mockOptions = {
      throttlers: [
        { name: 'default', ttl: 60000, limit: 100 },
        { name: 'search', ttl: 60000, limit: 20 },
      ],
    };
    mockStorageService = {
      increment: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };
    mockReflector = new Reflector();

    guard = new CustomThrottlerGuard(
      mockOptions,
      mockStorageService,
      mockReflector,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return "search" throttler for search endpoints', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          route: { path: '/api/v1/search' },
          url: '/api/v1/search',
        }),
      }),
    } as unknown as ExecutionContext;

    const throttlerName = await (guard as any).getThrottlerName(mockContext);
    expect(throttlerName).toBe('search');
  });

  it('should return "search" throttler for suggestions endpoints', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          route: { path: '/api/v1/search/suggestions' },
          url: '/api/v1/search/suggestions',
        }),
      }),
    } as unknown as ExecutionContext;

    const throttlerName = await (guard as any).getThrottlerName(mockContext);
    expect(throttlerName).toBe('search');
  });

  it('should return "default" throttler for non-search endpoints', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          route: { path: '/api/v1/products' },
          url: '/api/v1/products',
        }),
      }),
    } as unknown as ExecutionContext;

    const throttlerName = await (guard as any).getThrottlerName(mockContext);
    expect(throttlerName).toBe('default');
  });

  it('should return "default" throttler for trending endpoints', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          route: { path: '/api/v1/trending' },
          url: '/api/v1/trending',
        }),
      }),
    } as unknown as ExecutionContext;

    const throttlerName = await (guard as any).getThrottlerName(mockContext);
    expect(throttlerName).toBe('default');
  });

  it('should return "default" throttler for topics endpoints', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          route: { path: '/api/v1/topics' },
          url: '/api/v1/topics',
        }),
      }),
    } as unknown as ExecutionContext;

    const throttlerName = await (guard as any).getThrottlerName(mockContext);
    expect(throttlerName).toBe('default');
  });

  it('should handle requests without route object', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/api/v1/products',
        }),
      }),
    } as unknown as ExecutionContext;

    const throttlerName = await (guard as any).getThrottlerName(mockContext);
    expect(throttlerName).toBe('default');
  });

  it('should handle requests without route path', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const throttlerName = await (guard as any).getThrottlerName(mockContext);
    expect(throttlerName).toBe('default');
  });
});
