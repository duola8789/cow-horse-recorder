import type { UserConfigExport } from '@tarojs/cli'

export default {
  env: {
    NODE_ENV: '"production"',
  },
  defineConstants: {},
  // 生产环境移除 console 和 debugger
  terser: {
    enable: true,
    config: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  mini: {
    optimizeMainPackage: {
      enable: true,
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true,
    },
  },
  h5: {},
} satisfies UserConfigExport
