/**
 * 工厂层统一导出
 * 提供创建爬虫实例的工厂函数
 */

export {
  createGoogleSearch,
  type GoogleSearchInstance,
} from "./google-search.factory.js";

export {
  createReddit,
  createRedditWithPage,
  type RedditInstance,
} from "./reddit.factory.js";
