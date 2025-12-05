/**
 * 海报生成器
 * 用于生成分享海报
 */

const { createModuleLogger } = require('./logger/index');
const log = createModuleLogger('PosterGenerator');

class PosterGenerator {
  constructor() {
    this.canvasId = 'posterCanvas';
    this.canvasWidth = 750; // 画布宽度（rpx转px，按750设计稿）
    this.minCanvasHeight = 1334; // 最小画布高度
    this.padding = 40; // 边距
    this.lineHeight = 40; // 行高
  }

  /**
   * 生成分享海报
   * @param {Object} options - 海报配置
   * @param {string} options.cardImagePath - 卡牌图片路径
   * @param {string} options.cardName - 卡牌名称
   * @param {number} options.cardNumber - 卡牌编号
   * @param {string} options.question - 用户问题
   * @param {string} options.aiInterpretation - AI解读内容
   * @param {Object} options.canvasContext - Canvas上下文
   * @param {Object} options.canvas - Canvas对象（Canvas 2D API）
   * @param {string} options.qrCodePath - 二维码图片路径（可选）
   * @returns {Promise<string>} 海报临时文件路径
   */
  async generatePoster(options) {
    const {
      cardImagePath,
      cardName,
      cardNumber,
      question,
      aiInterpretation,
      canvasContext,
      canvas,
      qrCodePath = '/static/erweima.JPG' // 默认二维码路径
    } = options;

    try {
      log.info('generatePoster', '开始生成海报', {
        cardName,
        cardNumber,
        hasImage: !!cardImagePath,
        hasQuestion: !!question
      });

      // 预先计算内容高度，动态调整画布高度
      const calculatedHeight = await this._calculateCanvasHeight(
        canvasContext, 
        question, 
        aiInterpretation
      );
      
      const canvasHeight = Math.max(this.minCanvasHeight, calculatedHeight);

      // 设置画布尺寸
      canvas.width = this.canvasWidth;
      canvas.height = canvasHeight;

      // 清空画布
      canvasContext.clearRect(0, 0, this.canvasWidth, canvasHeight);

      // 记录当前绘制的Y坐标
      let currentY = 0;

      // 1. 绘制背景渐变
      await this._drawBackground(canvasContext, canvasHeight);
      currentY = 80; // 留出顶部空间

      // 2. 绘制标题
      currentY = await this._drawTitle(canvasContext, currentY);
      currentY += 40; // 标题与问题之间的间距

      // 3. 绘制用户问题（如果有）
      if (question) {
        currentY = await this._drawQuestion(canvasContext, question, currentY);
        currentY += 40; // 问题与卡牌之间的间距
      }

      // 4. 绘制卡牌图片
      if (cardImagePath) {
        currentY = await this._drawCardImage(canvasContext, canvas, cardImagePath, currentY);
        currentY += 30; // 卡牌与信息之间的间距
      }

      // 5. 绘制卡牌信息
      currentY = await this._drawCardInfo(canvasContext, cardName, cardNumber, currentY);
      currentY += 50; // 卡牌信息与解读之间的间距

      // 6. 绘制AI解读内容（完整显示，不截断）
      currentY = await this._drawInterpretation(canvasContext, aiInterpretation, currentY);
      currentY += 60; // 解读与底部之间的间距

      // 7. 绘制底部信息（包含二维码）
      await this._drawFooter(canvasContext, canvas, canvasHeight, qrCodePath);

      // 绘制完成，导出为图片
      log.info('generatePoster', '画布绘制完成，开始导出图片');

      return new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: canvas,
          success: (res) => {
            log.info('generatePoster', '海报生成成功', { 
              tempFilePath: res.tempFilePath 
            });
            resolve(res.tempFilePath);
          },
          fail: (err) => {
            log.error('generatePoster', '导出图片失败', err);
            reject(new Error('导出图片失败'));
          }
        });
      });
    } catch (error) {
      log.error('generatePoster', '生成海报失败', error);
      throw error;
    }
  }

  /**
   * 计算所需的画布高度
   */
  async _calculateCanvasHeight(ctx, question, interpretation) {
    let totalHeight = 0;
    
    // 顶部边距
    totalHeight += 80;
    
    // 标题高度
    totalHeight += 60;
    
    // 问题区域高度（如果有）
    if (question) {
      ctx.font = '28px sans-serif';
      const questionLines = this._wrapText(ctx, question, this.canvasWidth - 80);
      totalHeight += 40 + (questionLines.length * 36) + 40; // 标签 + 内容 + 间距
    }
    
    // 卡牌图片高度
    totalHeight += 560 + 30; // 图片高度 + 间距
    
    // 卡牌信息高度
    totalHeight += 100 + 50; // 编号和名称 + 间距
    
    // AI解读区域高度
    const cleanContent = this._cleanInterpretationContent(interpretation);
    ctx.font = '28px sans-serif';
    const interpretationLines = this._wrapText(ctx, cleanContent, this.canvasWidth - 80);
    totalHeight += 50 + (interpretationLines.length * this.lineHeight) + 60; // 标题 + 内容 + 间距
    
    // 底部信息和边距（包含二维码区域）
    // 二维码尺寸220 + 内边距24 + 文字高度30 + 间距40 + 底部边距40 = 354
    totalHeight += 354; // 增加高度以容纳二维码和文字
    
    return totalHeight;
  }

  /**
   * 绘制背景渐变
   */
  async _drawBackground(ctx, canvasHeight) {
    // 创建渐变背景（达姆森色系）
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#2d1a2e');
    gradient.addColorStop(0.5, '#3d1f3e');
    gradient.addColorStop(1, '#4d1f4e');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, canvasHeight);

    // 添加边框装饰
    ctx.strokeStyle = '#c896b4';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, this.canvasWidth - 40, canvasHeight - 40);
  }

  /**
   * 绘制标题
   */
  async _drawTitle(ctx, startY) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('生命智慧卡牌', this.canvasWidth / 2, startY + 48);
    
    return startY + 60; // 返回下一个元素的起始Y坐标
  }

  /**
   * 绘制用户问题
   */
  async _drawQuestion(ctx, question, startY) {
    const maxWidth = this.canvasWidth - 80;
    let currentY = startY;

    // 绘制"你的问题"标签
    ctx.fillStyle = '#c896b4';
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('你的问题', 40, currentY + 26);
    currentY += 40;

    // 绘制问题内容
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'left';
    
    const lines = this._wrapText(ctx, question, maxWidth);
    lines.forEach((line) => {
      ctx.fillText(line, 40, currentY + 28);
      currentY += 36; // 行高
    });

    return currentY; // 返回下一个元素的起始Y坐标
  }

  /**
   * 绘制卡牌图片
   */
  async _drawCardImage(ctx, canvas, imagePath, startY) {
    return new Promise((resolve, reject) => {
      const img = canvas.createImage();
      
      img.onload = () => {
        // 获取图片原始尺寸
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgAspectRatio = imgWidth / imgHeight;
        
        // 设置最大绘制尺寸
        const maxWidth = 400;
        const maxHeight = 560;
        
        // 根据图片宽高比计算实际绘制尺寸（保持比例，不拉伸）
        let drawWidth, drawHeight;
        if (imgAspectRatio > maxWidth / maxHeight) {
          // 图片较宽，以宽度为准
          drawWidth = maxWidth;
          drawHeight = maxWidth / imgAspectRatio;
        } else {
          // 图片较高，以高度为准
          drawHeight = maxHeight;
          drawWidth = maxHeight * imgAspectRatio;
        }
        
        // 计算居中位置
        const x = (this.canvasWidth - drawWidth) / 2;
        const y = startY;
        
        // 绘制白色背景（根据实际图片尺寸）
        const padding = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - padding, y - padding, drawWidth + padding * 2, drawHeight + padding * 2);

        // 绘制卡牌图片（保持原始宽高比）
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        
        log.info('_drawCardImage', '卡牌图片绘制完成', {
          originalSize: `${imgWidth}x${imgHeight}`,
          drawSize: `${drawWidth}x${drawHeight}`,
          aspectRatio: imgAspectRatio.toFixed(2)
        });
        resolve(y + drawHeight); // 返回下一个元素的起始Y坐标
      };

      img.onerror = (err) => {
        log.error('_drawCardImage', '加载图片失败', err);
        resolve(startY + 560); // 即使失败也继续，返回预期的高度
      };

      img.src = imagePath;
    });
  }

  /**
   * 绘制卡牌信息
   */
  async _drawCardInfo(ctx, cardName, cardNumber, startY) {
    let currentY = startY;

    // 绘制卡牌编号
    ctx.fillStyle = '#c896b4';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    const cardNumberStr = cardNumber < 10 ? `0${cardNumber}` : `${cardNumber}`;
    ctx.fillText(`【${cardNumberStr}号】`, this.canvasWidth / 2, currentY + 36);
    currentY += 50;

    // 绘制卡牌名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(cardName, this.canvasWidth / 2, currentY + 42);
    currentY += 50;

    return currentY; // 返回下一个元素的起始Y坐标
  }

  /**
   * 清理解读内容（移除卡牌信息提示）
   */
  _cleanInterpretationContent(interpretation) {
    // 移除卡牌信息提示（因为已经单独显示了）
    const hintRegex = /^您抽的这张卡牌是.*?\n\n/;
    return interpretation.replace(hintRegex, '');
  }

  /**
   * 绘制AI解读内容（完整显示，不截断）
   */
  async _drawInterpretation(ctx, interpretation, startY) {
    let currentY = startY;
    const maxWidth = this.canvasWidth - 80;

    // 绘制"AI解读"标题
    ctx.fillStyle = '#c896b4';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AI解读', 40, currentY + 32);
    currentY += 50;

    // 处理解读内容
    const content = this._cleanInterpretationContent(interpretation);

    // 设置文字样式
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'left';

    // 自动换行绘制（完整显示所有内容）
    const lines = this._wrapText(ctx, content, maxWidth);
    
    lines.forEach((line) => {
      ctx.fillText(line, 40, currentY + 28);
      currentY += this.lineHeight;
    });

    return currentY; // 返回下一个元素的起始Y坐标
  }

  /**
   * 绘制底部信息（包含二维码）
   * @param {CanvasContext} ctx - Canvas上下文
   * @param {Object} canvas - Canvas对象
   * @param {number} canvasHeight - 画布高度
   * @param {string} qrCodePath - 二维码图片路径
   */
  async _drawFooter(ctx, canvas, canvasHeight, qrCodePath) {
    const qrCodeSize = 220; // 二维码尺寸（增大以便扫描）
    const qrCodePadding = 12; // 二维码内边距（白色背景）
    const footerPadding = 40; // 底部边距
    const textSpacing = 30; // 文字和二维码之间的间距
    
    // 计算二维码位置（居中显示）
    const qrCodeY = canvasHeight - footerPadding - qrCodeSize - qrCodePadding * 2;
    
    // 绘制提示文字（在二维码上方，居中显示）
    const text = '长按保存图片，分享给朋友';
    const textY = qrCodeY - textSpacing;
    
    ctx.fillStyle = '#c896b4';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, this.canvasWidth / 2, textY);
    
    // 绘制二维码（居中显示）
    if (qrCodePath) {
      await this._drawQRCode(ctx, canvas, qrCodePath, qrCodeY, qrCodeSize, qrCodePadding);
    }
  }

  /**
   * 绘制二维码
   * @param {CanvasContext} ctx - Canvas上下文
   * @param {Object} canvas - Canvas对象
   * @param {string} qrCodePath - 二维码图片路径
   * @param {number} startY - 起始Y坐标（包含padding）
   * @param {number} qrCodeSize - 二维码尺寸
   * @param {number} padding - 二维码内边距
   */
  async _drawQRCode(ctx, canvas, qrCodePath, startY, qrCodeSize, padding) {
    return new Promise((resolve, reject) => {
      const img = canvas.createImage();
      
      img.onload = () => {
        // 计算二维码位置（居中显示）
        const totalSize = qrCodeSize + padding * 2;
        const x = (this.canvasWidth - totalSize) / 2; // 水平居中
        const y = startY + padding; // 加上内边距
        
        // 绘制白色背景（使二维码更突出）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y - padding, totalSize, totalSize);
        
        // 绘制二维码图片（保持原始宽高比）
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgAspectRatio = imgWidth / imgHeight;
        
        let drawWidth, drawHeight;
        if (imgAspectRatio > 1) {
          // 图片较宽
          drawWidth = qrCodeSize;
          drawHeight = qrCodeSize / imgAspectRatio;
        } else {
          // 图片较高或正方形
          drawHeight = qrCodeSize;
          drawWidth = qrCodeSize * imgAspectRatio;
        }
        
        // 居中绘制二维码
        const drawX = x + padding + (qrCodeSize - drawWidth) / 2;
        const drawY = y + (qrCodeSize - drawHeight) / 2;
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        
        log.info('_drawQRCode', '二维码绘制完成', {
          position: `(${x}, ${y})`,
          size: `${qrCodeSize}x${qrCodeSize}`,
          drawSize: `${drawWidth}x${drawHeight}`
        });
        resolve();
      };

      img.onerror = (err) => {
        log.error('_drawQRCode', '加载二维码失败', err);
        // 即使失败也继续，不影响整体海报生成
        resolve();
      };

      img.src = qrCodePath;
    });
  }

  /**
   * 文本自动换行
   * @param {CanvasContext} ctx - Canvas上下文
   * @param {string} text - 文本内容
   * @param {number} maxWidth - 最大宽度
   * @returns {Array<string>} 分行后的文本数组
   */
  _wrapText(ctx, text, maxWidth) {
    const lines = [];
    const paragraphs = text.split('\n');

    paragraphs.forEach(paragraph => {
      if (!paragraph) {
        lines.push('');
        return;
      }

      let line = '';
      for (let i = 0; i < paragraph.length; i++) {
        const testLine = line + paragraph[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
          lines.push(line);
          line = paragraph[i];
        } else {
          line = testLine;
        }
      }
      
      if (line) {
        lines.push(line);
      }
    });

    return lines;
  }
}

// 导出单例
const posterGenerator = new PosterGenerator();

module.exports = {
  PosterGenerator,
  posterGenerator
};

