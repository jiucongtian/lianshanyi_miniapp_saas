#!/usr/bin/env node

/**
 * 微信小程序 CDP 调试工具
 * 通过 Chrome DevTools Protocol 连接微信开发者工具模拟器
 * Node.js 22+ 零依赖 (内置 WebSocket + fetch)
 *
 * 用法:
 *   node mp-cdp.mjs start --project=fuge-mp        # 启动后台日志守护进程
 *   node mp-cdp.mjs stop --project=fuge-mp          # 停止守护进程
 *   node mp-cdp.mjs status --project=fuge-mp        # 检查守护进程状态
 *   node mp-cdp.mjs discover [--project=fuge-mp]
 *   node mp-cdp.mjs screenshot [--project=fuge-mp]
 *   node mp-cdp.mjs logs [--duration=5] [--eval="expression"] [--project=fuge-mp]
 *   node mp-cdp.mjs eval [--project=fuge-mp] "expression"
 *   node mp-cdp.mjs click [--project=fuge-mp] <x> <y>
 *   node mp-cdp.mjs scroll [--project=fuge-mp] <deltaX> <deltaY>
 *   node mp-cdp.mjs reload [--project=fuge-mp]
 */

import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';

// ─── 参数解析 ───

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('--'));
const positional = args.filter(a => !a.startsWith('--'));

function getFlag(name, defaultValue) {
  const prefix = `--${name}=`;
  const found = args.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

const PORT = parseInt(getFlag('port', '9333'));
const OUTPUT = getFlag('output', '');
const DURATION = parseInt(getFlag('duration', '5'));
const TIMEOUT = parseInt(getFlag('timeout', '10000'));
const PROJECT = getFlag('project', '');
const EVAL_EXPR = getFlag('eval', '');

// ─── 项目目录工具 ───

function getProjectDir(projectName) {
  const name = projectName || 'default';
  return `/tmp/mp-debug/${name}`;
}

function ensureProjectDirs(projectName) {
  const dir = getProjectDir(projectName);
  mkdirSync(join(dir, 'screenshots'), { recursive: true });
  return dir;
}

function getPidFile(projectName) {
  return join(getProjectDir(projectName), 'daemon.pid');
}

function getLogFile(projectName) {
  return join(getProjectDir(projectName), 'console.log');
}

function getDaemonPid(projectName) {
  const pidFile = getPidFile(projectName);
  if (!existsSync(pidFile)) return null;
  const pid = parseInt(readFileSync(pidFile, 'utf8').trim());
  if (!pid) return null;
  // 检查进程是否存活
  try { process.kill(pid, 0); return pid; } catch { return null; }
}

// ─── CDP Client ───

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
    this.eventHandler = null;
    this.closeHandler = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket connect timeout')), TIMEOUT);
      this.ws = new WebSocket(this.wsUrl);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); });
      this.ws.addEventListener('error', (e) => { clearTimeout(timer); reject(new Error(`WebSocket error: ${e.message || 'connection failed'}`)); });
      this.ws.addEventListener('close', () => { if (this.closeHandler) this.closeHandler(); });
      this.ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id !== undefined) {
          const cb = this.callbacks.get(msg.id);
          if (cb) { this.callbacks.delete(msg.id); cb(msg); }
        } else if (msg.method && this.eventHandler) {
          this.eventHandler(msg);
        }
      });
    });
  }

  async send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        reject(new Error(`CDP command timeout: ${method}`));
      }, TIMEOUT);
      this.callbacks.set(id, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
        else resolve(msg.result);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  onEvent(handler) { this.eventHandler = handler; }
  onClose(handler) { this.closeHandler = handler; }
  close() { if (this.ws) this.ws.close(); }
}

// ─── Target 发现 ───

