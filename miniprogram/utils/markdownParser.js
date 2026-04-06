/**
 * 轻量级 Markdown → HTML 转换器
 * 用于微信小程序 rich-text 组件渲染
 *
 * 支持：标题、加粗、斜体、行内代码、代码块、有序/无序列表、表格、分割线、段落
 *
 * 注意：rich-text 组件无法继承父组件 CSS，所有样式必须内联。
 */

// ==================== 主题颜色（与 chat-message/index.less 保持一致）====================
const C = {
  primary:   '#854C65',
  textMain:  '#3D3040',
  textSub:   '#6B5B62',
};

// ==================== 内联样式表 ====================
const S = {
  h1: `display:block;font-size:18px;font-weight:700;color:${C.primary};margin:10px 0 5px;line-height:1.4;`,
  h2: `display:block;font-size:16px;font-weight:700;color:${C.primary};margin:10px 0 5px;line-height:1.4;`,
  h3: `display:block;font-size:15px;font-weight:700;color:${C.primary};margin:8px 0 4px;line-height:1.4;`,
  h4: `display:block;font-size:14px;font-weight:700;color:${C.primary};margin:6px 0 4px;line-height:1.4;`,
  h5: `display:block;font-size:13px;font-weight:700;color:${C.primary};margin:6px 0 4px;line-height:1.4;`,
  h6: `display:block;font-size:13px;font-weight:700;color:${C.textSub};margin:6px 0 4px;line-height:1.4;`,

  p:      `display:block;font-size:14px;line-height:1.75;color:${C.textMain};margin:0 0 6px;`,
  strong: `font-weight:700;color:${C.textMain};`,
  em:     `font-style:italic;color:${C.textSub};`,

  code:    `font-size:12px;background:rgba(133,76,101,0.1);color:${C.primary};padding:1px 5px;border-radius:3px;font-family:monospace;`,
  pre:     `display:block;background:rgba(61,48,64,0.06);border-radius:8px;padding:10px 14px;margin:8px 0;overflow-x:auto;`,
  preCode: `display:block;font-size:12px;color:${C.textMain};font-family:monospace;white-space:pre;background:none;padding:0;border-radius:0;`,

  ul:    `display:block;margin:4px 0 8px;padding-left:0;`,
  ol:    `display:block;margin:4px 0 8px;padding-left:0;`,
  li:    `display:block;font-size:14px;line-height:1.7;color:${C.textMain};margin-bottom:4px;padding-left:16px;`,

  hr:    `display:block;border:none;border-top:1px solid rgba(133,76,101,0.2);margin:10px 0;`,

  table: `display:table;width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;`,
  thead: `display:table-header-group;`,
  tbody: `display:table-row-group;`,
  tr:    `display:table-row;`,
  th:    `display:table-cell;border:1px solid rgba(133,76,101,0.2);padding:5px 8px;background:rgba(133,76,101,0.08);font-weight:700;color:${C.primary};text-align:left;`,
  td:    `display:table-cell;border:1px solid rgba(133,76,101,0.2);padding:5px 8px;text-align:left;color:${C.textMain};`,
};

// ==================== 工具函数 ====================

/**
 * 转义 HTML 特殊字符，防止 XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 处理行内格式：行内代码、加粗、斜体
 * @param {string} line
 * @returns {string}
 */
