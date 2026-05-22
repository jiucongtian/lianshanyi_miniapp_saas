export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error?: string | null
  message?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

export interface User {
  id: string
  _id?: string
  username?: string
  phone?: string
  nickname?: string
  avatarUrl?: string
  avatar?: string
  userType: string // 'guest' | 'normal' | 'student' | 'premium'
  isAdmin: boolean
  isGuest: boolean
  createdAt: string
  updatedAt: string
}

export interface UserType {
  id: string
  name: string
  label: string
  description?: string
}

export interface Profile {
  id: string
  userId: string
  name: string
  gender: 'male' | 'female'
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number
  isLunar: boolean
  notes?: string
  isDefault: boolean
  baziResult?: BaziResult
  createdAt: string
  updatedAt: string
}

export interface ProfileFormData {
  name: string
  gender: 'male' | 'female'
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number
  isLunar: boolean
  notes?: string
}

export interface BaziResult {
  yearPillar: Pillar
  monthPillar: Pillar
  dayPillar: Pillar
  hourPillar: Pillar
  dayMaster: string
  wuXingSummary: WuXingSummary
}

export interface Pillar {
  stem: string
  branch: string
  stemWuXing: WuXing
  branchWuXing: WuXing
  nayin?: string
}

export type WuXing = '木' | '火' | '土' | '金' | '水'

export interface WuXingSummary {
  木: number
  火: number
  土: number
  金: number
  水: number
}

export interface StaticCard {
  id: string
  name: string
  stem: string
  branch: string
  stemWuXing: WuXing
  branchWuXing: WuXing
  nayin: string
  description: string
  sequence: number
}

export interface DrawCardRecord {
  id: string
  userId: string
  profileId?: string
  card: StaticCard
  question?: string
  interpretation: string
  createdAt: string
}

export interface DailyInsight {
  date: string
  cardName: string
  dayStem: string
  dayBranch: string
  title: string
  summary: string
  fullText: string
  luckyDirection?: string
  luckyColor?: string
  luckyNumber?: number
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Feedback {
  id: string
  userId: string
  content: string
  contact?: string
  status: 'pending' | 'replied' | 'closed'
  reply?: string
  repliedAt?: string
  createdAt: string
  updatedAt: string
}
