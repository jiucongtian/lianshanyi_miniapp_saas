/**
 * Bean层统一导出
 * 提供所有Bean类的统一导入入口
 */

const { BaseBean } = require('./BaseBean');
const { ResponseBean } = require('./ResponseBean');
const { UserBean } = require('./UserBean');
const { ProfileBean } = require('./ProfileBean');
const { BaziBean } = require('./BaziBean');
const { PaymentBean } = require('./PaymentBean');
const { FeedbackBean } = require('./FeedbackBean');
const { FunctionQuotaBean } = require('./FunctionQuotaBean');
const { FunctionProductBean } = require('./FunctionProductBean');

module.exports = {
  BaseBean,
  ResponseBean,
  UserBean,
  ProfileBean,
  BaziBean,
  PaymentBean,
  FeedbackBean,
  FunctionQuotaBean,
  FunctionProductBean
};
