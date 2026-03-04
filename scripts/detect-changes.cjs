#!/usr/bin/env node

const { execSync } = require("child_process");

// 获取变更的文件
const changedFiles = execSync("git diff --name-only HEAD~1 HEAD", {
  encoding: "utf-8",
})
  .split("\n")
  .filter(Boolean);

// 路径映射规则 - 根据项目实际结构
const projectMapping = {
  // Apps
  "apps/api": {
    projects: ["api"],
    testCommands: ["test:unit"],
    affectedPackages: ["@good-trending/api"],
  },
  "apps/crawler": {
    projects: ["crawler"],
    testCommands: ["test:unit"],
    affectedPackages: ["@good-trending/crawler"],
  },
  "apps/scheduler": {
    projects: ["scheduler"],
    testCommands: ["test:unit"],
    affectedPackages: ["@good-trending/scheduler"],
  },
  "apps/web": {
    projects: ["web"],
    testCommands: ["test:e2e:web"],
    affectedPackages: ["@good-trending/web"],
  },
  "apps/tests": {
    projects: ["tests"],
    testCommands: ["test:api", "test:e2e"],
    affectedPackages: ["@good-trending/tests"],
  },
  // Packages - changes affect dependent apps
  "packages/database": {
    projects: ["api", "crawler", "scheduler", "tests"],
    testCommands: ["test:unit", "test:api"],
    affectedPackages: ["@good-trending/database", "@good-trending/api", "@good-trending/crawler", "@good-trending/scheduler", "@good-trending/tests"],
  },
  "packages/shared": {
    projects: ["api", "crawler", "scheduler", "web", "tests"],
    testCommands: ["test:unit", "test:api", "test:e2e"],
    affectedPackages: ["@good-trending/shared", "@good-trending/api", "@good-trending/crawler", "@good-trending/scheduler", "@good-trending/web", "@good-trending/tests"],
  }
};

// 不触发测试的文件模式
const ignorePatterns = [
  /^docs\//,
  /^\.vscode\//,
  /^\.idea\//,
  /\.md$/,
  /\.txt$/,
  /^\.prettierrc/,
  /^\.eslintrc/,
  /^\.stylelintrc/,
  /^\.cz-config/,
  /^commitlint\.config/,
  /^\.nvmrc/,
  /^\.gitignore/,
  /^\.prettierignore/,
  /^\.versionrc/,
  /^LICENSE/,
  /^CLAUDE\.md/,
  /^\.husky\//,
  /^scripts\/detect-changes/,
  /^\.lintstagedrc/,
  /^tsconfig\.base\.json/,
];

// 检测受影响的项目
function detectAffectedProjects(files) {
  const affectedProjects = new Set();
  const testCommands = new Set();
  const affectedPackages = new Set();

  // 如果全是忽略文件,返回空
  const hasCodeChanges = files.some(
    (file) => !ignorePatterns.some((pattern) => pattern.test(file))
  );

  if (!hasCodeChanges) {
    return { projects: [], commands: [], packages: [] };
  }

  files.forEach((file) => {
    // 跳过忽略文件
    if (ignorePatterns.some((pattern) => pattern.test(file))) {
      return;
    }

    // 匹配项目
    for (const [pattern, config] of Object.entries(projectMapping)) {
      if (file.startsWith(pattern)) {
        config.projects.forEach((p) => affectedProjects.add(p));
        config.testCommands.forEach((c) => testCommands.add(c));
        config.affectedPackages.forEach((p) => affectedPackages.add(p));
        break;
      }
    }

    // 根目录文件变更影响所有项目
    if (!file.includes("/")) {
      affectedProjects.add("root");
    }
  });

  return {
    projects: Array.from(affectedProjects),
    commands: Array.from(testCommands),
    packages: Array.from(affectedPackages),
  };
}

const result = detectAffectedProjects(changedFiles);

// 输出结果供CI使用
if (result.projects.length > 0 || result.packages.length > 0) {
  console.log("AFFECTED_PROJECTS=" + result.projects.join(","));
  console.log("TEST_COMMANDS=" + result.commands.join(","));
  console.log("AFFECTED_PACKAGES=" + result.packages.join(","));
  console.log("");
  console.log("检测到代码变更,需要运行的测试:");
  console.log("受影响的项目:", result.projects.join(", ") || "无");
  console.log("受影响的包:", result.packages.join(", ") || "无");
  console.log("测试命令:", result.commands.join(", ") || "无");
  process.exit(0);
} else {
  console.log("No testable changes detected");
  console.log("仅文档/配置变更,跳过测试");
  process.exit(0);
}
