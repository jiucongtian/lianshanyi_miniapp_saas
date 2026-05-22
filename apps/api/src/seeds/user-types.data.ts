export interface UserTypeSeedData {
  typeKey: string;
  typeName: string;
  description: string;
  permissions: string[];
  dailyCardDrawLimit: number;
  maxProfiles: number;
  canViewZhiFuPan: boolean;
  canUseAssistant: boolean;
  sortOrder: number;
}

export const USER_TYPES_DATA: UserTypeSeedData[] = [
  {
    typeKey: 'guest',
    typeName: '游客',
    description: '未登录游客，可浏览卡牌基础信息',
    permissions: ['view:cards'],
    dailyCardDrawLimit: 0,
    maxProfiles: 0,
    canViewZhiFuPan: false,
    canUseAssistant: false,
    sortOrder: 0,
  },
  {
    typeKey: 'normal',
    typeName: '普通用户',
    description: '注册用户，可使用基础功能',
    permissions: ['view:cards', 'draw:card', 'manage:profiles', 'view:daily-insight'],
    dailyCardDrawLimit: 3,
    maxProfiles: 3,
    canViewZhiFuPan: false,
    canUseAssistant: false,
    sortOrder: 1,
  },
  {
    typeKey: 'student',
    typeName: '学员',
    description: '学员用户，可使用进阶功能',
    permissions: [
      'view:cards',
      'draw:card',
      'manage:profiles',
      'view:daily-insight',
      'view:zhifu-pan',
    ],
    dailyCardDrawLimit: 10,
    maxProfiles: 10,
    canViewZhiFuPan: true,
    canUseAssistant: true,
    sortOrder: 2,
  },
  {
    typeKey: 'premium',
    typeName: '高级会员',
    description: '高级会员，可使用全部功能',
    permissions: [
      'view:cards',
      'draw:card',
      'manage:profiles',
      'view:daily-insight',
      'view:zhifu-pan',
      'use:assistant',
    ],
    dailyCardDrawLimit: 99,
    maxProfiles: 20,
    canViewZhiFuPan: true,
    canUseAssistant: true,
    sortOrder: 3,
  },
];
