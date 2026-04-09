"use strict";
// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
// 获取今天 00:00:00 的时间
function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
