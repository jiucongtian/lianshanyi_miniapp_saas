#!/usr/bin/env node
/**
 * 批量迁移日志调用脚本
 * 将 this._log() 等旧方法替换为 this._logMethod() 等新方法
 */

const fs = require('fs');
const path = require('path');

// 需要迁移的文件列表
const filesToMigrate = [
  'miniprogram/controllers/AddProfileController.js',
  'miniprogram/controllers/ProfileController.js',
  'miniprogram/controllers/CardController.js',
  'miniprogram/controllers/MineController.js',
  'miniprogram/controllers/RegisterController.js',
  'miniprogram/services/UserService.js',
  'miniprogram/services/ProfileService.js',
  'miniprogram/beans/ResponseBean.js',
];

/**
 * 提取方法名
 * 从函数定义中提取方法名
 */
function extractMethodName(lines, currentLineIndex) {
  // 向上查找最近的方法定义
  for (let i = currentLineIndex; i >= Math.max(0, currentLineIndex - 30); i--) {
    const line = lines[i];
    
    // 匹配方法定义: methodName() { 或 async methodName() {
    const match = line.match(/^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * 迁移单个文件
 */
function migrateFile(filePath) {
  console.log(`\n正在迁移: ${filePath}`);
  
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  文件不存在，跳过`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  let modifiedCount = 0;
  
  // 遍历每一行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 匹配旧的日志调用
    // this._log( this._warn( this._error( this._info( this._debug(
    const logMatch = line.match(/this\.(_log|_warn|_error|_info|_debug)\(/);
    
    if (logMatch) {
      const oldMethod = logMatch[1]; // _log, _warn, _error, _info, _debug
      
      // 检查是否已经是新方法（避免重复替换）
      if (line.includes('_logMethod(') || line.includes('_warnMethod(') || 
          line.includes('_errorMethod(') || line.includes('_debugMethod(')) {
        continue;
      }
      
      // 提取当前所在的方法名
      const methodName = extractMethodName(lines, i);
      
      if (!methodName) {
        console.log(`  ⚠️  第 ${i + 1} 行：无法确定方法名，跳过`);
        continue;
      }
      
      // 构建新的方法名
      let newMethod;
      if (oldMethod === '_log' || oldMethod === '_info') {
        newMethod = '_logMethod';
      } else if (oldMethod === '_warn') {
        newMethod = '_warnMethod';
      } else if (oldMethod === '_error') {
        newMethod = '_errorMethod';
      } else if (oldMethod === '_debug') {
        newMethod = '_debugMethod';
      }
      
      // 替换：this._log( => this._logMethod('methodName', 
      const newLine = line.replace(
        new RegExp(`this\\.${oldMethod}\\(`),
        `this.${newMethod}('${methodName}', `
      );
      
      lines[i] = newLine;
      modifiedCount++;
    }
  }
  
  if (modifiedCount > 0) {
    // 写回文件
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8');
    console.log(`  ✅ 完成！修改了 ${modifiedCount} 处日志调用`);
  } else {
    console.log(`  ℹ️  没有需要迁移的日志调用`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('='.repeat(60));
  console.log('开始批量迁移日志调用');
  console.log('='.repeat(60));
  
  let totalModified = 0;
  
  for (const file of filesToMigrate) {
    try {
      migrateFile(file);
    } catch (error) {
      console.error(`  ❌ 迁移失败: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('迁移完成！');
  console.log('='.repeat(60));
  console.log('\n请检查修改结果，确认无误后提交代码。');
}

main();

