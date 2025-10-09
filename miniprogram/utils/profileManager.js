/**
 * 全局ProfileBean管理器
 * 统一管理ProfileBean实例和数组，供各个页面调用
 */

const { ProfileBean } = require('../beans/ProfileBean');

class ProfileManager {
  constructor() {
    this.currentProfile = null; // 当前选中的档案
    this.profileList = []; // 档案列表
    this.isInitialized = false;
  }

  /**
   * 初始化档案管理器
   * @param {Array} profileDataList - 原始档案数据列表
   */
  initialize(profileDataList = []) {
    console.log('[ProfileManager] 初始化档案管理器，数据量:', profileDataList.length);
    
    try {
      // 将原始数据转换为ProfileBean实例
      this.profileList = profileDataList.map(data => new ProfileBean(data));
      this.isInitialized = true;
      
      console.log('[ProfileManager] 档案管理器初始化完成，档案数量:', this.profileList.length);
    } catch (error) {
      console.error('[ProfileManager] 初始化失败:', error);
      this.profileList = [];
      this.isInitialized = false;
    }
  }

  /**
   * 获取档案列表
   * @returns {Array<ProfileBean>} ProfileBean实例数组
   */
  getProfileList() {
    return this.profileList;
  }

  /**
   * 根据ID获取档案
   * @param {string} profileId - 档案ID
   * @returns {ProfileBean|null} ProfileBean实例或null
   */
  getProfileById(profileId) {
    return this.profileList.find(profile => profile._id === profileId) || null;
  }

  /**
   * 设置当前档案
   * @param {string|ProfileBean} profile - 档案ID或ProfileBean实例
   * @returns {boolean} 是否设置成功
   */
  setCurrentProfile(profile) {
    try {
      if (typeof profile === 'string') {
        // 传入的是ID
        this.currentProfile = this.getProfileById(profile);
      } else if (profile && typeof profile.toCardDisplayData === 'function') {
        // 传入的是ProfileBean实例
        this.currentProfile = profile;
      } else {
        // 传入的是原始数据，转换为ProfileBean
        this.currentProfile = new ProfileBean(profile);
      }
      
      console.log('[ProfileManager] 设置当前档案:', this.currentProfile?.profileName);
      return this.currentProfile !== null;
    } catch (error) {
      console.error('[ProfileManager] 设置当前档案失败:', error);
      return false;
    }
  }

  /**
   * 获取当前档案
   * 如果没有当前档案，则返回profile列表的第一个档案
   * @returns {ProfileBean|null} 当前档案实例
   */
  getCurrentProfile() {
    // 如果有当前档案，直接返回
    if (this.currentProfile) {
      return this.currentProfile;
    }
    
    // 如果没有当前档案，返回列表中的第一个档案
    if (this.profileList.length > 0) {
      console.log('[ProfileManager] 没有当前档案，返回第一个档案:', this.profileList[0].profileName);
      return this.profileList[0];
    }
    
    // 如果列表为空，返回null
    return null;
  }

  /**
   * 添加新档案
   * @param {Object|ProfileBean} profileData - 档案数据或ProfileBean实例
   * @returns {boolean} 是否添加成功
   */
  addProfile(profileData) {
    try {
      let profileBean;
      if (profileData && typeof profileData.toCardDisplayData === 'function') {
        // 已经是ProfileBean实例
        profileBean = profileData;
      } else {
        // 原始数据，转换为ProfileBean
        profileBean = new ProfileBean(profileData);
      }
      
      this.profileList.push(profileBean);
      console.log('[ProfileManager] 添加新档案:', profileBean.profileName);
      return true;
    } catch (error) {
      console.error('[ProfileManager] 添加档案失败:', error);
      return false;
    }
  }

  /**
   * 删除档案
   * @param {string} profileId - 档案ID
   * @returns {boolean} 是否删除成功
   */
  removeProfile(profileId) {
    try {
      const index = this.profileList.findIndex(profile => profile._id === profileId);
      if (index !== -1) {
        const removedProfile = this.profileList.splice(index, 1)[0];
        console.log('[ProfileManager] 删除档案:', removedProfile.profileName);
        
        // 如果删除的是当前档案，清空当前档案
        if (this.currentProfile && this.currentProfile._id === profileId) {
          this.currentProfile = null;
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ProfileManager] 删除档案失败:', error);
      return false;
    }
  }

  /**
   * 更新档案
   * @param {string} profileId - 档案ID
   * @param {Object} updateData - 更新数据
   * @returns {boolean} 是否更新成功
   */
  updateProfile(profileId, updateData) {
    try {
      const profile = this.getProfileById(profileId);
      if (profile) {
        // 更新ProfileBean实例的数据
        Object.assign(profile, updateData);
        console.log('[ProfileManager] 更新档案:', profile.profileName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ProfileManager] 更新档案失败:', error);
      return false;
    }
  }

  /**
   * 清空所有数据
   */
  clear() {
    this.currentProfile = null;
    this.profileList = [];
    this.isInitialized = false;
    console.log('[ProfileManager] 清空所有档案数据');
  }

  /**
   * 获取档案数量
   * @returns {number} 档案数量
   */
  getProfileCount() {
    return this.profileList.length;
  }

  /**
   * 检查是否已初始化
   * @returns {boolean} 是否已初始化
   */
  isReady() {
    return this.isInitialized;
  }
}

// 创建全局单例
const profileManager = new ProfileManager();

module.exports = {
  ProfileManager,
  profileManager
};
