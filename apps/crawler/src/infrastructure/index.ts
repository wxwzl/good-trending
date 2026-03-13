/**
 * 基础设施层统一导出
 * 包含浏览器配置、工具函数等公共代码
 */

// Browser 相关
export {
  getStealthInitFunction,
  getStealthScriptString,
  STEALTH_SCRIPTS,
} from "./browser/stealth-scripts.js";

export {
  DESKTOP_USER_AGENTS,
  getRandomUserAgent,
  getChromeUserAgent,
} from "./browser/user-agents.js";

// Utils 工具函数
export {
  DELAY_RANGES,
  randomDelay,
  requestDelay,
  humanDelay,
  antiDetectionDelay,
  scrollDelay,
} from "./utils/delay.js";
