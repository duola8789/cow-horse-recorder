import antfu from "@antfu/eslint-config";

export default antfu(
  {
    react: true,
    typescript: true,
    stylistic: false, // 关闭所有代码格式相关的校验
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "client/src/assets/**",
      "cloudfunctions/**/*.js", // 忽略编译产物
      "scripts/**/*.js", // 忽略构建脚本
      "openspec/**/*.md", // 忽略 OpenSpec 文档
    ],
    rules: {
      "no-console": "off", // 允许 console
      "perfectionist/sort-imports": "off", // 使用 Prettier 管理 import 顺序
      "perfectionist/sort-named-imports": "off", // 使用 Prettier 管理 import 顺序
    },
  },
  {
    // 云函数使用 CommonJS，忽略 require 相关规则
    files: ["cloudfunctions/**/*.ts"],
    rules: {
      "ts/no-require-imports": "off",
      "node/prefer-global/process": "off",
      "no-unmodified-loop-condition": "off", // 云函数中有合法的 Date 循环
    },
  },
  {
    // Taro 入口文件需要用 process.env
    files: ["client/src/app.tsx"],
    rules: {
      "node/prefer-global/process": "off",
    },
  },
);
