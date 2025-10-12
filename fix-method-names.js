#!/usr/bin/env node
/**
 * 修复错误的方法名
 * 将错误的方法名（如 'if', 'for', 'catch' 等）替换为正确的方法名
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'miniprogram/controllers/AddProfileController.js',
  'miniprogram/controllers/ProfileController.js',
  'miniprogram/controllers/CardController.js',
  'miniprogram/controllers/MineController.js',
  'miniprogram/controllers/RegisterController.js',
  'miniprogram/services/UserService.js',
  'miniprogram/services/ProfileService.js',
  'miniprogram/beans/ResponseBean.js',
];

// 关键字列表（不应该作为方法名）
const KEYWORDS = [
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 
  'try', 'catch', 'finally', 'return', 'break', 'continue',
  'function', 'class', 'const', 'let', 'var', 'async', 'await'
];

/**
 * 提取正确的方法名
 * 跳过 if/for/while/catch 等关键字，找到真正的方法定义
 */
function extractMethodName(lines, currentLineIndex) {
  // 向上查找最近的方法定义
  for (let i = currentLineIndex; i >= Math.max(0, currentLineIndex - 50); i--) {
    const line = lines[i];
    
    // 匹配方法定义: methodName() { 或 async methodName() {
    const match = line.match(/^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/);
    if (match) {
      const methodName = match[1];
      
      // 跳过关键字
      if (KEYWORDS.includes(methodName)) {
        continue;
      }
      
      // 跳过常见的非方法定义
      if (methodName === 'function' || methodName === 'constructor') {
        // constructor 是有效的方法名
        if (methodName === 'constructor') {
          return methodName;
        }
        continue;
      }
      
      return methodName;
    }
  }
  
  return null;
}

/**
 * 修复单个文件
 */
function fixFile(filePath) {
  console.log(`\n正在修复: ${filePath}`);
  
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  文件不存在，跳过`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  let fixedCount = 0;
  const errors = [];
  
  // 遍历每一行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 匹配新的日志方法调用
    const match = line.match(/this\.(_logMethod|_warnMethod|_errorMethod|_debugMethod)\('(\w+)',/);
    
    if (match) {
      const logMethod = match[1];
      const currentMethodName = match[2];
      
      // 检查是否是关键字（错误的方法名）
      if (KEYWORDS.includes(currentMethodName)) {
        // 提取正确的方法名
        const correctMethodName = extractMethodName(lines, i);
        
        if (correctMethodName) {
          // 替换为正确的方法名
          const oldPattern = `this.${logMethod}('${currentMethodName}',`;
          const newPattern = `this.${logMethod}('${correctMethodName}',`;
          lines[i] = line.replace(oldPattern, newPattern);
          fixedCount++;
          console.log(`  ✓ 第 ${i + 1} 行: '${currentMethodName}' → '${correctMethodName}'`);
        } else {
          errors.push(`第 ${i + 1} 行：无法确定正确的方法名`);
        }
      }
    }
  }
  
  if (fixedCount > 0) {
    // 写回文件
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8');
    console.log(`  ✅ 完成！修复了 ${fixedCount} 处错误的方法名`);
  } else {
    console.log(`  ℹ️  没有需要修复的方法名`);
  }
  
  if (errors.length > 0) {
    console.log(`  ⚠️  警告：`);
    errors.forEach(err => console.log(`    ${err}`));
  }
}

/**
 * 主函数
 */
function main() {
  console.log('='.repeat(60));
  console.log('开始修复错误的方法名');
  console.log('='.repeat(60));
  
  for (const file of filesToFix) {
    try {
      fixFile(file);
    } catch (error) {
      console.error(`  ❌ 修复失败: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('修复完成！');
  console.log('='.repeat(60));
}

main();

