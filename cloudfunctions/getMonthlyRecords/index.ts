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

interface ClockRecord {
  _id: string;
  _openid: string;
  date: string; // "YYYY-MM-DD"
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
  date: string; // "YYYY-MM-DD"
  type: "workday" | "holiday";
}

type DailyStatus =
  | "recorded"
  | "partial"
  | "default"
  | "rest"
  | "leave"
  | "today";

interface DailyRecord {
  date: string; // "2026-03-19"
  day: number; // 19
  dayOfWeek: number; // 3 (0=周日, 1-6=周一至周六)
  isWorkday: boolean;
  isToday: boolean;
  status: DailyStatus;
  startTime: string | null; // "09:28"
  endTime: string | null; // "18:45"
  startFrom: "clock" | "default" | null;
  endFrom: "clock" | "default" | null;
  defaultStartTime: string; // "09:30"
  defaultEndTime: string; // "18:30"
  hours: number | null; // 9.28
  minutes: number | null; // 557
}

// 判断是否是周末
function isWeekend(dateStr: string): boolean {
  const day = dayjs(dateStr).day();
  return day === 0 || day === 6;
}

// 格式化时间为 HH:mm（将 Date 对象转换为北京时间显示）
function formatTime(date: Date | unknown): string | null {
  if (!date) return null;
  const d = dayjs(date as any);
  if (!d.isValid()) return null;
  return d.tz("Asia/Shanghai").format("HH:mm");
}

// 将时间字符串 "HH:mm" 转为指定日期的 Date 对象（北京时间）
function parseTimeToDate(timeStr: string, dateStr: string): Date {
  return dayjs.tz(`${dateStr} ${timeStr}`, "Asia/Shanghai").toDate();
}

// 计算两个时间之间的分钟数
function diffMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 1000 / 60);
}

// 云函数入口函数
exports.main = async (event: { year?: unknown; month?: unknown }) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID!;
  const { year, month } = event;

  // 参数校验
  if (
    typeof year !== "number" ||
    typeof month !== "number" ||
    month < 1 ||
    month > 12
  ) {
    return { success: false, error: "Invalid year or month" };
  }

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
  // 只显示到当天，不显示未来日期
  const displayEnd = monthEnd < today ? monthEnd : today;

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
      date: _.gte(monthStart).and(_.lte(monthEnd)),
    })
    .get();

  const holidays = holidayRes.data as Holiday[];
  const holidayMap = new Map(holidays.map((h) => [h.date, h.type]));

  // 获取打卡记录
  const recordRes = await db
    .collection("clock_records")
    .where({
      _openid: openid,
      date: _.gte(monthStart).and(_.lte(monthEnd)),
    })
    .get();

  const clockRecords = recordRes.data as ClockRecord[];
  const recordMap = new Map(clockRecords.map((r) => [r.date, r]));

  // 构建每日记录
  const dailyRecords: DailyRecord[] = [];
  let current = dayjs(monthStart);

  // 用于计算汇总统计
  let totalMinutes = 0;
  let recordedDays = 0;
  let totalWorkDays = 0;

  // T+1: 统计截止到昨天
  const statsEndDate = dayjs(today).subtract(1, "day").format("YYYY-MM-DD");

  while (current.format("YYYY-MM-DD") <= displayEnd) {
    const dateKey = current.format("YYYY-MM-DD");
    const holidayType = holidayMap.get(dateKey);
    const clockRecord = recordMap.get(dateKey);
    const isCurrentToday = dateKey === today;

    // 判断是否是工作日
    let isWorkday = false;
    if (holidayType === "workday") {
      isWorkday = true;
    } else if (holidayType === "holiday") {
      isWorkday = false;
    } else if (!isWeekend(dateKey)) {
      isWorkday = true;
    }

    // 计算状态
    let status: DailyStatus;
    let startTime: string | null = null;
    let endTime: string | null = null;
    let startFrom: "clock" | "default" | null = null;
    let endFrom: "clock" | "default" | null = null;
    let hours: number | null = null;
    let minutes: number | null = null;

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
      const nowBj = dayjs().tz("Asia/Shanghai");
      const defaultEndDateBj = dayjs.tz(
        `${dateKey} ${defaultEndTime}`,
        "Asia/Shanghai",
      );

      if (clockRecord?.startTime) {
        const actualStart = new Date(clockRecord.startTime);
        let actualEnd: Date;

        if (clockRecord.endTime) {
          // 有下班卡
          actualEnd = new Date(clockRecord.endTime);
        } else if (nowBj.isBefore(defaultEndDateBj)) {
          // 无下班卡，当前时间未超过默认下班时间
          actualEnd = new Date();
        } else {
          // 无下班卡，当前时间已超过默认下班时间
          actualEnd = defaultEndDateBj.toDate();
        }

        const mins = diffMinutes(actualStart, actualEnd);
        if (mins > 0) {
          minutes = mins;
          hours = Math.round((mins / 60) * 100) / 100;
        }
      } else if (clockRecord?.endTime) {
        // 无上班卡，有下班卡
        const actualStart = parseTimeToDate(defaultStartTime, dateKey);
        const actualEnd = new Date(clockRecord.endTime);
        const mins = diffMinutes(actualStart, actualEnd);
        if (mins > 0) {
          minutes = mins;
          hours = Math.round((mins / 60) * 100) / 100;
        }
      }
    } else if (!isWorkday) {
      // 休息日
      status = "rest";
    } else if (clockRecord?.status === "leave") {
      // 请假
      status = "leave";
    } else if (clockRecord) {
      // 有打卡记录
      const hasStartClock = !!clockRecord.startTime;
      const hasEndClock = !!clockRecord.endTime;

      if (hasStartClock && hasEndClock) {
        status = "recorded";
      } else if (hasStartClock || hasEndClock) {
        status = "partial";
      } else {
        status = "default";
      }

      // 使用打卡时间或默认时间
      const actualStartTime = clockRecord.startTime
        ? new Date(clockRecord.startTime)
        : parseTimeToDate(defaultStartTime, dateKey);
      const actualEndTime = clockRecord.endTime
        ? new Date(clockRecord.endTime)
        : parseTimeToDate(defaultEndTime, dateKey);

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
    } else {
      // 工作日但无打卡记录，使用默认时间
      status = "default";
      startTime = defaultStartTime;
      endTime = defaultEndTime;
      startFrom = "default";
      endFrom = "default";

      const actualStartTime = parseTimeToDate(defaultStartTime, dateKey);
      const actualEndTime = parseTimeToDate(defaultEndTime, dateKey);
      const mins = diffMinutes(actualStartTime, actualEndTime);
      if (mins > 0) {
        minutes = mins;
        hours = Math.round((mins / 60) * 100) / 100;
      }
    }

    // 统计汇总（只统计到昨天的工作日）
    if (
      isWorkday &&
      dateKey <= statsEndDate &&
      status !== "leave" &&
      status !== "today"
    ) {
      totalWorkDays++;
      if (clockRecord?.startTime || clockRecord?.endTime) {
        recordedDays++;
      }
      if (minutes !== null) {
        totalMinutes += minutes;
      }
    }

    dailyRecords.push({
      date: dateKey,
      day: current.date(),
      dayOfWeek: current.day(),
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

    current = current.add(1, "day");
  }

  // 按日期倒序排列
  dailyRecords.reverse();

  // 计算汇总统计
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
  const avgHoursPerDay =
    totalWorkDays > 0
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
