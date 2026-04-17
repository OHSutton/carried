import * as SQLite from 'expo-sqlite';
import { INITIAL_EXERCISES } from './seedData';

export const db = SQLite.openDatabaseSync('gymApp_v2.db');

export const initDb = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS App_Config (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS Exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'weight' or 'time'
        notes TEXT,
        muscles TEXT, -- JSON array of strings
        rest_time INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS User_Templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        exercises TEXT -- JSON array mapping
    );
    
    CREATE TABLE IF NOT EXISTS Plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        routines TEXT, -- JSON array of User_Template ids
        frequency_type TEXT, -- e.g. 'free_range', 'alternating', 'specific_days'
        frequency_data TEXT, -- JSON obj e.g. {"days":["Mon","Wed"]} or start dates
        is_active INTEGER DEFAULT 0,
        current_routine_index INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS Sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS Sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        rep_count INTEGER,
        weight REAL,
        duration INTEGER,
        set_order INTEGER,
        FOREIGN KEY(session_id) REFERENCES Sessions(id),
        FOREIGN KEY(exercise_id) REFERENCES Exercises(id)
    );

    CREATE TABLE IF NOT EXISTS Body_Weight_Entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weight_kg REAL NOT NULL,
        logged_at INTEGER NOT NULL
    );
  `);

  try { db.execSync("ALTER TABLE Exercises ADD COLUMN muscles TEXT;"); } catch(e) {}
  try { db.execSync("ALTER TABLE Exercises ADD COLUMN rest_time INTEGER DEFAULT 0;"); } catch(e) {}

  // Seed any missing standard exercises
  const stmt = db.prepareSync('INSERT INTO Exercises (name, type, notes, muscles, rest_time) VALUES (?, ?, ?, ?, ?)');
  
  for (const ex of INITIAL_EXERCISES) {
      const existing = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM Exercises WHERE name = ?', [ex.name]);
      if (existing && existing.count === 0) {
          stmt.executeSync([ex.name, ex.type, ex.notes, JSON.stringify(ex.muscles.sort()), 0]);
      }
  }
  stmt.finalizeSync();
};
