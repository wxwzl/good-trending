---
name: setup-monorepo-tooling
description: 为 monorepo 仓库添加或补充最新的 commitlint、husky、lint-staged、prettier、turbo 配置，以及变动检测脚本，支持自动创建 monorepo 基础文件（pnpm-workspace.yaml, tsconfig.json 等），自动检测并安装 Turbo，生成按包进行 lint-staged 检查的配置，以及创建 detect-changes.cjs 脚本。
---

# Setup Monorepo Tooling

为 monorepo 仓库添加或补充最新的 commitlint、husky、lint-staged、prettier、turbo 配置，以及变动检测脚本。

## 功能

- **检测并创建 monorepo 基础文件** (pnpm-workspace.yaml, tsconfig.json 等)
- **检测并安装 Turbo** (自动检测、安装并配置 turbo.json)
- 自动检测项目包管理器 (pnpm/yarn/npm)
- 扫描 monorepo 结构 (apps/packages)
- 安装最新版本的依赖
- 生成按包进行 lint-staged 检查的配置
- 创建变动检测脚本 detect-changes.cjs

## 执行步骤

### 1. 检测项目环境

首先检测项目的包管理器和 monorepo 结构：

```bash
# 检测包管理器
cat package.json | grep -E '"packageManager"|"workspaces"'

# 检测锁文件
ls -la | grep -E "pnpm-lock|yarn.lock|package-lock"

# 检测 monorepo 结构
ls -d apps/* packages/* 2>/dev/null
```

### 1.1 检测并创建 Monorepo 基础文件

检查项目是否具备 monorepo 所需的基础文件，如果缺失则创建：

#### 1.1.1 pnpm-workspace.yaml (pnpm monorepo 必需)

检查文件是否存在，不存在则创建：

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

#### 1.1.2 tsconfig.json 和 tsconfig.base.json

**tsconfig.base.json** (基础配置):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "removeComments": true,
    "noEmit": false,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

**tsconfig.json** (项目根配置):

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "exclude": ["node_modules", "dist", "**/dist", "**/node_modules"]
}
```

#### 1.1.3 .gitignore 增强

检查 .gitignore 是否包含 monorepo 相关的忽略规则：

```gitignore
# 依赖
node_modules
.pnp
.pnp.js

# 构建输出
dist
build
.next
out

# Turbo
.turbo

# 测试
coverage

# 环境变量
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 日志
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# 编辑器
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea

# 系统文件
.DS_Store
Thumbs.db
```

#### 1.1.4 package.json workspaces 配置

如果使用 yarn 或 npm，需要在 package.json 中配置 workspaces：

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

#### 1.1.5 创建基础目录结构

```bash
# 创建 monorepo 标准目录
mkdir -p apps packages scripts
```

### 1.2 检测并安装 Turbo

#### 1.2.1 检测 Turbo 是否已安装

```bash
# 检查 package.json 中是否有 turbo 依赖
cat package.json | grep '"turbo"'

# 检查 turbo.json 是否存在
ls turbo.json 2>/dev/null

# 检查是否有 .turbo 目录
ls -d .turbo 2>/dev/null
```

#### 1.2.2 安装 Turbo

**pnpm:**

```bash
pnpm add -Dw turbo
```

**yarn:**

```bash
yarn add -D -W turbo
```

**npm:**

```bash
npm install -D turbo
```

#### 1.2.3 创建 turbo.json

根据项目结构生成 turbo.json 配置：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "lint:fix": {
      "dependsOn": ["^build"]
    },
    "format": {
      "dependsOn": ["^build"]
    },
    "format:check": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "test:coverage": {
      "dependsOn": ["^build"]
    },
    "test:api": {
      "dependsOn": ["^build"]
    },
    "test:e2e": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

#### 1.2.4 更新 .gitignore 添加 Turbo 缓存

确保 .gitignore 包含：

```gitignore
# Turbo
.turbo
```

#### 1.2.5 更新 package.json scripts

如果不存在，添加 turbo 相关的 scripts：

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "format": "turbo run format",
    "format:check": "turbo run format:check",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "test:coverage": "turbo run test:coverage",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean"
  }
}
```

### 2. 安装依赖

根据检测到的包管理器安装依赖：

**pnpm (推荐):**

```bash
pnpm add -Dw @commitlint/cli @commitlint/config-conventional husky lint-staged prettier commitizen cz-customizable
```

**yarn:**

```bash
yarn add -D -W @commitlint/cli @commitlint/config-conventional husky lint-staged prettier commitizen cz-customizable
```

**npm:**

```bash
npm install -D @commitlint/cli @commitlint/config-conventional husky lint-staged prettier commitizen cz-customizable
```

