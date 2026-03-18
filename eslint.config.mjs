import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  typescript: true,
  stylistic: {
    quotes: 'single',
  },
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
    'client/src/assets/**',
    'cloudfunctions/**/*.js', // 忽略编译产物
    'scripts/**/*.js', // 忽略构建脚本
    'openspec/**/*.md', // 忽略 OpenSpec 文档
  ],
}, {
  // 云函数使用 CommonJS，忽略 require 相关规则
  files: ['cloudfunctions/**/*.ts'],
  rules: {
    'ts/no-require-imports': 'off',
    'node/prefer-global/process': 'off',
    'no-unmodified-loop-condition': 'off', // 云函数中有合法的 Date 循环
  },
}, {
  // Taro 入口文件需要用 process.env
  files: ['client/src/app.tsx'],
  rules: {
    'node/prefer-global/process': 'off',
  },
})
