// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
});

const db = cloud.database();
const _ = db.command;

/**
 * 创建成功响应
 */
function success(data, message = '操作成功') {
  return {
    success: true,
    data: data,
    message: message,
    code: 0,
    timestamp: new Date().getTime()
  };
}

/**
 * 创建错误响应
 */
function error(errorMessage, code = -1, data = null) {
  return {
    success: false,
    error: errorMessage,
    code: code,
    data: data,
    timestamp: new Date().getTime()
  };
}

/**
 * 检查用户是否为管理员
 * @param {string} openid - 用户openid
 * @returns {Promise<{isAdmin: boolean, user: Object|null}>}
 */
async function checkAdminPermission(openid) {
  try {
    const result = await db.collection('users')
      .where({
        openid: openid,
        isActive: true
      })
      .get();
    
    if (result.data.length === 0) {
      return {
        isAdmin: false,
        user: null,
        message: '用户不存在'
      };
    }
    
    const user = result.data[0];
    const userType = user.userType || 'guest';
    const adminRole = user.adminRole || 'none';
    
    // 检查是否为管理员：userType === 'admin' 或 adminRole !== 'none'
    const isAdmin = userType === 'admin' || adminRole !== 'none';
    
    return {
      isAdmin: isAdmin,
      user: user,
      message: isAdmin ? '管理员权限验证通过' : '非管理员用户，无权访问'
    };
  } catch (err) {
    console.error('[checkAdminPermission] 检查管理员权限失败:', err);
    return {
      isAdmin: false,
      user: null,
      message: '权限检查失败: ' + err.message
    };
  }
}

/**
 * 解析数据库操作指令
 * @param {string} command - 数据库操作指令（JSON字符串）
 * @returns {Object} 解析后的操作对象
 */
function parseCommand(command) {
  try {
    if (typeof command !== 'string') {
      throw new Error('命令必须是字符串类型');
    }
    
    const parsed = JSON.parse(command);
    
    // 验证必需字段
    if (!parsed.operation) {
      throw new Error('缺少必需字段: operation');
    }
    
    if (!parsed.collection) {
      throw new Error('缺少必需字段: collection');
    }
    
    // 验证操作类型
    const validOperations = ['get', 'add', 'update', 'remove', 'count', 'aggregate'];
    if (!validOperations.includes(parsed.operation)) {
      throw new Error(`不支持的操作类型: ${parsed.operation}，支持的操作: ${validOperations.join(', ')}`);
    }
    
    // 对于聚合操作，验证 stages 字段
    if (parsed.operation === 'aggregate') {
      if (!parsed.stages || !Array.isArray(parsed.stages)) {
        throw new Error('聚合操作需要 stages 字段（数组格式）');
      }
    }
    
    return parsed;
  } catch (err) {
    throw new Error('解析命令失败: ' + err.message);
  }
}

/**
 * 执行数据库查询操作 (get)
 * @param {Object} command - 操作命令对象
 * @returns {Promise<Object>} 查询结果
 */
async function executeGet(command) {
  const { collection, where = {}, field = {}, orderBy = null, limit = null, skip = 0 } = command;
  
  let query = db.collection(collection).where(where);
  
  // 字段筛选
  if (Object.keys(field).length > 0) {
    query = query.field(field);
  }
  
  // 排序
  if (orderBy) {
    const { field: orderField, order = 'asc' } = orderBy;
    query = query.orderBy(orderField, order);
  }
  
  // 跳过记录
  if (skip > 0) {
    query = query.skip(skip);
  }
  
  // 限制数量
  if (limit && limit > 0) {
    query = query.limit(Math.min(limit, 100)); // 最多返回100条
  }
  
  const result = await query.get();
  
  return {
    operation: 'get',
    collection: collection,
    count: result.data.length,
    data: result.data
  };
}

/**
 * 执行数据库添加操作 (add)
 * @param {Object} command - 操作命令对象
 * @returns {Promise<Object>} 添加结果
 */
async function executeAdd(command) {
  const { collection, data } = command;
  
  if (!data || typeof data !== 'object') {
    throw new Error('缺少必需字段: data');
  }
  
  // 添加时间戳
  const now = new Date();
  const docData = {
    ...data,
    createTime: data.createTime || now,
    updateTime: data.updateTime || now
  };
  
  const result = await db.collection(collection).add({
    data: docData
  });
  
  return {
    operation: 'add',
    collection: collection,
    _id: result._id,
    inserted: 1
  };
}

/**
 * 执行数据库更新操作 (update)
 * @param {Object} command - 操作命令对象
 * @returns {Promise<Object>} 更新结果
 */
async function executeUpdate(command) {
  const { collection, where = {}, data } = command;
  
  if (!data || typeof data !== 'object') {
    throw new Error('缺少必需字段: data');
  }
  
  // 添加更新时间戳
  const updateData = {
    ...data,
    updateTime: new Date()
  };
  
  const result = await db.collection(collection).where(where).update({
    data: updateData
  });
  
  return {
    operation: 'update',
    collection: collection,
    updated: result.stats.updated,
    matched: result.stats.matched
  };
}

/**
 * 执行数据库删除操作 (remove)
 * @param {Object} command - 操作命令对象
 * @returns {Promise<Object>} 删除结果
 */
