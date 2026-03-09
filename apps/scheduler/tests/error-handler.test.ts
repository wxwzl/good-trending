/**
 * 错误处理工具测试
 */
import { describe, it, expect } from "vitest";
import { formatError, safeExecute, wrapScheduledJob } from "../src/utils/error-handler.js";

describe("Error Handler", () => {
  describe("formatError", () => {
    it("应该正确格式化 Error 对象", () => {
      const error = new Error("Test error");
      const result = formatError(error);

      expect(result.message).toBe("Test error");
      expect(result.stack).toBeDefined();
    });

    it("应该正确格式化字符串错误", () => {
      const result = formatError("String error");

      expect(result.message).toBe("String error");
      expect(result.stack).toBeUndefined();
    });

    it("应该正确格式化数字错误", () => {
      const result = formatError(404);

      expect(result.message).toBe("404");
    });

    it("应该正确格式化 null", () => {
      const result = formatError(null);

      expect(result.message).toBe("null");
    });

    it("应该正确格式化 undefined", () => {
      const result = formatError(undefined);

      expect(result.message).toBe("undefined");
    });

    it("应该正确格式化对象", () => {
      const result = formatError({ foo: "bar" });

      expect(result.message).toBe("[object Object]");
    });
  });

  describe("safeExecute", () => {
    it("应该在成功时返回数据和 success: true", async () => {
      const operation = async () => "success";
      const result = await safeExecute(operation, "test");

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.error).toBeUndefined();
    });

    it("应该在失败时返回 error 和 success: false", async () => {
      const operation = async () => {
        throw new Error("Failed");
      };
      const result = await safeExecute(operation, "test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed");
      expect(result.data).toBeUndefined();
    });

    it("应该处理非 Error 类型的异常", async () => {
      const operation = async () => {
        throw "String error";
      };
      const result = await safeExecute(operation, "test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("String error");
    });
  });

  describe("wrapScheduledJob", () => {
    it("应该在成功时调用回调", async () => {
      let called = false;
      const callback = async () => {
        called = true;
      };

      const wrapped = wrapScheduledJob("test-job", callback);
      await wrapped();

      expect(called).toBe(true);
    });

    it("应该在失败时捕获错误", async () => {
      const callback = async () => {
        throw new Error("Job failed");
      };

      const wrapped = wrapScheduledJob("test-job", callback);
      // 不应该抛出错误
      await expect(wrapped()).resolves.not.toThrow();
    });
  });
});
