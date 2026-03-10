# LinkButton 组件

结合 Next.js Link 预加载和 router.push 编程式导航的自定义组件。

## 背景

### 问题

- `<Link>` 组件有预加载功能，但无法自定义点击逻辑
- `router.push` 可以自定义逻辑，但没有预加载功能

### 解决方案

`LinkButton` 结合两者优点：

1. 使用 `<Link prefetch>` 在视口内预加载资源
2. 点击时阻止默认行为，执行自定义逻辑
3. 使用 `router.push` 从缓存导航，实现"瞬间跳转"

## 使用

### 基础用法

```tsx
import { LinkButton } from "@/components/ui/link-button";

<LinkButton href="/trending">查看热门</LinkButton>;
```

### 带自定义点击逻辑

```tsx
<LinkButton
  href="/product/123"
  onClick={(e) => {
    // 返回 false 阻止导航
    if (!isLoggedIn) {
      showLoginModal();
      return false;
    }
    // 埋点
    analytics.track("product_click", { id: "123" });
  }}
>
  查看商品
</LinkButton>
```

### 替换历史记录

```tsx
<LinkButton href="/new-page" replace>
  替换当前页面
</LinkButton>
```

## 适用场景

| 场景                            | 推荐方案            |
| ------------------------------- | ------------------- |
| Server Component                | 保持使用普通 `Link` |
| Client Component 需要预加载优化 | 使用 `LinkButton`   |
| 需要自定义点击逻辑              | 使用 `LinkButton`   |
| 简单链接无需优化                | 使用普通 `Link`     |

## 已替换的组件

- `ProductCard` - 商品卡片
- `TopicCard` - 分类卡片
- `not-found.tsx` - 404 页面
- `error.tsx` - 错误页面

## 工作原理

```
视口内 -> <Link prefetch> 自动预加载资源 -> 存入缓存

点击 -> 阻止默认行为 -> 执行自定义逻辑 -> router.push 从缓存读取 -> 瞬间跳转
```

## API

```typescript
interface LinkButtonProps {
  href: string; // 目标路径
  children: ReactNode; // 子元素
  className?: string; // 样式类名
  onClick?: (e) => void | boolean; // 点击回调，返回 false 阻止导航
  prefetch?: boolean; // 是否预加载，默认 true
  scroll?: boolean; // 是否滚动到顶部，默认 true
  replace?: boolean; // 是否替换历史，默认 false
  locale?: string; // 目标语言
}
```
