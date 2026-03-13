/**
 * 反检测脚本
 * 用于隐藏 Playwright 自动化特征
 *
 * 从现有 services/google-search-service.ts 提取
 */

/**
 * 获取用于 addInitScript 的反检测函数
 * 在页面加载前注入，隐藏 webdriver 等自动化特征
 */
export const getStealthInitFunction = () => {
  return () => {
    // 覆盖 navigator.webdriver
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    // 覆盖 permissions API
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = async (parameters: any) => {
      if (parameters.name === "notifications") {
        return { state: "default" } as unknown as PermissionStatus;
      }
      return originalQuery.call(window.navigator.permissions, parameters);
    };

    // 伪装 plugins
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    // 伪装 languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  };
};

/**
 * 预构建的注入脚本字符串（用于 Playwright addScriptTag）
 */
export const getStealthScriptString = (): string => {
  return `
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = async (parameters) => {
      if (parameters.name === 'notifications') {
        return { state: 'default' };
      }
      return originalQuery.call(window.navigator.permissions, parameters);
    };

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  `;
};

/**
 * 反检测脚本对象（用于组织导出）
 */
export const STEALTH_SCRIPTS = {
  webdriver: () => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  },
  permissions: () => {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = async (parameters: any) => {
      if (parameters.name === "notifications") {
        return { state: "default" } as unknown as PermissionStatus;
      }
      return originalQuery.call(window.navigator.permissions, parameters);
    };
  },
  plugins: () => {
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  },
  languages: () => {
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  },
};