async function discoverTargets(port, projectFilter) {
  const resp = await fetch(`http://localhost:${port}/json`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  let targets = await resp.json();

  let matchedPort = null;
  if (projectFilter) {
    const extensionPages = targets.filter(t =>
      t.url && t.url.includes('chrome-extension://') && t.url.includes('projectpath=')
    );

    const matched = extensionPages.find(t => {
      const decoded = decodeURIComponent(t.url);
      return decoded.includes(projectFilter);
    });

    if (!matched) {
      const available = extensionPages.map(t => {
        const params = new URLSearchParams(t.url.split('?')[1] || '');
        return decodeURIComponent(params.get('projectpath') || '');
      });
      throw new Error(`未找到匹配 "${projectFilter}" 的项目。可用项目: ${available.join(', ')}`);
    }

    const matchedParams = new URLSearchParams(matched.url.split('?')[1] || '');
    const matchedProjectPath = decodeURIComponent(matchedParams.get('projectpath') || '');

    let projectAppId = '';
    if (matchedProjectPath) {
      const configPath = join(matchedProjectPath, 'project.config.json');
      try {
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf8'));
          projectAppId = config.appid || '';
        }
      } catch { /* ignore */ }
    }

    const allPorts = new Set();
    for (const t of targets) {
      const m = t.url?.match(/127\.0\.0\.1:(\d+)/);
      if (m) allPorts.add(parseInt(m[1]));
    }

    if (projectAppId && allPorts.size > 1) {
      for (const p of allPorts) {
        const appservice = targets.find(t =>
          t.url && t.url.includes(`127.0.0.1:${p}`) && t.url.includes('/appservice')
        );
        if (!appservice) continue;
        try {
          const client = new CDPClient(appservice.webSocketDebuggerUrl);
          await client.connect();
          const result = await client.send('Runtime.evaluate', {
            expression: 'typeof __wxConfig !== "undefined" && __wxConfig.accountInfo ? __wxConfig.accountInfo.appId || "" : ""',
            returnByValue: true
          });
          client.close();
          if (result.result?.value === projectAppId) { matchedPort = p; break; }
        } catch { /* skip */ }
      }
    }

    if (!matchedPort && allPorts.size === 1) {
      matchedPort = [...allPorts][0];
    }

    if (matchedPort) {
      targets = targets.filter(t => {
        if (!t.url) return false;
        const m = t.url.match(/127\.0\.0\.1:(\d+)/);
        return m && parseInt(m[1]) === matchedPort;
      });
    }
  }

  const appservice = targets.find(t =>
    t.url && t.url.includes('/appservice') && t.url.includes('mainframe')
  ) || targets.find(t =>
    t.url && t.url.includes('/appservice')
  );

  const pageframes = targets.filter(t =>
    t.url && t.url.includes('/__pageframe__/')
  );

  let pageframe = null;
  if (pageframes.length === 1) {
    pageframe = pageframes[0];
  } else if (pageframes.length > 1 && appservice) {
    try {
      const client = new CDPClient(appservice.webSocketDebuggerUrl);
      await client.connect();
      const result = await client.send('Runtime.evaluate', {
        expression: 'getCurrentPages().slice(-1)[0]?.route || ""',
        returnByValue: true
      });
      client.close();
      const currentRoute = result.result?.value;
      if (currentRoute) {
        pageframe = pageframes.find(t => t.url.includes(currentRoute));
      }
    } catch { /* fallback */ }
    if (!pageframe) pageframe = pageframes[0];
  }

  return { targets, pageframe, appservice, matchedPort };
}

// ─── 子命令: start (后台日志守护进程) ───

