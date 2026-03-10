"use client";

import { useCallback, type MouseEvent, type ReactNode } from "react";
import { Link, useRouter } from "@/i18n/routing";
import type { Route } from "next";

interface LinkButtonProps {
  href: Route | string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void | boolean;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
  locale?: string;
}

/**
 * LinkButton 组件
 *
 * @description
 * 结合 next-intl Link 的预加载能力和 router.push 的编程式导航。
 *
 * 工作原理：
 * 1. <Link> 组件在视口内时自动预加载目标页面资源
 * 2. 点击时通过 e.preventDefault() 阻止默认跳转
 * 3. 执行自定义逻辑（埋点、状态更新等）
 * 4. 使用 router.push 从缓存读取资源进行导航，实现"瞬间跳转"
 *
 * @example
 * // 基础用法
 * <LinkButton href="/trending">查看热门</LinkButton>
 *
 * @example
 * // 带自定义点击逻辑
 * <LinkButton
 *   href="/product/123"
 *   onClick={(e) => {
 *     // 返回 false 阻止导航
 *     if (!isLoggedIn) {
 *       showLoginModal();
 *       return false;
 *     }
 *     // 执行埋点
 *     analytics.track('product_click', { id: '123' });
 *   }}
 * >
 *   查看商品
 * </LinkButton>
 */
export function LinkButton({
  href,
  children,
  className,
  onClick,
  prefetch = true,
  scroll = true,
  replace = false,
  locale,
}: LinkButtonProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      // 阻止默认的 Link 跳转行为
      e.preventDefault();

      // 执行自定义逻辑
      // 如果 onClick 返回 false，则阻止后续导航
      if (onClick) {
        const shouldContinue = onClick(e);
        if (shouldContinue === false) {
          return;
        }
      }

      // 使用 router.push 进行导航
      // 会自动利用 Link 预加载的缓存资源
      const options = {
        scroll,
        ...(locale && { locale }),
      };

      if (replace) {
        router.replace(href, options);
      } else {
        router.push(href, options);
      }
    },
    [href, onClick, router, scroll, replace, locale]
  );

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      prefetch={prefetch}
      scroll={false} // 交给 router.push 处理
    >
      {children}
    </Link>
  );
}

/**
 * SmartLink 组件
 *
 * @description
 * 智能导航组件，根据 useClient 状态自动选择渲染方式：
 * - 有 onClick 或需要编程式导航时使用 LinkButton（客户端组件）
 * - 纯链接时使用普通 Link（服务端组件，更轻量）
 *
 * 由于需要处理点击事件，此组件始终为客户端组件。
 * 如果不需要自定义点击逻辑，建议直接使用 @/i18n/routing 的 Link。
 */
export function SmartLink({
  href,
  children,
  className,
  onClick,
  prefetch = true,
  scroll = true,
  replace = false,
  locale,
}: LinkButtonProps) {
  return (
    <LinkButton
      href={href}
      className={className}
      onClick={onClick}
      prefetch={prefetch}
      scroll={scroll}
      replace={replace}
      locale={locale}
    >
      {children}
    </LinkButton>
  );
}
