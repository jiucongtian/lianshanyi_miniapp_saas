#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
原始二十四节气计算程序
需要验证和修复的版本
"""

import math
import datetime

def getSolarTerm(year, n):
    """计算二十四节气时间"""
    # 每个节气的角度
    angle = math.pi / 180 * (n * 15 - 105)
    # 计算距离春分的天数
    days = 365.2422 * (year - 2000) + 15.2184 * math.sin(angle) - 0.4204 * math.sin(angle * 2) - 0.017 * math.sin(angle * 3)
    # 计算距离2000年春分的时间（单位为儒略日）
    time = 2451623.80984 + days + 0.5
    # 计算距离1970年1月1日的秒数
    second = (time - 2440587.5) * 86400
    # 转换为本地时间（东八区）
    date = datetime.datetime.fromtimestamp(second, tz=datetime.timezone(datetime.timedelta(hours=8)))
    # 返回节气时间
    return date.strftime("%Y-%m-%d %H:%M:%S")

def main():
    """主函数 - 测试程序，输出2022年的24个节气时间"""
    print("2022年二十四节气计算结果:")
    print("=" * 50)
    
    # 二十四节气名称
    jieqi_names = [
        "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", 
        "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
        "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
        "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"
    ]
    
    for i in range(24):
        result = getSolarTerm(2022, i)
        print(f"{i+1:2d}. {jieqi_names[i]:<6} {result}")

if __name__ == "__main__":
    main()