async function cmdStart(port, projectFilter) {
  if (!projectFilter) throw new Error('start 命令需要 --project 参数');

  // 检查是否已有守护进程
  const existingPid = getDaemonPid(projectFilter);
  if (existingPid) {
    console.log(JSON.stringify({ success: true, status: 'already_running', pid: existingPid, logFile: getLogFile(projectFilter) }));
    return;
  }

  // 创建目录
  const dir = ensureProjectDirs(projectFilter);
  const logFile = getLogFile(projectFilter);
  const pidFile = getPidFile(projectFilter);

  // 写 PID
  writeFileSync(pidFile, String(process.pid));

  // 写启动标记
  const startLine = `\n[${new Date().toISOString()}] === daemon started (pid: ${process.pid}) ===\n`;
  appendFileSync(logFile, startLine);
  process.stderr.write(`Daemon started: pid=${process.pid}, log=${logFile}\n`);
  console.log(JSON.stringify({ success: true, status: 'started', pid: process.pid, logFile, dir }));

  // 优雅退出
  const cleanup = () => {
    const line = `[${new Date().toISOString()}] === daemon stopped ===\n`;
    try { appendFileSync(logFile, line); } catch {}
    try { unlinkSync(pidFile); } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // 持久连接循环
  let retryDelay = 2000;
  while (true) {
    try {
      const { appservice } = await discoverTargets(port, projectFilter);
      if (!appservice) {
        appendFileSync(logFile, `[${new Date().toISOString()}] [daemon] 等待 appservice target...\n`);
        await sleep(retryDelay);
        retryDelay = Math.min(retryDelay * 1.5, 15000);
        continue;
      }

      retryDelay = 2000; // 连接成功，重置重试延迟
      const client = new CDPClient(appservice.webSocketDebuggerUrl);
      await client.connect();
      await client.send('Runtime.enable');
      try { await client.send('Console.enable'); } catch {}

      appendFileSync(logFile, `[${new Date().toISOString()}] [daemon] 已连接 appservice\n`);

      const seen = new Set();
      // 定期清理 seen 集合防止内存泄漏
      let seenCleanTimer = setInterval(() => seen.clear(), 30000);

      client.onEvent((msg) => {
        let type, text;
        if (msg.method === 'Runtime.consoleAPICalled') {
          const p = msg.params;
          type = p.type;
          text = p.args.map(a => a.value ?? a.description ?? `[${a.type}]`).join(' ');
        } else if (msg.method === 'Console.messageAdded') {
          const m = msg.params.message;
          type = m.level;
          text = m.text;
        } else {
          return;
        }
        const key = `${type}:${text}`;
        if (seen.has(key)) return;
        seen.add(key);
        const line = `[${new Date().toISOString()}] [${type}] ${text}\n`;
        try { appendFileSync(logFile, line); } catch {}
      });

      // 等待连接断开
      await new Promise(resolve => {
        client.onClose(() => {
          clearInterval(seenCleanTimer);
          resolve();
        });
      });

      appendFileSync(logFile, `[${new Date().toISOString()}] [daemon] 连接断开，准备重连...\n`);
    } catch (err) {
      const line = `[${new Date().toISOString()}] [daemon] 错误: ${err.message}，${retryDelay / 1000}s 后重试\n`;
      try { appendFileSync(logFile, line); } catch {}
    }
    await sleep(retryDelay);
    retryDelay = Math.min(retryDelay * 1.5, 15000);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── 子命令: stop ───

function cmdStop(projectFilter) {
  if (!projectFilter) throw new Error('stop 命令需要 --project 参数');
  const pid = getDaemonPid(projectFilter);
  if (!pid) {
    console.log(JSON.stringify({ success: true, status: 'not_running' }));
    return;
  }
  try { process.kill(pid, 'SIGTERM'); } catch {}
  // 清理 PID 文件
  const pidFile = getPidFile(projectFilter);
  try { unlinkSync(pidFile); } catch {}
  console.log(JSON.stringify({ success: true, status: 'stopped', pid }));
}

// ─── 子命令: status ───

function cmdStatus(projectFilter) {
  if (!projectFilter) throw new Error('status 命令需要 --project 参数');
  const pid = getDaemonPid(projectFilter);
  const dir = getProjectDir(projectFilter);
  const logFile = getLogFile(projectFilter);
  console.log(JSON.stringify({
    running: !!pid,
    pid: pid || null,
    dir,
    logFile,
    logExists: existsSync(logFile),
    screenshotsDir: join(dir, 'screenshots')
  }));
}

// ─── 子命令: discover ───

async function cmdDiscover(port, projectFilter) {
  const fullResp = await fetch(`http://localhost:${port}/json`);
  const allTargets = await fullResp.json();

  const extensionPages = allTargets.filter(t =>
    t.url && t.url.includes('chrome-extension://') && t.url.includes('projectpath=')
  );
  const projects = extensionPages.map(t => {
    const params = new URLSearchParams(t.url.split('?')[1] || '');
    return {
      path: decodeURIComponent(params.get('projectpath') || ''),
      name: params.get('projectname') || ''
    };
  });

  const { targets, pageframe, appservice, matchedPort } = await discoverTargets(port, projectFilter);

  const result = {
    total: allTargets.length,
    projects,
    filter: projectFilter || null,
    matchedPort: matchedPort || null,
    pageframe: pageframe ? { id: pageframe.id, url: pageframe.url, type: pageframe.type } : null,
    appservice: appservice ? { id: appservice.id, url: appservice.url, type: appservice.type } : null,
    filtered: targets.map(t => ({ id: t.id, url: t.url, type: t.type, title: t.title }))
  };
  console.log(JSON.stringify(result, null, 2));
}

// ─── 子命令: screenshot ───

async function cmdScreenshot(port, projectFilter, outputPath) {
  const { pageframe } = await discoverTargets(port, projectFilter);
  if (!pageframe) throw new Error('未找到 pageframe target。请确认开发者工具已打开项目并加载页面。');

  const client = new CDPClient(pageframe.webSocketDebuggerUrl);
  await client.connect();

  const result = await client.send('Page.captureScreenshot', { format: 'png' });

  // 按项目名组织截图目录
  let filename;
  if (outputPath) {
    filename = outputPath;
    mkdirSync(join(filename, '..'), { recursive: true });
  } else {
    const dir = projectFilter
      ? join(getProjectDir(projectFilter), 'screenshots')
      : '/tmp/mp-debug/screenshots';
    mkdirSync(dir, { recursive: true });
    filename = join(dir, `screenshot-${Date.now()}.png`);
  }

  writeFileSync(filename, Buffer.from(result.data, 'base64'));
  console.log(JSON.stringify({ success: true, path: filename }));
  client.close();
}

// ─── 子命令: logs ───

async function cmdLogs(port, projectFilter, durationSec, evalExpr) {
  const { appservice } = await discoverTargets(port, projectFilter);
  if (!appservice) throw new Error('未找到 appservice target。请确认开发者工具已打开项目。');

  const client = new CDPClient(appservice.webSocketDebuggerUrl);
  await client.connect();

  await client.send('Runtime.enable');
  try { await client.send('Console.enable'); } catch {}

  const logs = [];
  const seen = new Set();

  client.onEvent((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled') {
      const p = msg.params;
      const text = p.args.map(a => a.value ?? a.description ?? `[${a.type}]`).join(' ');
      seen.add(`${p.type}:${text}`);
      logs.push({ type: p.type, text, timestamp: p.timestamp });
      process.stderr.write(`[${p.type}] ${text}\n`);
    } else if (msg.method === 'Console.messageAdded') {
      const m = msg.params.message;
      if (!seen.has(`${m.level}:${m.text}`)) {
        logs.push({ type: m.level, text: m.text, timestamp: Date.now() });
        process.stderr.write(`[${m.level}] ${m.text}\n`);
      }
    }
  });

  let evalResult = null;
  if (evalExpr) {
    const result = await client.send('Runtime.evaluate', {
      expression: evalExpr, returnByValue: true, awaitPromise: true
    });
    evalResult = {
      success: !result.exceptionDetails,
      value: result.result?.value ?? result.result?.description
    };
  }

  await sleep(durationSec * 1000);

  const output = { success: true, count: logs.length, logs };
  if (evalResult) output.evalResult = evalResult;
  console.log(JSON.stringify(output));
  client.close();
}

// ─── 子命令: eval ───

async function cmdEval(port, projectFilter, expression) {
  const { appservice } = await discoverTargets(port, projectFilter);
  if (!appservice) throw new Error('未找到 appservice target。请确认开发者工具已打开项目。');

  const client = new CDPClient(appservice.webSocketDebuggerUrl);
  await client.connect();

  const result = await client.send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true
  });

  const output = {
    success: !result.exceptionDetails,
    value: result.result?.value ?? result.result?.description,
    type: result.result?.type
  };
  if (result.exceptionDetails) {
    output.error = result.exceptionDetails.text || result.exceptionDetails.exception?.description;
  }
  console.log(JSON.stringify(output, null, 2));
  client.close();
}