### 3. 创建配置文件

#### 3.1 commitlint.config.js

在项目根目录创建 `commitlint.config.js`:

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // 新特性
        "fix", // 修复问题
        "docs", // 文档修改
        "perf", // 提升性能的修改
        "style", // 代码格式修改, 注意不是 css 修改
        "refactor", // 代码重构
        "test", // 测试用例修改
        "chore", // 其他修改, 比如构建流程, 依赖管理
        "revert", // 代码回滚
        "types", // 类型定义文件更改
      ],
    ],
    "type-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "subject-full-stop": [0, "never"],
    "subject-case": [0, "never"],
  },
};
```

#### 3.2 .prettierrc

在项目根目录创建 `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "jsxSingleQuote": false,
  "quoteProps": "as-needed",
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "vueIndentScriptAndStyle": false
}
```

#### 3.3 .cz-config.js

在项目根目录创建 `.cz-config.js`（根据项目实际结构动态生成 scopes）:

```javascript
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
  // 根据项目结构动态生成 scopes
  scopes: [], // 需要根据实际项目填充
  allowCustomScopes: true,
  allowBreakingChanges: ["feat", "fix"],
  skipQuestions: ["footer"],
  subjectLimit: 100,
};
```

#### 3.4 .lintstagedrc.json

根据项目结构动态生成 `.lintstagedrc.json`，按包进行 lint-staged 检查:

```json
{
  "apps/admin-web/**/*.{ts,tsx,vue}": [
    "pnpm --filter admin-web run lint:staged",
    "pnpm --filter admin-web run format:staged"
  ],
  "apps/admin-web/**/*.{css,scss,vue}": [
    "pnpm --filter admin-web run stylelint:staged",
    "pnpm --filter admin-web run format:staged"
  ],
  "apps/user-web/**/*.{ts,tsx}": ["pnpm --filter user-web run lint:staged"],
  "*.{json,md}": ["prettier --write"]
}
```

**重要:** 需要扫描 apps 和 packages 目录，识别包目录，为每个包生成对应的 lint-staged 规则。

### 4. 配置 Husky

#### 4.1 初始化 Husky

```bash
# 初始化 husky (会创建 .husky 目录)
pnpm exec husky init
# 或者手动创建
mkdir -p .husky
```

#### 4.2 创建 Git Hooks

**`.husky/commit-msg`:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm commitlint --edit $1
```

**`.husky/pre-commit`:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

### 5. 创建 detect-changes.cjs 脚本

在 `scripts/` 目录创建 `detect-changes.cjs`:

```javascript
#!/usr/bin/env node

const { execSync } = require("child_process");

// 获取变更的文件
const changedFiles = execSync("git diff --name-only HEAD~1 HEAD", {
  encoding: "utf-8",
})
  .split("\n")
  .filter(Boolean);

// 路径映射规则 - 根据项目实际结构动态生成
const projectMapping = {
  // 示例，需要根据实际项目结构调整
  "apps/user-web": {
    projects: ["user-web"],
    testCommands: ["test"],
  },
  "apps/admin-web": {
    projects: ["admin-web"],
    testCommands: ["test"],
  },
  "packages/": {
    projects: [], // 需要填充受影响的项目
    testCommands: ["test"],
  },
};

// 不触发测试的文件模式
const ignorePatterns = [
  /^docs\//,
  /^\.vscode\//,
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
];

// 检测受影响的项目
function detectAffectedProjects(files) {
  const affectedProjects = new Set();
  const testCommands = new Set();

  // 如果全是忽略文件,返回空
  const hasCodeChanges = files.some(
    (file) => !ignorePatterns.some((pattern) => pattern.test(file))
  );

  if (!hasCodeChanges) {
    return { projects: [], commands: [] };
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
        break;
      }
    }
  });

  return {
    projects: Array.from(affectedProjects),
    commands: Array.from(testCommands),
  };
}

const result = detectAffectedProjects(changedFiles);

// 输出结果供CI使用
if (result.projects.length > 0) {
  console.log("AFFECTED_PROJECTS=" + result.projects.join(","));
  console.log("TEST_COMMANDS=" + result.commands.join(","));
  console.log("");
  console.log("检测到代码变更,需要运行的测试:");
  console.log("受影响的项目:", result.projects.join(", "));
  console.log("测试命令:", result.commands.join(", "));
  process.exit(0);
} else {
  console.log("No testable changes detected");
  console.log("仅文档/配置变更,跳过测试");
  process.exit(0);
}
```

### 6. 更新 package.json

在根目录 `package.json` 中添加必要的 scripts:

