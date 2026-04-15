export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
  pages: ['pages/index/index', 'pages/stats/index', 'pages/settings/index'],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '牛马工时记录器',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#1890ff',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '打卡',
        iconPath: 'assets/icons/clock.png',
        selectedIconPath: 'assets/icons/clock-active.png',
      },
      {
        pagePath: 'pages/stats/index',
        text: '统计',
        iconPath: 'assets/icons/stats.png',
        selectedIconPath: 'assets/icons/stats-active.png',
      },
      {
        pagePath: 'pages/settings/index',
        text: '设置',
        iconPath: 'assets/icons/settings.png',
        selectedIconPath: 'assets/icons/settings-active.png',
      },
    ],
  },
})
