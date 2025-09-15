const fs = require('fs');
const path = require('path');

/**
 * 构建脚本 - 根据环境配置自动替换项目中的配置文件
 * 使用方法: node config/build.js [environment]
 * 例如: node config/build.js new-account
 */

class ConfigBuilder {
  constructor() {
    this.rootPath = path.join(__dirname, '..');
    this.configPath = path.join(__dirname, 'environments');
  }

  /**
   * 加载环境配置
   */
  loadEnvironmentConfig(env) {
    const configFile = path.join(this.configPath, `${env}.json`);
    
    if (!fs.existsSync(configFile)) {
      throw new Error(`环境配置文件不存在: ${configFile}`);
    }
    
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    console.log(`📋 加载环境配置: ${config.name}`);
    return config;
  }


  /**
   * 更新 project.config.json
   */
  updateProjectConfig(config) {
    const filePath = path.join(this.rootPath, 'project.config.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const projectConfig = JSON.parse(content);
    
    projectConfig.appid = config.appId;
    projectConfig.projectname = config.projectName;
    
    fs.writeFileSync(filePath, JSON.stringify(projectConfig, null, 2));
    console.log('✅ 更新 project.config.json');
  }

  /**
   * 更新 project.private.config.json
   */
  updatePrivateConfig(config) {
    const filePath = path.join(this.rootPath, 'project.private.config.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const privateConfig = JSON.parse(content);
    
    privateConfig.projectname = config.projectName;
    
    fs.writeFileSync(filePath, JSON.stringify(privateConfig, null, 2));
    console.log('✅ 更新 project.private.config.json');
  }

  /**
   * 更新 app.js
   */
  updateAppJs(config) {
    const filePath = path.join(this.rootPath, 'miniprogram/app.js');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 替换云环境ID
    content = content.replace(
      /env:\s*['"][\w-]+['"],?\s*\/\/.*$/m,
      `env: '${config.cloudEnvId}', // 云环境ID - 由构建脚本自动生成`
    );
    
    fs.writeFileSync(filePath, content);
    console.log('✅ 更新 miniprogram/app.js');
  }

  /**
   * 更新云开发配置
   */
  updateCloudbaseConfig(config) {
    const filePath = path.join(this.rootPath, 'cloudbase/cloudbaserc.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const cloudConfig = JSON.parse(content);
    
    cloudConfig.envId = config.cloudEnvId;
    
    // 更新云函数环境变量
    if (cloudConfig.functions && cloudConfig.functions.length > 0) {
      cloudConfig.functions.forEach(func => {
        if (func.envVariables) {
          func.envVariables.COZE_TOKEN = config.cloudConfig.cozeToken;
          func.envVariables.COZE_BASE_URL = config.cloudConfig.cozeBaseUrl;
          func.envVariables.COZE_WORKFLOW_ID = config.cloudConfig.cozeWorkflowId;
        }
      });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(cloudConfig, null, 2));
    console.log('✅ 更新 cloudbase/cloudbaserc.json');
  }

  /**
   * 更新小程序配置
   */
  updateMiniprogramConfig(config) {
    const configFilePath = path.join(this.rootPath, 'miniprogram/config.js');
    let content = fs.readFileSync(configFilePath, 'utf8');
    
    // 替换配置
    content = content.replace(
      /isMock:\s*(true|false)/,
      `isMock: ${config.debug.useMock}`
    );
    
    fs.writeFileSync(configFilePath, content);
    console.log('✅ 更新 miniprogram/config.js');
    
    // 更新 config/index.js
    const indexConfigPath = path.join(this.rootPath, 'miniprogram/config/index.js');
    let indexContent = fs.readFileSync(indexConfigPath, 'utf8');
    
    indexContent = indexContent.replace(
      /useMock:\s*(true|false)/,
      `useMock: ${config.debug.useMock}`
    ).replace(
      /debugMode:\s*(true|false)/,
      `debugMode: ${config.debug.debugMode}`
    );
    
    fs.writeFileSync(indexConfigPath, indexContent);
    console.log('✅ 更新 miniprogram/config/index.js');
  }

  /**
   * 更新 package.json
   */
  updatePackageJson(config) {
    const filePath = path.join(this.rootPath, 'miniprogram/package.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const packageConfig = JSON.parse(content);
    
    packageConfig.name = config.packageName;
    
    fs.writeFileSync(filePath, JSON.stringify(packageConfig, null, 2));
    console.log('✅ 更新 miniprogram/package.json');
  }

  /**
   * 执行构建
   */
  build(environment) {
    try {
      console.log(`🚀 开始构建环境: ${environment}`);
      console.log('='.repeat(50));
      
      const config = this.loadEnvironmentConfig(environment);
      
      this.updateProjectConfig(config);
      this.updatePrivateConfig(config);
      this.updateAppJs(config);
      this.updateCloudbaseConfig(config);
      this.updateMiniprogramConfig(config);
      this.updatePackageJson(config);
      
      console.log('='.repeat(50));
      console.log('🎉 构建完成！');
      console.log('📝 请检查以下文件的更改:');
      console.log('   - project.config.json');
      console.log('   - project.private.config.json');
      console.log('   - miniprogram/app.js');
      console.log('   - cloudbase/cloudbaserc.json');
      console.log('   - miniprogram/config.js');
      console.log('   - miniprogram/config/index.js');
      console.log('   - miniprogram/package.json');
      
    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      process.exit(1);
    }
  }
}

// 命令行执行
if (require.main === module) {
  const environment = process.argv[2];
  
  if (!environment) {
    console.log('使用方法: node config/build.js [environment]');
    console.log('可用环境:');
    
    const configPath = path.join(__dirname, 'environments');
    const envFiles = fs.readdirSync(configPath).filter(file => file.endsWith('.json'));
    
    envFiles.forEach(file => {
      const envName = path.basename(file, '.json');
      const config = JSON.parse(fs.readFileSync(path.join(configPath, file), 'utf8'));
      console.log(`  - ${envName}: ${config.name}`);
    });
    
    process.exit(1);
  }
  
  const builder = new ConfigBuilder();
  builder.build(environment);
}

module.exports = ConfigBuilder;
