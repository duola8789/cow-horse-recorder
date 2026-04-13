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
function getToday() {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + BEIJING_OFFSET_MS);
    const year = beijingTime.getUTCFullYear();
    const month = beijingTime.getUTCMonth();
    const day = beijingTime.getUTCDate();
    return new Date(Date.UTC(year, month, day) - BEIJING_OFFSET_MS);
}
// 获取当前北京时间的年月
function getCurrentYearMonth() {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + BEIJING_OFFSET_MS);
    return {
        year: beijingTime.getUTCFullYear(),
        month: beijingTime.getUTCMonth() + 1, // 1-12
    };
}
// 判断是否是周末
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}
// 校验日期格式 YYYY-MM-DD
function isValidDateFormat(dateStr) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr))
        return false;
    const date = new Date(dateStr);
    return !Number.isNaN(date.getTime());
}
// 校验时间格式 HH:mm
function isValidTimeFormat(timeStr) {
    const regex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    return regex.test(timeStr);
}
// 将日期字符串转换为当天 00:00:00 的 Date 对象 (UTC)
function parseDateString(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    // 返回北京时间当天 00:00:00 对应的 UTC 时间
    return new Date(Date.UTC(year, month - 1, day) - BEIJING_OFFSET_MS);
}
// 将时间字符串转换为指定日期的 Date 对象
// timeStr: "HH:mm" 格式的北京时间
// baseDate: 目标日期 (北京时间 00:00:00 对应的 UTC 时间)
function parseTimeString(timeStr, baseDate) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    // baseDate 是北京时间当天 00:00:00 对应的 UTC 时间
    // 例如: 北京时间 2026-04-09 00:00:00 = UTC 2026-04-08 16:00:00
    // 我们需要得到: 北京时间 2026-04-09 08:45:00 = UTC 2026-04-09 00:45:00
    // 计算: baseDate + hours*60min + minutes - 8h (因为 baseDate 已经是 UTC-8)
    // 简化: baseDate + (hours - 8)*60*60*1000 + minutes*60*1000
    // 更简单: baseDate + hours*60*60*1000 + minutes*60*1000
    // 因为 baseDate 是北京时间 00:00 对应的 UTC，加上 hours 和 minutes 就是北京时间对应的 UTC
    const result = new Date(baseDate.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);
    return result;
}
// 云函数入口函数
exports.main = async (event) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { date, startTime, endTime, status } = event;
    // ========== 参数校验 ==========
    // 校验 date
    if (typeof date !== "string" || !isValidDateFormat(date)) {
        return { success: false, error: "Invalid date format" };
    }
    // 校验 status
    if (status !== "normal" && status !== "leave") {
        return { success: false, error: "Invalid status" };
    }
    // 正常状态下校验时间
    if (status === "normal") {
        // startTime 和 endTime 必须提供
        if (typeof startTime !== "string" || !isValidTimeFormat(startTime)) {
            return { success: false, error: "Invalid start time format" };
        }
        if (typeof endTime !== "string" || !isValidTimeFormat(endTime)) {
            return { success: false, error: "Invalid end time format" };
        }
        // 校验 startTime < endTime
        if (startTime >= endTime) {
            return { success: false, error: "Start time must be before end time" };
        }
    }
    // ========== 日期范围校验 ==========
    const targetDate = parseDateString(date);
    const today = getToday();
    const currentYM = getCurrentYearMonth();
    // 解析目标日期的年月
    const [targetYear, targetMonth] = date.split("-").map(Number);
    // 校验是否在当月
    if (targetYear !== currentYM.year || targetMonth !== currentYM.month) {
        return { success: false, error: "Can only edit current month records" };
    }
    // 校验不能编辑未来日期
    if (targetDate.getTime() > today.getTime()) {
        return { success: false, error: "Cannot edit future dates" };
    }
    // ========== 工作日校验 ==========
    // 查询是否有节假日/调休配置
    // 使用范围查询，与 clock_records 查询方式保持一致
    const _ = db.command;
    const dayStart = targetDate;
    const dayEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    const holidayRes = await db
        .collection("holidays")
        .where({
        date: _.gte(dayStart).and(_.lte(dayEnd)),
    })
        .get();
    const holiday = holidayRes.data[0];
    // 判断是否是工作日
    let isWorkday = false;
    if (holiday?.type === "workday") {
        isWorkday = true;
    }
    else if (holiday?.type === "holiday") {
        isWorkday = false;
    }
    else if (!isWeekend(targetDate)) {
        isWorkday = true;
    }
    if (!isWorkday) {
        return { success: false, error: "Cannot edit rest days" };
    }
    // ========== 查询/更新记录 ==========
    const now = new Date();
    // 查询现有记录
    // 使用范围查询而不是精确匹配，避免毫秒级差异导致查询失败
    const recordRes = await db
        .collection("clock_records")
        .where({
        _openid: openid,
        date: _.gte(dayStart).and(_.lte(dayEnd)),
    })
        .get();
    const existingRecord = recordRes.data[0];
    // 准备更新数据
    let startTimeDate = null;
    let endTimeDate = null;
    if (status === "normal") {
        startTimeDate = parseTimeString(startTime, targetDate);
        endTimeDate = parseTimeString(endTime, targetDate);
    }
    let record;
    if (existingRecord) {
        // 更新现有记录
        await db
            .collection("clock_records")
            .doc(existingRecord._id)
            .update({
            data: {
                startTime: startTimeDate,
                endTime: endTimeDate,
                startFrom: "clock",
                endFrom: "clock",
                status,
                updatedAt: now,
            },
        });
        record = {
            ...existingRecord,
            startTime: startTimeDate,
            endTime: endTimeDate,
            startFrom: "clock",
            endFrom: "clock",
            status,
            updatedAt: now,
        };
    }
    else {
        // 创建新记录
        const newRecord = {
            _openid: openid,
            date: targetDate,
            startTime: startTimeDate,
            endTime: endTimeDate,
            startFrom: "clock",
            endFrom: "clock",
            status,
            createdAt: now,
            updatedAt: now,
        };
        const addRes = await db.collection("clock_records").add({
            data: newRecord,
        });
        record = {
            _id: addRes._id,
            ...newRecord,
        };
    }
    return {
        success: true,
        record,
    };
};
