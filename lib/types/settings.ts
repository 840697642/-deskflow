export type SettingsScope = 'global' | 'app' | 'video' | 'game'
export type SettingKey = string
export interface Setting<T = unknown> { global: T; overrides: Partial<Record<Exclude<SettingsScope, 'global'>, T>> }
export type SettingsValues = Record<SettingKey, Setting>
export interface SettingsResponse { values: Record<string, unknown>; overrides: string[] }
