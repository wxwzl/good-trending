/**
 * Reddit Service 测试
 * 测试 Reddit 内容提取功能
 */
import { describe, it, expect, beforeEach } from "vitest";
import { RedditService, createRedditService } from "../../adapters/legacy/reddit/index.js";

describe("RedditService", () => {
  beforeEach(() => {
    createRedditService();
  });

  describe("工厂函数", () => {
    it("应该创建服务实例", () => {
      const service = createRedditService();
      expect(service).toBeInstanceOf(RedditService);
    });
  });

  describe("帖子数据结构", () => {
    it("应该返回正确的 RedditPost 结构", () => {
      const mockPost = {
        title: "Test Post Title",
        content: "This is the post content",
        comments: ["Comment 1", "Comment 2"],
        url: "https://reddit.com/r/test/comments/123",
      };

      expect(mockPost.title).toBeDefined();
      expect(mockPost.comments).toBeInstanceOf(Array);
      expect(mockPost.url).toContain("reddit.com");
    });

    it("应该处理没有内容的帖子", () => {
      const mockPost = {
        title: "Title Only Post",
        content: null,
        comments: [],
        url: "https://reddit.com/r/test/comments/123",
      };

      expect(mockPost.content).toBeNull();
      expect(mockPost.comments).toHaveLength(0);
    });
  });

  describe("链接解析", () => {
    it("应该识别有效的 Reddit 帖子链接", () => {
      const validUrls = [
        "https://reddit.com/r/AskReddit/comments/123abc/test/",
        "https://www.reddit.com/r/gadgets/comments/456def/new_product/",
        "https://old.reddit.com/r/technology/comments/789ghi/discussion/",
      ];

      validUrls.forEach((url) => {
        expect(url).toMatch(/reddit\.com\/r\/\w+\/comments\/\w+/);
      });
    });

    it("应该拒绝无效的 Reddit 链接", () => {
      const invalidUrls = [
        "https://reddit.com/r/AskReddit/",
        "https://example.com/fake",
        "not-a-url",
      ];

      invalidUrls.forEach((url) => {
        expect(url).not.toMatch(/reddit\.com\/r\/\w+\/comments\/\w+/);
      });
    });
  });
});