```json
{
  "scripts": {
    "prepare": "husky",
    "commit": "cz",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test:affected": "node scripts/detect-changes.cjs"
  },
  "config": {
    "commitizen": {
      "path": "./node_modules/cz-customizable"
    },
    "cz-customizable": {
      "config": ".cz-config.js"
    }
  }
}
```

### 7. 子包 lint-staged 脚本

确保每个子包的 `package.json` 包含以下脚本：

```json
{
  "scripts": {
    "lint:staged": "eslint --fix",
    "format:staged": "prettier --write",
    "stylelint:staged": "stylelint --fix"
  }
}
```

## 执行流程

1. **检测环境**: 确定包管理器和 monorepo 结构，识别包目录
2. **检测 Monorepo 基础文件**:
   - 检查 pnpm-workspace.yaml (pnpm) 或 workspaces 配置 (yarn/npm)
   - 检查 tsconfig.json 和 tsconfig.base.json
   - 检查并更新 .gitignore
   - 创建 apps 和 packages 目录（如果不存在）
3. **检测并安装 Turbo**:
   - 检查 turbo 依赖和 turbo.json
   - 安装 turbo（如果需要）
   - 创建或更新 turbo.json
   - 更新 package.json scripts
4. **扫描项目**: 识别包目录下的所有子包
5. **安装依赖**: 安装所需的 devDependencies (commitlint, husky, lint-staged, prettier 等)
6. **生成配置**:
   - 创建 commitlint.config.js
   - 创建 .prettierrc
   - 根据子包结构生成 .cz-config.js 的 scopes
   - 根据子包结构生成 .lintstagedrc.json
7. **配置 Git Hooks**:
   - 初始化 husky
   - 创建 commit-msg 和 pre-commit hooks
8. **创建脚本**: 在 scripts/ 目录创建 detect-changes.cjs
9. **更新 package.json**: 添加必要的 scripts 和 config
10. **检查子包**: 确保每个子包有 lint:staged 和 format:staged 脚本

## 注意事项

1. **Monorepo 基础文件**:
   - 优先检测并创建 pnpm-workspace.yaml (pnpm) 或 workspaces (yarn/npm)
   - 如果 tsconfig.json 已存在，检查是否需要更新而不是覆盖
   - 确保 .gitignore 包含 monorepo 相关的忽略规则
2. **Turbo 配置**:
   - 如果项目已有 turbo，检查版本是否需要更新
   - turbo.json 的 tasks 应根据项目实际的 scripts 动态生成
   - 确保 .turbo 目录已添加到 .gitignore
3. **包管理器适配**: 根据 pnpm/yarn/npm 使用不同的命令语法
4. **现有配置保留**: 如果配置文件已存在，询问用户是否覆盖或合并
5. **动态生成**: .lintstagedrc.json 和 .cz-config.js 需要根据实际项目结构动态生成
6. **脚本命名一致性**: 确保子包的脚本名称与 .lintstagedrc.json 中引用的名称一致
7. **Windows 兼容**: Git hooks 在 Windows 上可能需要特殊处理

## 验证步骤

配置完成后，验证各个功能：

### 验证 Monorepo 基础结构

```bash
# 检查基础文件是否存在
ls pnpm-workspace.yaml tsconfig.json tsconfig.base.json

# 检查目录结构
ls -d apps packages scripts

# 检查 .gitignore
cat .gitignore | grep -E "node_modules|\.turbo|dist"
```

### 验证 Turbo 配置

```bash
# 检查 turbo 是否安装
pnpm turbo --version  # 或 yarn turbo --version / npx turbo --version

# 检查 turbo.json 是否存在
ls turbo.json

# 测试 turbo 命令
pnpm turbo run build --dry-run  # 预览构建任务图

# 运行一个简单的 turbo 命令测试
pnpm lint
```

### 验证 Git Hooks

```bash
# 测试 husky 是否正常
echo "test: verify husky" > test.txt
git add test.txt
git commit -m "invalid commit message"  # 应该失败
git commit -m "test: verify husky setup"  # 应该成功

# 测试 lint-staged
# 修改一个文件并提交，观察 lint-staged 是否运行
```

### 验证变动检测脚本

```bash
# 测试 detect-changes
pnpm test:affected
# 或
node scripts/detect-changes.cjs
```

### 完整测试流程

```bash
# 1. 安装依赖
pnpm install

# 2. 运行 lint
pnpm lint

# 3. 运行格式检查
pnpm format:check

# 4. 运行类型检查
pnpm typecheck

# 5. 运行构建
pnpm build

# 6. 提交测试
git add .
git commit -m "test: verify setup"
```
