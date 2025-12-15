#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import secrets
from datetime import datetime, timedelta

# 数字转中文
num_to_chinese = {
    '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六'
}

# 简化季节标记
def simplify_season(season):
    if not season:
        return ''
    seasons = ['春', '夏', '秋', '冬', '长夏']
    for s in seasons:
        if s in season:
            return s
    return season[0] if season else ''

# 读取源文件
with open('docs/tmp copy.json', 'r', encoding='utf-8') as f:
    source_data = json.load(f)

print(f'读取到 {len(source_data)} 条数据')

# 转换数据格式
converted_data = []
base_date = datetime(2024, 1, 1)
used_ids = set()

for index, item in enumerate(source_data):
    # 生成唯一ID（确保不重复）
    while True:
        _id = secrets.token_hex(16)
        if _id not in used_ids:
            used_ids.add(_id)
            break
    
    # 转换abilityMark为中文数字
    ability_mark = item.get('abilityMark', '')
    if ability_mark in num_to_chinese:
        ability_mark = num_to_chinese[ability_mark]
    
    # 简化seasonMark
    season_mark = simplify_season(item.get('seasonMark', ''))
    
    # 生成日期
    date_str = (base_date + timedelta(days=index)).strftime('%Y-%m-%d')
    
    converted_item = {
        '_id': _id,
        'date': date_str,
        'cardName': item.get('cardName', ''),
        'cardNumber': item.get('cardNumber', 0),
        'central': item.get('central', ''),
        'seasonMark': season_mark,
        'talentMark': item.get('talentMark', ''),
        'abilityMark': ability_mark,
        'pathMark': item.get('pathMark', ''),
        'description': item.get('description', ''),
        'blessing': item.get('blessing', ''),
        'tip': item.get('tip', ''),
        'password': item.get('password', ''),
        'createdAt': item.get('createdAt', ''),
        'updatedAt': item.get('updatedAt', ''),
        'isActive': item.get('isActive', True)
    }
    
    converted_data.append(converted_item)

# 写入文件（每行一个JSON对象）
with open('docs/tmp.json', 'w', encoding='utf-8') as f:
    for item in converted_data:
        f.write(json.dumps(item, ensure_ascii=False) + '\n')

print(f'转换完成，共 {len(converted_data)} 条数据')
print(f'\n前3条数据示例:')
for i, item in enumerate(converted_data[:3]):
    print(f'\n第{i+1}条:')
    print(f'  _id: {item["_id"]}')
    print(f'  date: {item["date"]}')
    print(f'  cardName: {item["cardName"]}')
    print(f'  abilityMark: {item["abilityMark"]}')
    print(f'  seasonMark: {item["seasonMark"]}')
