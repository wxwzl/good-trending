module.exports = {
  types: [
    { value: "feat", name: "feat:     ✨  新特性" },
    { value: "fix", name: "fix:      🐛  修复问题" },
    { value: "docs", name: "docs:     📝  文档修改" },
    { value: "perf", name: "perf:     ⚡️  提升性能的修改" },
    { value: "style", name: "style:    💄  代码格式修改" },
    { value: "refactor", name: "refactor: ♻️   代码重构" },
    { value: "test", name: "test:     ✅  测试用例修改" },
    { value: "chore", name: "chore:    🔧  其他修改" },
    { value: "revert", name: "revert:   ⏪️  代码回滚" },
    { value: "types", name: "types:    📎  类型定义文件更改" },
  ],
  scopes: [
    // Apps
    { value: "api", name: "api:        NestJS API 服务" },
    { value: "crawler", name: "crawler:    爬虫服务" },
    { value: "scheduler", name: "scheduler:  调度器服务" },
    { value: "tests", name: "tests:      E2E/API 测试" },
    { value: "web", name: "web:        Next.js Web 应用" },
    // Packages
    { value: "database", name: "database:   drizzle 数据库包" },
    { value: "shared", name: "shared:     共享工具和类型" },
    { value: "eslint-config", name: "eslint:     ESLint 配置包" },
    // Root
    { value: "root", name: "root:       根配置/依赖" },
    { value: "docker", name: "docker:     Docker 配置" },
    { value: "ci", name: "ci:         CI/CD 配置" },
  ],
  allowCustomScopes: true,
  allowBreakingChanges: ["feat", "fix"],
  skipQuestions: ["footer"],
  subjectLimit: 100,
};
