# NestJS 最佳实践指南

本文档提供了使用 NestJS 构建后端应用的全面最佳实践指导。

## 目录

1. [安装和配置](#安装和配置)
2. [项目结构](#项目结构)
3. [模块化架构](#模块化架构)
4. [控制器开发](#控制器开发)
5. [服务层开发](#服务层开发)
6. [数据验证与 DTO](#数据验证与-dto)
7. [数据库集成](#数据库集成)
8. [认证与授权](#认证与授权)
9. [异常处理](#异常处理)
10. [中间件、管道、守卫、拦截器](#中间件管道守卫拦截器)

---

## 安装和配置

### 创建新项目

推荐使用 NestJS CLI 创建项目：

```bash
# 全局安装 NestJS CLI
npm i -g @nestjs/cli

# 创建新项目
nest new project-name

# 使用 pnpm（推荐）
pnpm create nest project-name
```

### 系统要求

- Node.js 18+
- npm 9+ / pnpm 8+ / yarn 1.22+

### 推荐的项目脚本

```json
{
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### TypeScript 配置

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

## 项目结构

### 推荐目录结构

```
project-root/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── app.module.ts              # 根模块
│   ├── common/                    # 公共模块
│   │   ├── constants/             # 常量和枚举
│   │   ├── decorators/            # 自定义装饰器
│   │   ├── dto/                   # 通用 DTO
│   │   ├── filters/               # 异常过滤器
│   │   ├── guards/                # 守卫
│   │   ├── interceptors/          # 拦截器
│   │   ├── interfaces/            # 公共接口
│   │   ├── middleware/            # 中间件
│   │   └── pipes/                 # 管道
│   ├── config/                    # 配置文件
│   ├── modules/                   # 业务模块
│   │   ├── users/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   └── auth/
│   ├── shared/                    # 共享模块
│   └── database/                  # 数据库配置
├── test/                          # 测试目录
├── .env                           # 环境变量
├── .env.example                   # 环境变量示例
├── nest-cli.json                  # Nest CLI 配置
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### 文件命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 模块文件 | `*.module.ts` | `users.module.ts` |
| 控制器文件 | `*.controller.ts` | `users.controller.ts` |
| 服务文件 | `*.service.ts` | `users.service.ts` |
| DTO 文件 | `*.dto.ts` | `create-user.dto.ts` |
| 实体文件 | `*.entity.ts` | `user.entity.ts` |
| 接口文件 | `*.interface.ts` | `user.interface.ts` |
| 守卫文件 | `*.guard.ts` | `jwt-auth.guard.ts` |
| 拦截器文件 | `*.interceptor.ts` | `logging.interceptor.ts` |
| 管道文件 | `*.pipe.ts` | `validation.pipe.ts` |
| 过滤器文件 | `*.filter.ts` | `http-exception.filter.ts` |
| 中间件文件 | `*.middleware.ts` | `logger.middleware.ts` |
| 装饰器文件 | `*.decorator.ts` | `roles.decorator.ts` |

---

## 模块化架构

### 模块定义

每个功能模块应该独立且职责单一：

```typescript
// users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 导出供其他模块使用
})
export class UsersModule {}
```

### 模块导入

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
})
export class AppModule {}
```

### 共享模块

```typescript
// shared/shared.module.ts
import { Module, Global } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

@Global()
@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class SharedModule {}
```

---

## 控制器开发

### 基础控制器

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
```

### 请求装饰器

```typescript
@Controller('users')
export class UsersController {
  // 路由参数
  @Get(':id')
  findOne(@Param('id') id: string) {}

  // 查询参数
  @Get()
  findAll(@Query('limit') limit: number, @Query('offset') offset: number) {}

  // 请求体
  @Post()
  create(@Body() createUserDto: CreateUserDto) {}

  // 请求头
  @Get()
  findAll(@Headers('authorization') token: string) {}

  // IP 地址
  @Post()
  create(@Ip() ip: string) {}
}
```

### 响应处理

```typescript
import { Response } from 'express';

@Controller('files')
export class FilesController {
  // 流式响应
  @Get('download')
  download(@Res() res: Response) {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    file.pipe(res);
  }

  // 设置响应头
  @Get('custom')
  customResponse(@Res({ passthrough: true }) res: Response) {
    res.setHeader('X-Custom-Header', 'value');
    return { message: 'success' };
  }
}
```

---

## 服务层开发

### 服务定义

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(query: QueryUserDto): Promise<[User[], number]> {
    const { limit = 10, offset = 0, search } = query;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where('user.name LIKE :search', {
        search: `%${search}%`,
      });
    }

    return queryBuilder.skip(offset).take(limit).getManyAndCount();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
```

### 依赖注入

```typescript
@Injectable()
export class UsersService {
  // 构造函数注入
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: Repository<User>,
  ) {}

  // 属性注入
  @Inject('CONFIG_OPTIONS')
  private readonly options: ConfigOptions;
}
```

---

## 数据验证与 DTO

### DTO 定义

```typescript
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(3, { message: '用户名最少 3 个字符' })
  @MaxLength(20, { message: '用户名最多 20 个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  @Transform(({ value }) => value?.toLowerCase())
  username: string;

  @ApiProperty({ description: '邮箱', example: 'john@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '密码', minLength: 6 })
  @IsString()
  @MinLength(6, { message: '密码最少 6 个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/, {
    message: '密码必须包含大小写字母和数字',
  })
  password: string;

  @ApiPropertyOptional({ description: '年龄', minimum: 1, maximum: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({
    description: '用户角色',
    enum: ['user', 'admin'],
    default: 'user',
  })
  @IsOptional()
  @IsEnum(['user', 'admin'], { message: '角色必须是 user 或 admin' })
  role?: 'user' | 'admin';
}

// 更新 DTO
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}

// 查询 DTO
export class QueryUserDto {
  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '偏移量', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;
}
```

### 全局验证管道

```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 过滤未在 DTO 中定义的属性
      forbidNonWhitelisted: true, // 如果存在未定义属性则抛出错误
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: false, // 生产环境可设为 true
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

---

## 数据库集成

### TypeORM 配置

```typescript
// config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 3306),
  username: configService.get('DB_USERNAME', 'root'),
  password: configService.get('DB_PASSWORD', ''),
  database: configService.get('DB_DATABASE', 'test'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get('NODE_ENV') !== 'production',
  logging: configService.get('NODE_ENV') !== 'production',
});
```

### 实体定义

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // 默认查询不包含密码
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
  role: string;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Repository 模式

```typescript
// users.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  // ...
})
export class UsersModule {}

// users.service.ts
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
}
```

---

## 认证与授权

### JWT 认证模块

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### JWT 策略

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### 角色装饰器和守卫

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

---

## 异常处理

### 全局异常过滤器

```typescript
// common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || message;
    }

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${JSON.stringify(exception)}`,
    );

    response.status(status).json({
      code: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 业务异常

```typescript
// common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, code: number = HttpStatus.BAD_REQUEST) {
    super({ code, message }, code);
  }
}

// 使用示例
throw new BusinessException('用户不存在', 404);
```

---

## 中间件、管道、守卫、拦截器

### 执行顺序

```
请求 -> 中间件 -> 守卫 -> 拦截器(前) -> 管道 -> 路由处理器 -> 拦截器(后) -> 响应
```

### 中间件示例

```typescript
// common/middleware/logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const responseTime = Date.now() - startTime;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms - ${ip} - ${userAgent}`,
      );
    });

    next();
  }
}
```

### 自定义管道

```typescript
// common/pipes/parse-int.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('参数必须是数字');
    }
    return val;
  }
}
```

### 响应拦截器

```typescript
// common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: 'Success',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

---

## 最佳实践总结

1. **模块化架构**：将应用划分为独立的功能模块
2. **分层设计**：控制器 -> 服务 -> 数据访问层
3. **DTO 验证**：使用 class-validator 进行输入验证
4. **统一异常处理**：使用异常过滤器统一处理错误
5. **认证授权**：使用 JWT + Guard 实现认证授权
6. **配置管理**：使用 @nestjs/config 管理环境变量
7. **API 文档**：使用 Swagger 自动生成 API 文档
8. **日志记录**：使用 Logger 记录关键操作
9. **测试覆盖**：编写单元测试和 e2e 测试
10. **代码规范**：使用 ESLint + Prettier 保持代码风格统一

---

## 参考资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [NestJS 中文文档](https://nestjs.bootcss.com/)
- [TypeORM 文档](https://typeorm.io/)
- [class-validator 文档](https://github.com/typestack/class-validator)
- [Passport.js 文档](http://www.passportjs.org/)