function parseInline(line) {
  // 行内代码（优先处理，避免内部内容被其他规则误处理）
  line = line.replace(/`([^`]+)`/g, (_, code) =>
    `<code style="${S.code}">${escapeHtml(code)}</code>`
  );
  // 加粗
  line = line.replace(/\*\*([^*]+)\*\*/g, `<strong style="${S.strong}">$1</strong>`);
  line = line.replace(/__([^_]+)__/g, `<strong style="${S.strong}">$1</strong>`);
  // 斜体
  line = line.replace(/\*([^*]+)\*/g, `<em style="${S.em}">$1</em>`);
  line = line.replace(/_([^_]+)_/g, `<em style="${S.em}">$1</em>`);
  return line;
}

/**
 * 解析表格
 * @param {string[]} tableLines
 * @returns {string}
 */
function parseTable(tableLines) {
  if (tableLines.length < 2) return tableLines.map(l => escapeHtml(l)).join('<br/>');

  const parseRow = (line) =>
    line
      .replace(/^\||\|$/g, '')
      .split('|')
      .map(cell => cell.trim());

  const headers = parseRow(tableLines[0]);
  // tableLines[1] 是分隔行（:---:|---:等），跳过
  const rows = tableLines.slice(2);

  const headerHtml = headers
    .map(h => `<th style="${S.th}">${parseInline(escapeHtml(h))}</th>`)
    .join('');

  const rowsHtml = rows
    .map(row => {
      const cells = parseRow(row);
      return `<tr style="${S.tr}">${cells.map(c => `<td style="${S.td}">${parseInline(escapeHtml(c))}</td>`).join('')}</tr>`;
    })
    .join('');

  return `<table style="${S.table}"><thead style="${S.thead}"><tr style="${S.tr}">${headerHtml}</tr></thead><tbody style="${S.tbody}">${rowsHtml}</tbody></table>`;
}

// ==================== 主转换函数 ====================

/**
 * 将 Markdown 字符串转换为带内联样式的 HTML 字符串
 * @param {string} markdown
 * @returns {string}
 */
function markdownToHtml(markdown) {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const result = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── 代码块 ```...``` ──
    if (line.trimStart().startsWith('```')) {
      const lang = line.replace(/^```/, '').trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      const langAttr = lang ? ` class="language-${lang}"` : '';
      result.push(
        `<pre style="${S.pre}"><code${langAttr} style="${S.preCode}">${codeLines.join('\n')}</code></pre>`
      );
      i++; // 跳过结束 ```
      continue;
    }

    // ── 表格 ──
    if (/^\|.+\|/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      result.push(parseTable(tableLines));
      continue;
    }

    // ── 无序列表 ──
    if (/^[-*+] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        const text = parseInline(escapeHtml(lines[i].replace(/^[-*+] /, '')));
        items.push(`<li style="${S.li}">• ${text}</li>`);
        i++;
      }
      result.push(`<ul style="${S.ul}">${items.join('')}</ul>`);
      continue;
    }

    // ── 有序列表 ──
    if (/^\d+\. /.test(line)) {
      const items = [];
      let idx = 1;
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const text = parseInline(escapeHtml(lines[i].replace(/^\d+\. /, '')));
        items.push(`<li style="${S.li}">${idx}. ${text}</li>`);
        i++;
        idx++;
      }
      result.push(`<ol style="${S.ol}">${items.join('')}</ol>`);
      continue;
    }

    // ── 标题 ──
    const headingMatch = line.match(/^(#{1,6}) (.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = parseInline(escapeHtml(headingMatch[2].trim()));
      const key = `h${level}`;
      result.push(`<h${level} style="${S[key] || S.h6}">${text}</h${level}>`);
      i++;
      continue;
    }

    // ── 分割线 ──
    if (/^[-*_]{3,}$/.test(line.trim())) {
      result.push(`<hr style="${S.hr}"/>`);
      i++;
      continue;
    }

    // ── 空行 → 段落分隔 ──
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── 普通段落：收集连续非空行合并为 <p> ──
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6}) /.test(lines[i]) &&
      !/^[-*+] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^\|.+\|/.test(lines[i]) &&
      !/^[-*_]{3,}$/.test(lines[i].trim()) &&
      !lines[i].trimStart().startsWith('```')
    ) {
      paraLines.push(parseInline(escapeHtml(lines[i])));
      i++;
    }
    if (paraLines.length > 0) {
      result.push(`<p style="${S.p}">${paraLines.join('<br/>')}</p>`);
    }
  }

  return result.join('');
}

module.exports = { markdownToHtml };
