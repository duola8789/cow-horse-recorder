"use strict";
// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
const _ = db.command;
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
// 格式化日期为 YYYY-MM-DD (用作 Map key，确保时间戳对比一致)
function formatDateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
// 格式化时间为 HH:mm (转换为北京时间 UTC+8)
function formatTime(date) {
    if (!date)
        return null;
    const d = new Date(date);
    // UTC+8 偏移
    const utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    const hours = String(utc8.getUTCHours()).padStart(2, "0");
    const minutes = String(utc8.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}
// 解析时间字符串 "HH:mm" 到当天的 Date
function parseTimeToDate(timeStr, baseDate) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);
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
    // P2 fix: 参数校验
    if (!year ||
        !month ||
        typeof year !== "number" ||
        typeof month !== "number" ||
        month < 1 ||
        month > 12) {
        return { success: false, error: "Invalid year or month" };
    }
    const today = getToday();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // 月末
    // 只显示到当天，不显示未来日期
    const displayEnd = monthEnd < today ? monthEnd : today;
    // 获取用户设置
    const userRes = await db
        .collection("users")
        .where({
        _openid: openid,
    })
        .get();
    const user = userRes.data[0];
    const defaultStartTime = (user === null || user === void 0 ? void 0 : user.defaultStartTime) || "09:30";
    const defaultEndTime = (user === null || user === void 0 ? void 0 : user.defaultEndTime) || "18:30";
    // 获取本月的节假日数据
    const holidayRes = await db
        .collection("holidays")
        .where({
        date: _.gte(monthStart).and(_.lte(monthEnd)),
    })
        .get();
    const holidays = holidayRes.data;
    // P1 fix: 使用日期字符串作为 Map key，避免时间戳对比问题
    const holidayMap = new Map(holidays.map((h) => [formatDateKey(h.date), h.type]));
    // 获取打卡记录
    const recordRes = await db
        .collection("clock_records")
        .where({
        _openid: openid,
        date: _.gte(monthStart).and(_.lte(monthEnd)),
    })
        .get();
    const clockRecords = recordRes.data;
    // P1 fix: 使用日期字符串作为 Map key
    const recordMap = new Map(clockRecords.map((r) => [formatDateKey(r.date), r]));
    // 构建每日记录
    const dailyRecords = [];
    const current = new Date(monthStart);
    // 用于计算汇总统计
    let totalMinutes = 0;
    let recordedDays = 0;
    let totalWorkDays = 0;
    // T+1: 统计截止到昨天
    const statsEndDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    while (current <= displayEnd) {
        const dateKey = formatDateKey(current);
        const holidayType = holidayMap.get(dateKey);
        const clockRecord = recordMap.get(dateKey);
        const isCurrentToday = current.getTime() === today.getTime();
        // 判断是否是工作日
        let isWorkday = false;
        if (holidayType === "workday") {
            isWorkday = true;
        }
        else if (holidayType === "holiday") {
            isWorkday = false;
        }
        else if (!isWeekend(current)) {
            isWorkday = true;
        }
        // 计算状态
        let status;
        let startTime = null;
        let endTime = null;
        let startFrom = null;
        let endFrom = null;
        let hours = null;
        let minutes = null;
        if (isCurrentToday) {
            // 今天
            status = "today";
            if (clockRecord) {
                startTime = formatTime(clockRecord.startTime);
                endTime = formatTime(clockRecord.endTime);
                startFrom = clockRecord.startTime ? "clock" : null;
                endFrom = clockRecord.endTime ? "clock" : null;
            }
            // 计算当天工作时长
            // 注意：云函数运行在 UTC 时区，需要转换为北京时间 (UTC+8) 进行比较
            const nowUtc = new Date();
            const nowUtc8 = new Date(nowUtc.getTime() + 8 * 60 * 60 * 1000);
            // 构造今天的默认下班时间点（北京时间）
            const [defEndHour, defEndMin] = defaultEndTime.split(":").map(Number);
            const defaultEndDateUtc8 = new Date(nowUtc8.getUTCFullYear(), nowUtc8.getUTCMonth(), nowUtc8.getUTCDate(), defEndHour, defEndMin);
            if (clockRecord === null || clockRecord === void 0 ? void 0 : clockRecord.startTime) {
                const actualStart = new Date(clockRecord.startTime);
                let actualEnd;
                if (clockRecord.endTime) {
                    // 有下班卡
                    actualEnd = new Date(clockRecord.endTime);
                }
                else if (nowUtc8 < defaultEndDateUtc8) {
                    // 无下班卡，当前时间未超过默认下班时间
                    actualEnd = nowUtc;
                }
                else {
                    // 无下班卡，当前时间已超过默认下班时间
                    // 需要将默认下班时间转回 UTC 用于计算
                    actualEnd = new Date(defaultEndDateUtc8.getTime() - 8 * 60 * 60 * 1000);
                }
                const mins = diffMinutes(actualStart, actualEnd);
                if (mins > 0) {
                    minutes = mins;
                    hours = Math.round((mins / 60) * 100) / 100;
                }
            }
            else if (clockRecord === null || clockRecord === void 0 ? void 0 : clockRecord.endTime) {
                // 无上班卡，有下班卡
                const actualStart = parseTimeToDate(defaultStartTime, current);
                const actualEnd = new Date(clockRecord.endTime);
                const mins = diffMinutes(actualStart, actualEnd);
                if (mins > 0) {
                    minutes = mins;
                    hours = Math.round((mins / 60) * 100) / 100;
                }
            }
        }
        else if (!isWorkday) {
            // 休息日
            status = "rest";
        }
        else if ((clockRecord === null || clockRecord === void 0 ? void 0 : clockRecord.status) === "leave") {
            // 请假
            status = "leave";
        }
        else if (clockRecord) {
            // 有打卡记录
            const hasStartClock = !!clockRecord.startTime;
            const hasEndClock = !!clockRecord.endTime;
            if (hasStartClock && hasEndClock) {
                status = "recorded";
            }
            else if (hasStartClock || hasEndClock) {
                status = "partial";
            }
            else {
                status = "default";
            }
            // 使用打卡时间或默认时间
            const actualStartTime = clockRecord.startTime
                ? new Date(clockRecord.startTime)
                : parseTimeToDate(defaultStartTime, current);
            const actualEndTime = clockRecord.endTime
                ? new Date(clockRecord.endTime)
                : parseTimeToDate(defaultEndTime, current);
            startTime = formatTime(actualStartTime);
            endTime = formatTime(actualEndTime);
            startFrom = clockRecord.startTime ? "clock" : "default";
            endFrom = clockRecord.endTime ? "clock" : "default";
            // 计算工时
            const mins = diffMinutes(actualStartTime, actualEndTime);
            if (mins > 0) {
                minutes = mins;
                hours = Math.round((mins / 60) * 100) / 100;
            }
        }
        else {
            // 工作日但无打卡记录，使用默认时间
            status = "default";
            startTime = defaultStartTime;
            endTime = defaultEndTime;
            startFrom = "default";
            endFrom = "default";
            const actualStartTime = parseTimeToDate(defaultStartTime, current);
            const actualEndTime = parseTimeToDate(defaultEndTime, current);
            const mins = diffMinutes(actualStartTime, actualEndTime);
            if (mins > 0) {
                minutes = mins;
                hours = Math.round((mins / 60) * 100) / 100;
            }
        }
        // 统计汇总（只统计到昨天的工作日）
        if (isWorkday &&
            current <= statsEndDate &&
            status !== "leave" &&
            status !== "today") {
            totalWorkDays++;
            if ((clockRecord === null || clockRecord === void 0 ? void 0 : clockRecord.startTime) || (clockRecord === null || clockRecord === void 0 ? void 0 : clockRecord.endTime)) {
                recordedDays++;
            }
            if (minutes !== null) {
                totalMinutes += minutes;
            }
        }
        dailyRecords.push({
            date: formatDate(current),
            day: current.getDate(),
            dayOfWeek: current.getDay(),
            isWorkday,
            isToday: isCurrentToday,
            status,
            startTime,
            endTime,
            startFrom,
            endFrom,
            defaultStartTime,
            defaultEndTime,
            hours,
            minutes,
        });
        current.setDate(current.getDate() + 1);
    }
    // 按日期倒序排列
    dailyRecords.reverse();
    // 计算汇总统计
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const avgHoursPerDay = totalWorkDays > 0
        ? Math.round((totalMinutes / 60 / totalWorkDays) * 100) / 100
        : 0;
    return {
        success: true,
        year,
        month,
        records: dailyRecords,
        summary: {
            totalWorkDays,
            recordedDays,
            totalHours,
            avgHoursPerDay,
        },
    };
};
