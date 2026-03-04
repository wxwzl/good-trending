# NestJS 最佳实践 Skill

NestJS 最佳实践指南。提供从项目初始化、模块化架构、控制器/服务设计、中间件、管道、守卫、拦截器到数据库集成的全面指导。

## 功能特性

- 📁 **项目结构**：标准化的目录结构和文件组织
- 🏗️ **模块化架构**：清晰的功能模块划分和依赖管理
- 🎮 **控制器开发**：RESTful API 最佳实践
- 💼 **服务层设计**：业务逻辑封装和依赖注入
- ✅ **数据验证**：DTO 定义和 class-validator 集成
- 🔐 **认证授权**：JWT 认证和角色权限控制
- 🗄️ **数据库集成**：TypeORM 配置和使用
- ⚡ **中间件/管道/守卫/拦截器**：完整的请求处理管道
- 🚨 **异常处理**：统一错误处理机制
- 📖 **API 文档**：Swagger 自动生成

## 快速开始

### 安装 NestJS CLI

```bash
npm i -g @nestjs/cli
```

### 创建新项目

```bash
nest new project-name
# 或使用 pnpm
pnpm create nest project-name
```

### 常用命令

```bash
# 生成模块
nest g module users

# 生成控制器
nest g controller users

# 生成服务
nest g service users

# 生成完整的资源（模块+控制器+服务+DTO+Entity）
nest g resource users
```

## 核心概念

### 1. 模块（Modules）

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### 2. 控制器（Controllers）

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

### 3. 服务（Services）

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }
}
```

### 4. DTO（数据传输对象）

```typescript
export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### 5. 守卫（Guards）

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 验证 JWT token
    return true;
  }
}
```

### 6. 拦截器（Interceptors）

```typescript
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: 'Success',
        data,
      })),
    );
  }
}
```

## 目录结构

```
src/
├── main.ts                    # 应用入口
├── app.module.ts              # 根模块
├── common/                    # 公共模块
│   ├── constants/             # 常量
│   ├── decorators/            # 装饰器
│   ├── dto/                   # 通用 DTO
│   ├── filters/               # 异常过滤器
│   ├── guards/                # 守卫
│   ├── interceptors/          # 拦截器
│   ├── middleware/            # 中间件
│   └── pipes/                 # 管道
├── config/                    # 配置文件
├── modules/                   # 业务模块
│   ├── users/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   └── auth/
└── shared/                    # 共享模块
```

## 最佳实践清单

- [x] 使用模块化架构组织代码
- [x] 控制器只负责请求分发
- [x] 使用 DTO 进行数据验证
- [x] 合理使用 Guard、Interceptor、Pipe、Filter
- [x] 统一的异常处理和响应格式
- [x] 使用 TypeORM 管理数据库
- [x] 配置 Swagger 自动生成 API 文档
- [x] 使用环境变量管理配置
- [x] 编写单元测试和 e2e 测试

## 触发关键词

- `nestjs` / `nest.js` / `nest`
- `nestjs controller` / `nestjs service` / `nestjs module`
- `nestjs 项目` / `创建 nest 应用`
- `nestjs pipe` / `nestjs guard` / `nestjs interceptor`

## 版本信息

- NestJS 版本: 10.x
- Node.js 版本: 18+
- 文档更新日期: 2026-03-04

## 参考资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [NestJS 中文文档](https://nestjs.bootcss.com/)
- [TypeORM 文档](https://typeorm.io/)
- [class-validator 文档](https://github.com/typestack/class-validator)
