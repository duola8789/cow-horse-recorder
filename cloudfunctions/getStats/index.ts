// 云函数入口文件
const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

interface ClockRecord {
  _id: string;
  _openid: string;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  startFrom: "clock" | "default";
  endFrom: "clock" | "default";
  status: "normal" | "leave";
}

interface User {
  _id: string;
  _openid: string;
  defaultStartTime: string;
  defaultEndTime: string;
}

interface Holiday {
  _id: string;
  date: Date;
  type: "workday" | "holiday";
}

// 北京时间偏移量 (UTC+8)
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

// 获取北京时间的今天 00:00:00 (UTC+8)
// 云函数运行在 UTC 时区，需要手动转换
function getToday(): Date {
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
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// 解析时间字符串 "HH:mm" 到当天的 Date
function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
  );
}

// 计算两个时间之间的分钟数
function diffMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 1000 / 60);
}

// 云函数入口函数
exports.main = async (event: { year: number; month: number }) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID!;
  const { year, month } = event;

  const today = getToday();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // 月末

  // T+1: 统计截止到昨天
  const statsEndDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);

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

  const user = userRes.data[0] as User | undefined;
  const defaultStartTime = user?.defaultStartTime || "09:30";
  const defaultEndTime = user?.defaultEndTime || "18:30";

  // 获取本月的节假日数据
  const holidayRes = await db
    .collection("holidays")
    .where({
      date: _.gte(monthStart).and(_.lte(actualEndDate)),
    })
    .get();

  const holidays = holidayRes.data as Holiday[];
  const holidayMap = new Map(holidays.map((h) => [h.date.getTime(), h.type]));

  // 计算工作日列表
  const workdays: Date[] = [];
  const current = new Date(monthStart);

  while (current <= actualEndDate) {
    const holidayType = holidayMap.get(current.getTime());

    if (holidayType === "workday") {
      // 调休工作日
      workdays.push(new Date(current));
    } else if (holidayType === "holiday") {
      // 节假日，不是工作日
    } else if (!isWeekend(current)) {
      // 普通工作日（周一到周五）
      workdays.push(new Date(current));
    }

    current.setDate(current.getDate() + 1);
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

  const records = recordRes.data as ClockRecord[];
  const recordMap = new Map(records.map((r) => [r.date.getTime(), r]));

  // 计算总工时
  let totalMinutes = 0;
  let recordedDays = 0;

  for (const workday of workdays) {
    const record = recordMap.get(workday.getTime());

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
  const avgHoursPerDay =
    workdays.length > 0
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
