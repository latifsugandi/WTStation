import type { Workspace, Template, Label, Settings } from '../types'
import { encrypt, decrypt } from './encryption'

export interface BackupData {
  version: string
  timestamp: number
  workspaces: Workspace[]
  templates: Template[]
  labels: Label[]
  settings: Settings
}

export function createBackup(data: BackupData, password: string): string {
  const json = JSON.stringify(data)
  return encrypt(json, password)
}

export function restoreBackup(encryptedData: string, password: string): BackupData {
  const json = decrypt(encryptedData, password)
  const data = JSON.parse(json) as BackupData
  
  // Validate structure
  if (!data.version || !data.timestamp || !Array.isArray(data.workspaces)) {
    throw new Error('Invalid backup format')
  }
  
  return data
}
