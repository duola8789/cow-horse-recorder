"use strict";
// 云函数入口文件
const cloud = require("wx-server-sdk");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
const _ = db.command;
// 判断是否是周末
function isWeekend(dateStr) {
    const day = dayjs(dateStr).day();
    return day === 0 || day === 6;
}
// 将时间字符串 "HH:mm" 转为指定日期的 Date 对象（北京时间）
function parseTimeToDate(timeStr, dateStr) {
    return dayjs.tz(`${dateStr} ${timeStr}`, "Asia/Shanghai").toDate();
}
// 计算两个时间之间的分钟数
function diffMinutes(start, end) {
    return Math.round((end.getTime() - start.getTime()) / 1000 / 60);
}
// 云函数入口函数
exports.main = async (event) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { year, month } = event;
    const today = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");
    const monthStart = dayjs()
        .year(year)
        .month(month - 1)
        .date(1)
        .format("YYYY-MM-DD");
    const monthEnd = dayjs()
        .year(year)
        .month(month - 1)
        .endOf("month")
        .format("YYYY-MM-DD");
    // T+1: 统计截止到昨天
    const statsEndDate = dayjs(today).subtract(1, "day").format("YYYY-MM-DD");
    // 如果统计截止日期早于月初，说明本月还没开始统计
    if (statsEndDate < monthStart) {
        return {
            success: true,
            totalWorkDays: 0,
            recordedDays: 0,
            totalHours: 0,
            avgHoursPerDay: 0,
        };
    }
    // 实际统计结束日期（取月末和昨天的较小值）
    const actualEndDate = statsEndDate < monthEnd ? statsEndDate : monthEnd;
    // 获取用户设置
    const userRes = await db
        .collection("users")
        .where({
        _openid: openid,
    })
        .get();
    const user = userRes.data[0];
    const defaultStartTime = user?.defaultStartTime || "09:30";
    const defaultEndTime = user?.defaultEndTime || "18:30";
    // 获取本月的节假日数据
    const holidayRes = await db
        .collection("holidays")
        .where({
        date: _.gte(monthStart).and(_.lte(actualEndDate)),
    })
        .get();
    const holidays = holidayRes.data;
    const holidayMap = new Map(holidays.map((h) => [h.date, h.type]));
    // 计算工作日列表
    const workdays = [];
    let current = dayjs(monthStart);
    while (current.format("YYYY-MM-DD") <= actualEndDate) {
        const dateKey = current.format("YYYY-MM-DD");
        const holidayType = holidayMap.get(dateKey);
        if (holidayType === "workday") {
            // 调休工作日
            workdays.push(dateKey);
        }
        else if (holidayType === "holiday") {
            // 节假日，不是工作日
        }
        else if (!isWeekend(dateKey)) {
            // 普通工作日（周一到周五）
            workdays.push(dateKey);
        }
        current = current.add(1, "day");
    }
    // 获取打卡记录
    const recordRes = await db
        .collection("clock_records")
        .where({
        _openid: openid,
        date: _.gte(monthStart).and(_.lte(actualEndDate)),
        status: "normal", // 只统计正常状态，排除请假
    })
        .get();
    const records = recordRes.data;
    const recordMap = new Map(records.map((r) => [r.date, r]));
    // 计算总工时
    let totalMinutes = 0;
    let recordedDays = 0;
    for (const workday of workdays) {
        const record = recordMap.get(workday);
        // 使用打卡时间或默认时间
        const startTime = record?.startTime
            ? new Date(record.startTime)
            : parseTimeToDate(defaultStartTime, workday);
        const endTime = record?.endTime
            ? new Date(record.endTime)
            : parseTimeToDate(defaultEndTime, workday);
        if (record?.startTime || record?.endTime) {
            recordedDays++;
        }
        const minutes = diffMinutes(startTime, endTime);
        if (minutes > 0) {
            totalMinutes += minutes;
        }
    }
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const avgHoursPerDay = workdays.length > 0
        ? Math.round((totalMinutes / 60 / workdays.length) * 100) / 100
        : 0;
    return {
        success: true,
        totalWorkDays: workdays.length,
        recordedDays,
        totalHours,
        avgHoursPerDay,
    };
};
