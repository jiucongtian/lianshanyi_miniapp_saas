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
    typeName: '临时用户',
    description: '未注册临时用户，可创建少量档案',
    permissions: ['view:cards', 'manage:profiles'],
    dailyCardDrawLimit: 0,
    maxProfiles: 3,
    canViewZhiFuPan: false,
    canUseAssistant: false,
    sortOrder: 0,
  },
  {
    typeKey: 'normal',
    typeName: '探索者',
    description: '注册用户，可使用基础功能',
    permissions: ['view:cards', 'draw:card', 'manage:profiles', 'view:daily-insight'],
    dailyCardDrawLimit: 3,
    maxProfiles: 50,
    canViewZhiFuPan: false,
    canUseAssistant: false,
    sortOrder: 1,
  },
  {
    typeKey: 'student',
    typeName: '学员',
    description: '学员用户，可使用进阶功能包括助学童子',
    permissions: [
      'view:cards',
      'draw:card',
      'manage:profiles',
      'view:daily-insight',
      'view:zhifu-pan',
      'use:assistant',
    ],
    dailyCardDrawLimit: 10,
    maxProfiles: 50,
    canViewZhiFuPan: true,
    canUseAssistant: true,
    sortOrder: 2,
  },
  {
    typeKey: 'premium',
    typeName: '高级用户',
    description: '高级用户，无限档案，可使用全部功能',
    permissions: [
      'view:cards',
      'draw:card',
      'manage:profiles',
      'view:daily-insight',
      'view:zhifu-pan',
      'use:assistant',
    ],
    dailyCardDrawLimit: 99,
    maxProfiles: -1,
    canViewZhiFuPan: true,
    canUseAssistant: true,
    sortOrder: 3,
  },
];
