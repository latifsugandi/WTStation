import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { Workspace, Session, Template, Label, ChatLabel, Settings } from '@shared/types'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'database.sqlite')
  
  db = new Database(dbPath)
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL')
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'whatsapp',
      color TEXT,
      icon TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL,
      name TEXT NOT NULL,
      partition TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'disconnected',
      qrCode TEXT,
      unreadCount INTEGER DEFAULT 0,
      lastActiveAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      variables TEXT,
      category TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_labels (
      sessionId TEXT NOT NULL,
      chatId TEXT NOT NULL,
      labelId TEXT NOT NULL,
      PRIMARY KEY (sessionId, chatId, labelId),
      FOREIGN KEY (labelId) REFERENCES labels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspaceId);
    CREATE INDEX IF NOT EXISTS idx_chat_labels_session ON chat_labels(sessionId, chatId);
  `)
  
  // Migration: Add 'type' column to workspaces table if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(workspaces)").all() as Array<{ name: string }>
    const hasTypeColumn = tableInfo.some((col) => col.name === 'type')
    
    if (!hasTypeColumn) {
      console.log('[Database] Adding type column to workspaces table...')
      // SQLite doesn't support NOT NULL with DEFAULT in ALTER TABLE ADD COLUMN
      // So we add it as nullable first, then update existing rows, then make it NOT NULL
      db.exec('ALTER TABLE workspaces ADD COLUMN type TEXT')
      // Update existing workspaces to have default type
      db.exec("UPDATE workspaces SET type = 'whatsapp' WHERE type IS NULL")
      // Note: SQLite doesn't support ALTER COLUMN, so we'll handle NULL checks in application code
      console.log('[Database] Type column added successfully')
    }
  } catch (error) {
    console.error('[Database] Migration error:', error)
    // If migration fails, we'll handle it gracefully in queries
  }
  
  // Initialize default settings
  const defaultSettings: Partial<Settings> = {
    theme: 'system',
    language: 'en',
    startup: false,
    minimizeToTray: true,
    notificationsEnabled: true,
    lockEnabled: false,
    lockTimeout: 300000, // 5 minutes
    autoUpdate: true,
    checkUpdateInterval: 3600000, // 1 hour
  }
  
  const stmt = db.prepare('SELECT COUNT(*) as count FROM settings')
  const count = stmt.get() as { count: number }
  
  if (count.count === 0) {
    const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
    Object.entries(defaultSettings).forEach(([key, value]) => {
      insert.run(key, JSON.stringify(value))
    })
  }
  
  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
