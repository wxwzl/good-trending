---
name: nestjs-best-practices
description: NestJS 最佳实践指南。提供从项目初始化、模块化架构、控制器/服务设计、中间件、管道、守卫、拦截器到数据库集成的全面指导。基于官方文档 (https://docs.nestjs.com/)。适用于创建 NestJS 项目、开发 RESTful API、构建微服务、实现认证授权。
---

# NestJS 最佳实践 Skill

## 🎯 Skill 触发方式

当检测到以下关键词时，自动激活此 Skill：

- `nestjs` / `nest.js` / `nest`
- `nestjs controller` / `nestjs service` / `nestjs module`
- `nestjs 项目` / `创建 nest 应用`
- `nestjs pipe` / `nestjs guard` / `nestjs interceptor`
- `nestjs middleware` / `nestjs provider`
- `nestjs dto` / `nestjs entity`
- `typeorm` / `mongoose` + `nest`

## 📚 核心内容

### 1. 项目初始化和配置

**推荐的项目创建方式：**

```bash
# 安装 NestJS CLI
npm i -g @nestjs/cli

# 创建新项目
nest new project-name

# 使用 pnpm（推荐）
pnpm create nest project-name
```

**默认配置包括：**

- TypeScript
- ESLint + Prettier
- Jest 测试框架
- 热重载支持

**系统要求：**

- Node.js 18+
- npm 9+ / pnpm 8+ / yarn 1.22+

### 2. 项目结构最佳实践

**推荐的项目目录结构：**

```
src/
├── main.ts                    # 应用入口
├── app.module.ts              # 根模块
├── app.controller.ts          # 根控制器
├── app.service.ts             # 根服务
├── common/                    # 公共模块
│   ├── constants/             # 常量和枚举
│   ├── decorators/            # 自定义装饰器
│   ├── dto/                   # 通用 DTO
│   ├── filters/               # 异常过滤器
│   ├── guards/                # 守卫
│   ├── interceptors/          # 拦截器
│   ├── interfaces/            # 公共接口
│   ├── middleware/            # 中间件
│   └── pipes/                 # 管道
├── config/                    # 配置文件
│   ├── database.config.ts
│   ├── app.config.ts
│   └── index.ts
├── modules/                   # 业务模块
│   ├── users/
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   └── auth/
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── auth.module.ts
│       ├── strategies/
│       ├── guards/
│       └── decorators/
├── shared/                    # 共享模块
│   └── shared.module.ts
└── database/                  # 数据库配置
    ├── migrations/
    └── seeds/
```

**关键原则：**

- 使用模块化架构，每个功能独立成模块
- 遵循单一职责原则
- DTO 与 Entity 分离
- 公共逻辑抽取到 common 目录

### 3. 控制器（Controllers）最佳实践

**基础控制器模板：**

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
  UseGuards,
  UseInterceptors,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TransformInterceptor } from "../../common/interceptors/transform.interceptor";

@Controller("users")
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: QueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
```

**控制器最佳实践：**

- 控制器只负责请求分发，业务逻辑放在 Service
- 使用 DTO 进行参数验证
- 合理使用装饰器
- 统一使用 RESTful 风格的路由

### 4. 服务（Services/Providers）最佳实践

**基础服务模板：**

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async findAll(query: QueryDto): Promise<{ data: User[]; total: number }> {
    const { page = 1, limit = 10 } = query;
    const [data, total] = await this.usersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
```

### 5. 模块（Modules）最佳实践

**功能模块模板：**

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { User } from "./entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 导出以供其他模块使用
})
export class UsersModule {}
```

**模块组织原则：**

- 每个功能模块独立
- 通过 exports 共享服务
- 使用 imports 引入依赖

### 6. DTO 和验证最佳实践

**DTO 定义模板：**

```typescript
import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsEnum } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ description: "用户名", example: "john_doe" })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Transform(({ value }) => value?.toLowerCase())
  username: string;

  @ApiProperty({ description: "邮箱", example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "密码", minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: "用户角色", enum: ["user", "admin"] })
  @IsOptional()
  @IsEnum(["user", "admin"])
  role?: string;
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ["password"] as const)) {}
```

**全局验证管道配置：**

```typescript
// main.ts
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  await app.listen(3000);
}
bootstrap();
```

### 7. 管道（Pipes）最佳实践

**自定义管道示例：**

```typescript
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from "@nestjs/common";

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException("Validation failed");
    }
    return val;
  }
}
```

### 8. 守卫（Guards）最佳实践

**JWT 认证守卫：**

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
```

