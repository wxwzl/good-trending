# Next.js 16+ 最佳实践 Skill

基于 Next.js 官方文档 (https://nextjs.org/docs/app/getting-started) 的最佳实践指南。

## 概述

这个 skill 提供了使用 Next.js App Router 构建现代 web 应用的最佳实践指导。涵盖了从项目初始化、项目结构、路由管理、服务端与客户端组件、数据获取到缓存策略等核心内容。

## 核心原则

1. **默认使用 Server Components** - 减少客户端 JavaScript，提升性能
2. **文件系统路由** - 使用文件夹和文件定义路由结构
3. **流式渲染** - 使用 Suspense 和 loading.js 提升用户体验
4. **智能缓存** - 利用 Next.js 的缓存机制优化性能
5. **类型安全** - 使用 TypeScript 和内置类型辅助工具

## 主要特性

### 1. 项目结构

- App Router 目录结构
- 路由组织和布局嵌套
- 私有文件夹和路由组

### 2. 组件策略

- Server Components vs Client Components
- 何时使用每种组件类型
- 组合模式和最佳实践

### 3. 数据获取

- Server Components 中的数据获取
- 客户端数据获取策略
- 并行和串行数据获取

### 4. 缓存和重新验证

- fetch 缓存策略
- 使用 cacheTag 和 revalidateTag
- 路由级别的重新验证

### 5. 性能优化

- 图片优化
- 字体优化
- 代码分割和懒加载

## 使用方法

在开发 Next.js 项目时，激活此 skill 以获得最佳实践指导。它会帮助你：

- 做出正确的架构决策
- 遵循 Next.js 官方推荐的模式
- 避免常见的陷阱和错误
- 优化应用性能

## 版本信息

- Next.js 版本: 16.1.6+
- React 版本: 19+
- Node.js 最低版本: 20.9

## 文档来源

所有内容均来自 Next.js 官方文档: https://nextjs.org/docs/app/getting-started
