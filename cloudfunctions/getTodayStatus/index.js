"use strict";
// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
// 北京时间偏移量 (UTC+8)
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
// 获取北京时间的今天 00:00:00 (UTC+8)
// 云函数运行在 UTC 时区，需要手动转换
function getToday() {
    const now = new Date();
    // 转换为北京时间
    const beijingTime = new Date(now.getTime() + BEIJING_OFFSET_MS);
    // 获取北京时间的年月日
    const year = beijingTime.getUTCFullYear();
    const month = beijingTime.getUTCMonth();
    const day = beijingTime.getUTCDate();
    // 返回北京时间当天 00:00:00 对应的 UTC 时间
    return new Date(Date.UTC(year, month, day) - BEIJING_OFFSET_MS);
}
// 判断是否是周末
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}
// 云函数入口函数
exports.main = async () => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const today = getToday();
    // 查询用户设置
    const userRes = await db
        .collection("users")
        .where({
        _openid: openid,
    })
        .get();
    const user = userRes.data[0];
    if (!user) {
        console.log("[getTodayStatus] User settings not found, using defaults");
    }
    const defaultStartTime = user?.defaultStartTime || "09:30";
    const defaultEndTime = user?.defaultEndTime || "18:30";
    // 查询今日打卡记录
    const recordRes = await db
        .collection("clock_records")
        .where({
        _openid: openid,
        date: today,
    })
        .get();
    const record = recordRes.data.length > 0 ? recordRes.data[0] : null;
    // 查询今天是否是节假日/调休工作日
    const holidayRes = await db
        .collection("holidays")
        .where({
        date: today,
    })
        .get();
    let isWorkday;
    if (holidayRes.data.length > 0) {
        // 有节假日记录，根据记录判断
        const holiday = holidayRes.data[0];
        isWorkday = holiday.type === "workday";
    }
    else {
        // 没有记录，按周末判断
        isWorkday = !isWeekend(today);
    }
    return {
        success: true,
        record,
        isWorkday,
        defaultStartTime,
        defaultEndTime,
    };
};
