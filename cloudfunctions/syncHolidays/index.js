"use strict";
// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
// 云函数入口函数
exports.main = async (event) => {
    const { year } = event;
    // 从 timor.tech API 获取节假日数据
    // API 文档: http://timor.tech/api/holiday/
    const url = `http://timor.tech/api/holiday/year/${year}`;
    try {
        // 使用云函数内置的 request 能力
        const response = await new Promise((resolve, reject) => {
            const http = require('node:http');
            http.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });
        if (response.code !== 0) {
            return {
                success: false,
                error: 'API returned error',
            };
        }
        const holidays = [];
        // 解析 API 返回的数据
        for (const [dateStr, info] of Object.entries(response.holiday)) {
            // dateStr 格式: "01-01" 或 "01-24"
            const [month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            holidays.push({
                date,
                year,
                type: info.holiday ? 'holiday' : 'workday',
                name: info.name,
            });
        }
        // 清除该年份的旧数据
        await db.collection('holidays').where({
            year,
        }).remove();
        // 批量插入新数据（云数据库单次最多插入 20 条）
        let count = 0;
        for (let i = 0; i < holidays.length; i += 20) {
            const batch = holidays.slice(i, i + 20);
            for (const holiday of batch) {
                await db.collection('holidays').add({
                    data: holiday,
                });
                count++;
            }
        }
        return {
            success: true,
            count,
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
};