// ─── 子命令: click ───

async function cmdClick(port, projectFilter, x, y) {
  const { pageframe } = await discoverTargets(port, projectFilter);
  if (!pageframe) throw new Error('未找到 pageframe target。');

  const client = new CDPClient(pageframe.webSocketDebuggerUrl);
  await client.connect();

  const cx = parseFloat(x), cy = parseFloat(y);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });

  console.log(JSON.stringify({ success: true, x: cx, y: cy }));
  client.close();
}

// ─── 子命令: scroll ───

async function cmdScroll(port, projectFilter, deltaX, deltaY) {
  const { pageframe } = await discoverTargets(port, projectFilter);
  if (!pageframe) throw new Error('未找到 pageframe target。');

  const client = new CDPClient(pageframe.webSocketDebuggerUrl);
  await client.connect();

  try {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: 200, y: 400,
      deltaX: parseFloat(deltaX), deltaY: parseFloat(deltaY)
    });
  } catch {
    await client.send('Runtime.evaluate', {
      expression: `window.scrollBy(${parseFloat(deltaX)}, ${parseFloat(deltaY)})`
    });
  }

  console.log(JSON.stringify({ success: true, deltaX: parseFloat(deltaX), deltaY: parseFloat(deltaY) }));
  client.close();
}

// ─── 子命令: reload ───

