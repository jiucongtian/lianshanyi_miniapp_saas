/**
 * Bean层统一导出
 * 提供所有Bean类的统一导入入口
 */

const { ResponseBean } = require('./ResponseBean');
const { UserBean } = require('./UserBean');
const { ProfileBean } = require('./ProfileBean');
const { BaziBean } = require('./BaziBean');

module.exports = {
  ResponseBean,
  UserBean,
  ProfileBean,
  BaziBean
};
