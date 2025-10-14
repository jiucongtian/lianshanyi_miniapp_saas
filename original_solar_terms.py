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
    # 每个节气的角度（春分为0度）
    angle = math.pi / 180 * (n * 15 - 90)
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

# =============================================================================
# 新的二十四节气计算实现（更精确的算法）
# =============================================================================

def calculate_solar_terms(year):
    """
    计算指定年份的24节气时间（精确到分钟）
    
    参数:
        year: 年份（例如：2023）
        
    返回:
        字典，键为节气名称，值为该节气的日期和时间字符串（格式：MM-DD HH:MM）
    """
    # 24节气名称
    terms = [
        "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
        "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
        "立秋", "处暑", "白露", "秋分", "寒露", "霜降",
        "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"
    ]
    
    # 计算每个节气的儒略日
    def jd_from_gregorian(y, m, d):
        """将公历日期转换为儒略日"""
        # 使用标准算法
        a = (14 - m) // 12
        y_prime = y + 4800 - a
        m_prime = m + 12 * a - 3
        jdn = d + (153 * m_prime + 2) // 5 + 365 * y_prime + y_prime // 4 - y_prime // 100 + y_prime // 400 - 32045
        return jdn - 0.5
    
    def gregorian_from_jd(jd):
        """将儒略日转换为公历日期（包含时分秒）"""
        jd = jd + 0.5
        z = int(jd)
        f = jd - z
        
        if z < 2299161:
            a = z
        else:
            alpha = int((z - 1867216.25) / 36524.25)
            a = z + 1 + alpha - int(alpha / 4)
        
        b = a + 1524
        c = int((b - 122.1) / 365.25)
        d = int(365.25 * c)
        e = int((b - d) / 30.6001)
        
        day = b - d - int(30.6001 * e) + f
        
        if e < 14:
            month = e - 1
        else:
            month = e - 13
        
        if month > 2:
            year = c - 4716
        else:
            year = c - 4715
        
        # 提取时分秒
        day_fraction = day - int(day)
        hours = day_fraction * 24
        minutes = (hours - int(hours)) * 60
        seconds = (minutes - int(minutes)) * 60
        
        return (int(year), int(month), int(day), 
                int(hours), int(minutes), round(seconds))
    
    def sun_longitude(jd):
        """计算给定儒略日的太阳黄经（度）"""
        # 转换为J2000.0历元的儒略日
        t = (jd - 2451545.0) / 36525.0
        
        # 太阳几何平黄经（度）
        l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t**2
        
        # 太阳平近点角（弧度）
        m = math.radians(357.52911 + 35999.05029 * t - 0.0001537 * t**2)
        
        # 太阳中心差（度）
        c = (1.914602 - 0.004817 * t - 0.000014 * t**2) * math.sin(m) + \
            (0.019993 - 0.000101 * t) * math.sin(2 * m) + \
            0.000289 * math.sin(3 * m)
        
        # 太阳真黄经（度）
        true_longitude = (l0 + c) % 360
        
        return true_longitude
    
    def find_solar_term(year, term_index):
        """查找指定年份和索引的节气时间"""
        # 每个节气对应的太阳黄经（度）
        # 立春(0) = 315°, 雨水(1) = 330°, ..., 冬至(21) = 270°, 小寒(22) = 285°, 大寒(23) = 300°
        target_longitude = (term_index * 15 + 315) % 360
        
        # 从年初开始搜索整年
        jd_start = jd_from_gregorian(year, 1, 1)
        jd_end = jd_from_gregorian(year + 1, 1, 1)
        
        # 先粗略定位到30天范围内
        while jd_end - jd_start > 30:
            jd_mid = (jd_start + jd_end) / 2
            sl_mid = sun_longitude(jd_mid)
            sl_start = sun_longitude(jd_start)
            
            # 判断目标黄经在哪个区间
            # 需要考虑360度环绕的情况
            if sl_start <= target_longitude:
                if sl_mid >= target_longitude or sl_mid < sl_start:
                    jd_end = jd_mid
                else:
                    jd_start = jd_mid
            else:  # 跨越360度边界
                if sl_mid >= target_longitude and sl_mid < sl_start:
                    jd_end = jd_mid
                else:
                    jd_start = jd_mid
        
        # 精确定位到分钟级别
        while jd_end - jd_start > 0.0007:  # 约1分钟精度
            jd_mid = (jd_start + jd_end) / 2
            sl_mid = sun_longitude(jd_mid)
            sl_start = sun_longitude(jd_start)
            
            if sl_start <= target_longitude:
                if sl_mid >= target_longitude or sl_mid < sl_start:
                    jd_end = jd_mid
                else:
                    jd_start = jd_mid
            else:
                if sl_mid >= target_longitude and sl_mid < sl_start:
                    jd_end = jd_mid
                else:
                    jd_start = jd_mid
        
        # 转换为公历日期时间
        jd_result = (jd_start + jd_end) / 2
        # 转换为东八区时间（北京时间）
        jd_result_utc8 = jd_result + 8/24  # 加8小时
        y, m, d, h, mi, s = gregorian_from_jd(jd_result_utc8)
        
        # 处理跨年度情况
        if y != year:
            return None  # 不在指定年份范围内
        
        return f"{m:02d}-{d:02d} {h:02d}:{mi:02d}"
    
    # 计算并返回当年所有节气
    result = {}
    for i, term in enumerate(terms):
        date_time = find_solar_term(year, i)
        if date_time:
            result[term] = date_time
    
    return result

# 新算法的测试函数
def test_new_algorithm():
    """测试新的二十四节气计算算法"""
    year = 2023  # 可以修改为任意年份
    solar_terms = calculate_solar_terms(year)
    
    print(f"\n{year}年二十四节气时间（新算法）：")
    print("=" * 50)
    for i, (term, date_time) in enumerate(solar_terms.items()):
        print(f"{i+1:2d}. {term:<6} {date_time}", end="  ")
        if (i + 1) % 4 == 0:
            print()
    print()

# 如果直接运行此文件，同时测试两种算法
if __name__ == "__main__":
    # 运行原始算法
    main()
    
    # 运行新算法
    test_new_algorithm()
