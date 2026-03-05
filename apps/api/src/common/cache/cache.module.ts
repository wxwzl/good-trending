import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheManager } from './cache-keys';

@Global()
@Module({
  providers: [CacheService, CacheManager],
  exports: [CacheService, CacheManager],
})
export class CacheModule {}