**角色守卫：**

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
```

**自定义装饰器：**

```typescript
// decorators/roles.decorator.ts
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// decorators/public.decorator.ts
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// 使用示例
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @Roles("admin")
  findAll() {
    // 只有 admin 角色可以访问
  }

  @Post("login")
  @Public()
  login() {
    // 公开接口，无需认证
  }
}
```

### 9. 拦截器（Interceptors）最佳实践

**响应转换拦截器：**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: "Success",
        data,
        timestamp: new Date().toISOString(),
      }))
    );
  }
}
```

**日志拦截器：**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`${method} ${url} - ${Date.now() - now}ms`);
      })
    );
  }
}
```

### 10. 异常过滤器（Exception Filters）最佳实践

**全局异常过滤器：**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : "Internal server error";

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : undefined
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

### 11. 数据库集成（TypeORM）最佳实践

**实体定义：**

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import * as bcrypt from "bcrypt";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: "user" })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}
```

**数据库配置：**

```typescript
// config/database.config.ts
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: "mysql",
  host: configService.get("DB_HOST", "localhost"),
  port: configService.get("DB_PORT", 3306),
  username: configService.get("DB_USERNAME", "root"),
  password: configService.get("DB_PASSWORD", ""),
  database: configService.get("DB_DATABASE", "test"),
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  synchronize: configService.get("NODE_ENV") !== "production",
  logging: configService.get("NODE_ENV") !== "production",
});

// app.module.ts
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { getDatabaseConfig } from "./config/database.config";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    // ...
  ],
})
export class AppModule {}
```

### 12. 配置管理最佳实践

**使用 @nestjs/config：**

```typescript
// config/app.config.ts
import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || "api",
}));

// config/index.ts
import appConfig from "./app.config";
import databaseConfig from "./database.config";

export default [appConfig, databaseConfig];

// 使用配置
@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    return this.configService.get("app.port");
  }
}
```

### 13. Swagger API 文档集成

**配置 Swagger：**

```typescript
// main.ts
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle("API Documentation")
    .setDescription("The API description")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(3000);
}
bootstrap();
```

### 14. 中间件（Middleware）最佳实践

**日志中间件：**

```typescript
import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on("finish", () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;
      this.logger.log(`${method} ${originalUrl} - ${statusCode} - ${responseTime}ms`);
    });

    next();
  }
}

// 在模块中配置
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
```

## ✅ 最佳实践清单

- [ ] 使用模块化架构组织代码
- [ ] 控制器只负责请求分发，业务逻辑放在 Service
- [ ] 使用 DTO 进行数据验证和类型约束
- [ ] 合理使用 Guard、Interceptor、Pipe、Filter
- [ ] 统一的异常处理和响应格式
- [ ] 使用 TypeORM 或 Mongoose 管理数据库
- [ ] 配置 Swagger 自动生成 API 文档
- [ ] 使用环境变量管理配置
- [ ] 编写单元测试和 e2e 测试
- [ ] 使用 ESLint 和 Prettier 保持代码风格统一

## 🚫 常见错误避免

1. **不要在控制器中写业务逻辑**
   - ❌ 在控制器方法中直接操作数据库
   - ✅ 控制器只负责请求分发，业务逻辑放在 Service

2. **不要忽略错误处理**
   - ❌ 不处理可能的异常
   - ✅ 使用 try-catch 或异常过滤器统一处理

3. **不要在循环中执行数据库查询**
   - ❌ 在 for 循环中多次调用 find
   - ✅ 使用 IN 查询或 join 一次性获取

4. **不要忘记验证输入数据**
   - ❌ 直接使用 request body
   - ✅ 使用 DTO 和 class-validator 验证

5. **不要硬编码配置**
   - ❌ 直接在代码中写死数据库连接字符串
   - ✅ 使用环境变量和 ConfigService

## 📖 参考资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [NestJS 中文文档](https://nestjs.bootcss.com/)
- [TypeORM 文档](https://typeorm.io/)
- [class-validator 文档](https://github.com/typestack/class-validator)

## 💡 使用提示

1. **开始新项目时**：参考"项目初始化和配置"部分
2. **架构设计时**：参考"项目结构最佳实践"
3. **开发 API 时**：参考"控制器"和"服务"最佳实践
4. **实现认证时**：参考"守卫"和"JWT 认证"示例
5. **错误处理时**：参考"异常过滤器"最佳实践

## 版本信息

- NestJS 版本: 10.x
- Node.js 版本: 18+
- 文档更新日期: 2026-03-04