async function executeRemove(command) {
  const { collection, where = {} } = command;
  
  const result = await db.collection(collection).where(where).remove();
  
  return {
    operation: 'remove',
    collection: collection,
    removed: result.stats.removed
  };
}

/**
 * 执行数据库计数操作 (count)
 * @param {Object} command - 操作命令对象
 * @returns {Promise<Object>} 计数结果
 */
async function executeCount(command) {
  const { collection, where = {} } = command;
  
  const result = await db.collection(collection).where(where).count();
  
  return {
    operation: 'count',
    collection: collection,
    total: result.total
  };
}

/**
 * 执行数据库聚合操作 (aggregate)
 * @param {Object} command - 操作命令对象
 * @returns {Promise<Object>} 聚合结果
 */
async function executeAggregate(command) {
  const { collection, stages = [] } = command;
  
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error('缺少必需字段: stages（必须是数组，包含聚合阶段配置）');
  }
  
  // 构建聚合查询
  let aggregateQuery = db.collection(collection).aggregate();
  
  // 遍历阶段并应用
  for (const stage of stages) {
    const stageType = stage.type;
    const stageData = stage.data || {};
    
    switch (stageType) {
      case 'match':
        aggregateQuery = aggregateQuery.match(stageData);
        break;
      
      case 'group':
        aggregateQuery = aggregateQuery.group(stageData);
        break;
      
      case 'sort':
        aggregateQuery = aggregateQuery.sort(stageData);
        break;
      
      case 'limit':
        aggregateQuery = aggregateQuery.limit(stageData);
        break;
      
      case 'skip':
        aggregateQuery = aggregateQuery.skip(stageData);
        break;
      
      case 'project':
        aggregateQuery = aggregateQuery.project(stageData);
        break;
      
      default:
        throw new Error(`不支持的聚合阶段类型: ${stageType}`);
    }
  }
  
  const result = await aggregateQuery.end();
  
  return {
    operation: 'aggregate',
    collection: collection,
    count: result.list.length,
    data: result.list
  };
}

/**
 * 执行数据库操作
 * @param {Object} command - 解析后的操作命令对象
 * @returns {Promise<Object>} 操作结果
 */
async function executeDatabaseOperation(command) {
  const { operation } = command;
  
  console.log('[executeDatabaseOperation] 执行数据库操作:', {
    operation: operation,
    collection: command.collection
  });
  
  try {
    switch (operation) {
      case 'get':
        return await executeGet(command);
      
      case 'add':
        return await executeAdd(command);
      
      case 'update':
        return await executeUpdate(command);
      
      case 'remove':
        return await executeRemove(command);
      
      case 'count':
        return await executeCount(command);
      
      case 'aggregate':
        return await executeAggregate(command);
      
      default:
        throw new Error(`不支持的操作类型: ${operation}`);
    }
  } catch (err) {
    console.error('[executeDatabaseOperation] 执行数据库操作失败:', err);
    throw new Error(`执行${operation}操作失败: ${err.message}`);
  }
}

/**
 * 执行数据库调试命令
 * @param {string} openid - 用户openid
 * @param {string} command - 数据库操作指令（JSON字符串）
 * @returns {Promise<Object>} 执行结果
 */
async function executeDebugCommand(openid, command) {
  try {
    // 1. 检查管理员权限
    const permissionCheck = await checkAdminPermission(openid);
    if (!permissionCheck.isAdmin) {
      return error(permissionCheck.message, -403, {
        openid: openid,
        userType: permissionCheck.user?.userType || 'unknown',
        adminRole: permissionCheck.user?.adminRole || 'none'
      });
    }
    
    console.log('[executeDebugCommand] 管理员权限验证通过:', {
      openid: openid,
      userType: permissionCheck.user.userType,
      adminRole: permissionCheck.user.adminRole
    });
    
    // 2. 解析命令
    let parsedCommand;
    try {
      parsedCommand = parseCommand(command);
      console.log('[executeDebugCommand] 命令解析成功:', {
        operation: parsedCommand.operation,
        collection: parsedCommand.collection
      });
    } catch (parseErr) {
      return error('命令解析失败: ' + parseErr.message, -400, {
        command: command,
        error: parseErr.message
      });
    }
    
    // 3. 执行数据库操作
    const result = await executeDatabaseOperation(parsedCommand);
    
    console.log('[executeDebugCommand] 数据库操作执行成功:', {
      operation: parsedCommand.operation,
      collection: parsedCommand.collection
    });
    
    return success(result, '数据库操作执行成功');
    
  } catch (err) {
    console.error('[executeDebugCommand] 执行调试命令失败:', err);
    return error('执行失败: ' + err.message, -500, {
      error: err.message,
      stack: err.stack
    });
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { command } = event;
  
  console.log('[databaseDebug] 收到调试请求:', {
    openid: wxContext.OPENID,
    hasCommand: !!command,
    commandLength: command ? command.length : 0
  });
  
  try {
    // 验证参数
    if (!command || typeof command !== 'string') {
      return error('缺少必需参数: command（必须是字符串类型）', -400);
    }
    
    // 执行调试命令
    return await executeDebugCommand(wxContext.OPENID, command);
    
  } catch (err) {
    console.error('[databaseDebug] 云函数执行失败:', err);
    return error('云函数执行失败: ' + err.message, -500);
  }
};