async function cmdReload(port, projectFilter) {
  const { appservice } = await discoverTargets(port, projectFilter);
  if (!appservice) throw new Error('未找到 appservice target。');

  const client = new CDPClient(appservice.webSocketDebuggerUrl);
  await client.connect();

  const routeResult = await client.send('Runtime.evaluate', {
    expression: 'getCurrentPages().slice(-1)[0]?.route || "pages/home/home"',
    returnByValue: true
  });
  const currentRoute = routeResult.result?.value || 'pages/home/home';

  const result = await client.send('Runtime.evaluate', {
    expression: `new Promise(function(resolve) { wx.reLaunch({ url: '/${currentRoute}', success: function() { resolve('ok') }, fail: function(e) { resolve(e.errMsg) } }) })`,
    returnByValue: true,
    awaitPromise: true
  });

  console.log(JSON.stringify({ success: true, method: 'wx.reLaunch', route: currentRoute, result: result.result?.value }));
  client.close();
}

// ─── 主入口 ───

async function main() {
  try {
    switch (command) {
      case 'start':
        await cmdStart(PORT, PROJECT);
        break;
      case 'stop':
        cmdStop(PROJECT);
        break;
      case 'status':
        cmdStatus(PROJECT);
        break;
      case 'discover':
        await cmdDiscover(PORT, PROJECT);
        break;
      case 'screenshot':
        await cmdScreenshot(PORT, PROJECT, OUTPUT);
        break;
      case 'logs':
        await cmdLogs(PORT, PROJECT, DURATION, EVAL_EXPR);
        break;
      case 'eval': {
        const expr = positional.slice(1).join(' ');
        if (!expr) throw new Error('用法: mp-cdp.mjs eval "expression"');
        await cmdEval(PORT, PROJECT, expr);
        break;
      }
      case 'click': {
        const [, x, y] = positional;
        if (!x || !y) throw new Error('用法: mp-cdp.mjs click <x> <y>');
        await cmdClick(PORT, PROJECT, x, y);
        break;
      }
      case 'scroll': {
        const [, dx, dy] = positional;
        if (!dx || !dy) throw new Error('用法: mp-cdp.mjs scroll <deltaX> <deltaY>');
        await cmdScroll(PORT, PROJECT, dx, dy);
        break;
      }
      case 'reload':
        await cmdReload(PORT, PROJECT);
        break;
      default:
        console.error(`微信小程序 CDP 调试工具

用法: node mp-cdp.mjs <command> [options]

守护进程:
  start                   启动后台日志守护进程 (持续写入 console.log)
  stop                    停止守护进程
  status                  检查守护进程状态和文件路径

调试命令:
  discover                列出 CDP targets 和项目列表
  screenshot [--output=]  截取模拟器截图
  logs [--duration=5] [--eval="expr"]  读取 console 日志
  eval "expression"       执行 JS 表达式
  click <x> <y>           模拟点击
  scroll <deltaX> <deltaY> 模拟滚动
  reload                  重启小程序 (wx.reLaunch)

选项:
  --port=9333     CDP 端口 (默认 9333)
  --project=NAME  项目名 (start/stop/status 必填, 其他多项目时必填)
  --timeout=10000 超时毫秒 (默认 10000)

文件目录:
  /tmp/mp-debug/{project}/console.log        实时日志
  /tmp/mp-debug/{project}/screenshots/       截图
  /tmp/mp-debug/{project}/daemon.pid         守护进程 PID
`);
        process.exit(1);
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();
