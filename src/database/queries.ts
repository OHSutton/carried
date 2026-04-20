import { db, initDb } from './db';
import { scheduleGymDayNotification, cancelScheduledGymDayNotifications } from '../utils/notifications';

export type Exercise = {
  id: number;
  name: string;
  type: string; // 'weight' | 'time'
  notes: string;
  muscles: string; // json array
  rest_time: number;
};

export type UserTemplate = {
  id: number;
  name: string;
  exercises: string; // JSON array mapping
};

export type Plan = {
  id: number;
  name: string;
  routines: string; // JSON array of User_Template ids
  frequency_type: string; // 'free_range' | 'alternating' | 'specific_days'
  frequency_data: string; // JSON string
  is_active: number;
  current_routine_index: number;
};

export type BodyWeightEntry = {
  id: number;
  weight_kg: number;
  logged_at: number;
};

// Global Config
export const getConfig = (key: string, defaultValue: string = ''): string => {
  try {
    db.runSync('CREATE TABLE IF NOT EXISTS App_Config (key TEXT PRIMARY KEY, value TEXT)');
    const result = db.getFirstSync<{value: string}>('SELECT value FROM App_Config WHERE key = ?', [key]);
    return result ? result.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const setConfig = (key: string, value: string) => {
  try {
    db.runSync('CREATE TABLE IF NOT EXISTS App_Config (key TEXT PRIMARY KEY, value TEXT)');
    db.runSync('INSERT OR REPLACE INTO App_Config (key, value) VALUES (?, ?)', [key, value]);
  } catch(e) {}
};

const computeNextWorkoutDate = (lastSessionMs: number | null, notifSetting: string): Date | null => {
  if (notifSetting === 'never' || !lastSessionMs) return null;

  const lastDate = new Date(lastSessionMs);
  lastDate.setHours(0, 0, 0, 0);
  const targetDate = new Date(lastDate);

  if (notifSetting === 'alternating') {
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (notifSetting === 'mwf') {
    const dayOfWeek = targetDate.getDay();
    let daysToAdd = 1;
    if (dayOfWeek === 1) daysToAdd = 2;
    else if (dayOfWeek === 2) daysToAdd = 1;
    else if (dayOfWeek === 3) daysToAdd = 2;
    else if (dayOfWeek === 4) daysToAdd = 1;
    else if (dayOfWeek === 5) daysToAdd = 3;
    else if (dayOfWeek === 6) daysToAdd = 2;
    else if (dayOfWeek === 0) daysToAdd = 1;
    targetDate.setDate(targetDate.getDate() + daysToAdd);
  } else {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  targetDate.setHours(5, 0, 0, 0);
  return targetDate;
};

export const refreshScheduledGymDayNotification = async () => {
  const active = getActivePlan();
  if (!active) {
    await cancelScheduledGymDayNotifications();
    return;
  }

  let routines: number[] = [];
  try {
    routines = JSON.parse(active.routines);
  } catch (e) {}

  if (routines.length === 0) {
    await cancelScheduledGymDayNotifications();
    return;
  }

  const notifSetting = getConfig('notification_frequency', 'never');
  const nextWorkoutDate = computeNextWorkoutDate(getLastSessionTime(), notifSetting);
  if (!nextWorkoutDate) {
    await cancelScheduledGymDayNotifications();
    return;
  }

  const routineId = routines[active.current_routine_index] ?? routines[0];
  const nextRoutine = getTemplates().find((t) => t.id === routineId);
  if (!nextRoutine) {
    await cancelScheduledGymDayNotifications();
    return;
  }

  const now = new Date();
  if (nextWorkoutDate.getTime() <= now.getTime()) {
    await cancelScheduledGymDayNotifications();
    return;
  }

  await scheduleGymDayNotification(`Gym Day: ${active.name}`, `Up Next: ${nextRoutine.name}!`, nextWorkoutDate);
};

export const resetDatabase = () => {
  db.runSync('DROP TABLE IF EXISTS App_Config');
  db.runSync('DROP TABLE IF EXISTS Body_Weight_Entries');
  db.runSync('DROP TABLE IF EXISTS Exercises');
  db.runSync('DROP TABLE IF EXISTS User_Templates');
  db.runSync('DROP TABLE IF EXISTS Sessions');
  db.runSync('DROP TABLE IF EXISTS Session_Sets');
  db.runSync('DROP TABLE IF EXISTS Plans');
  initDb();
  // We can seed exercises if the user wants default schema
  addExercise('Bench Press', 'weight', '', '["Chest", "Triceps", "Front Delts"]');
  addExercise('Squat', 'weight', '', '["Quads", "Glutes", "Lower Back"]');
  addExercise('Deadlift', 'weight', '', '["Lower Back", "Hamstrings", "Traps"]');
  addExercise('Pull Up', 'weight', '', '["Lats", "Biceps", "Upper Back"]');
  void cancelScheduledGymDayNotifications();
};

// Exercises
export const getExercises = (): Exercise[] => {
  return db.getAllSync('SELECT * FROM Exercises ORDER BY name ASC');
};

export const addExercise = (name: string, type: 'weight' | 'time', notes: string, musclesStr: string = '[]', rest_time: number = 0) => {
  return db.runSync('INSERT INTO Exercises (name, type, notes, muscles, rest_time) VALUES (?, ?, ?, ?, ?)', [name, type, notes, musclesStr, rest_time]);
};

export const updateExercise = (id: number, name: string, type: string, notes: string = '', musclesStr: string = '[]', rest_time: number = 0) => {
  return db.runSync('UPDATE Exercises SET name = ?, type = ?, notes = ?, muscles = ?, rest_time = ? WHERE id = ?', [name, type, notes, musclesStr, rest_time, id]);
};

import { INITIAL_EXERCISES } from './seedData';
export const resetExercises = () => {
    const defaultNames = INITIAL_EXERCISES.map(e => e.name);
    const placeholders = defaultNames.map(() => '?').join(',');
    db.runSync(`DELETE FROM Exercises WHERE name NOT IN (${placeholders})`, defaultNames);

    const stmt = db.prepareSync('UPDATE Exercises SET type = ?, notes = ?, muscles = ?, rest_time = ? WHERE name = ?');
    for (const ex of INITIAL_EXERCISES) {
        stmt.executeSync([ex.type, ex.notes || '', JSON.stringify(ex.muscles.sort()), 0, ex.name]);
    }
    stmt.finalizeSync();

    const insertStmt = db.prepareSync('INSERT INTO Exercises (name, type, notes, muscles, rest_time) VALUES (?, ?, ?, ?, ?)');
    for (const ex of INITIAL_EXERCISES) {
        const existing = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM Exercises WHERE name = ?', [ex.name]);
        if (existing && existing.count === 0) {
            insertStmt.executeSync([ex.name, ex.type, ex.notes, JSON.stringify(ex.muscles.sort()), 0]);
        }
    }
    insertStmt.finalizeSync();
};

export const deleteExercise = (id: number) => {
  return db.runSync('DELETE FROM Exercises WHERE id = ?', [id]);
};

// Templates
export const getTemplates = (): UserTemplate[] => {
  return db.getAllSync('SELECT * FROM User_Templates ORDER BY name ASC');
};

export const addTemplate = (name: string, exercisesStr: string) => {
  return db.runSync('INSERT INTO User_Templates (name, exercises) VALUES (?, ?)', [name, exercisesStr]);
};

export const updateTemplate = (id: number, name: string, exercisesStr: string) => {
  return db.runSync('UPDATE User_Templates SET name = ?, exercises = ? WHERE id = ?', [name, exercisesStr, id]);
};

export const deleteTemplate = (id: number) => {
  return db.runSync('DELETE FROM User_Templates WHERE id = ?', [id]);
};

// Plans
export const getPlans = (): Plan[] => {
  return db.getAllSync('SELECT * FROM Plans ORDER BY name ASC');
};

export const getActivePlan = (): Plan | null => {
  return db.getFirstSync('SELECT * FROM Plans WHERE is_active = 1 LIMIT 1');
};

export const addPlan = (name: string, routinesStr: string, frequency_type: string, frequency_data: string) => {
  const result = db.runSync('INSERT INTO Plans (name, routines, frequency_type, frequency_data) VALUES (?, ?, ?, ?)', [name, routinesStr, frequency_type, frequency_data]);
  void refreshScheduledGymDayNotification();
  return result;
};

export const updatePlan = (id: number, name: string, routinesStr: string, frequency_type: string, frequency_data: string) => {
  const result = db.runSync('UPDATE Plans SET name = ?, routines = ?, frequency_type = ?, frequency_data = ? WHERE id = ?', [name, routinesStr, frequency_type, frequency_data, id]);
  void refreshScheduledGymDayNotification();
  return result;
};

export const deletePlan = (id: number) => {
  const result = db.runSync('DELETE FROM Plans WHERE id = ?', [id]);
  void refreshScheduledGymDayNotification();
  return result;
};

export const setActivePlan = (id: number | null) => {
  db.runSync('UPDATE Plans SET is_active = 0');
  if (id !== null) {
      db.runSync('UPDATE Plans SET is_active = 1 WHERE id = ?', [id]);
  }
  void refreshScheduledGymDayNotification();
};

export const advanceActivePlan = () => {
    const active = getActivePlan();
    if (!active) return;
    
    let routines = [];
    try {
        routines = JSON.parse(active.routines);
    } catch(e) {}
    if (routines.length === 0) return;

    let nextIndex = active.current_routine_index + 1;
    if (nextIndex >= routines.length) {
        nextIndex = 0; // loop back
    }
    db.runSync('UPDATE Plans SET current_routine_index = ? WHERE id = ?', [nextIndex, active.id]);

    void refreshScheduledGymDayNotification();
};

// Sessions & Sets
export const startSession = (templateId: number | null): number => {
  const result = db.runSync('INSERT INTO Sessions (template_id, start_time) VALUES (?, ?)', [templateId, Date.now()]);
  return result.lastInsertRowId as number;
};

export const endSession = (sessionId: number, durationSec: number) => {
  db.runSync('UPDATE Sessions SET end_time = ?, duration = ? WHERE id = ?', [Date.now(), durationSec, sessionId]);
  void refreshScheduledGymDayNotification();
};

export const addSet = (sessionId: number, exerciseId: number, repCount: number, weight: number, duration: number, order: number) => {
    db.runSync('INSERT INTO Sets (session_id, exercise_id, rep_count, weight, duration, set_order) VALUES (?, ?, ?, ?, ?, ?)', [sessionId, exerciseId, repCount, weight, duration, order]);
};

export const deleteSet = (setId: number) => {
    db.runSync('DELETE FROM Sets WHERE id = ?', [setId]);
};

export const deleteSession = (sessionId: number) => {
    db.runSync('DELETE FROM Sets WHERE session_id = ?', [sessionId]);
    db.runSync('DELETE FROM Sessions WHERE id = ?', [sessionId]);
};

export const resetHistory = () => {
    db.runSync('DELETE FROM Sets');
    db.runSync('DELETE FROM Sessions');
    void refreshScheduledGymDayNotification();
};

export const getSessions = (): any[] => {
    return db.getAllSync('SELECT s.*, t.name as template_name FROM Sessions s LEFT JOIN User_Templates t ON s.template_id = t.id WHERE s.end_time IS NOT NULL ORDER BY s.start_time DESC');
};

export const getLastSessionTime = (): number | null => {
    const row = db.getFirstSync<{start_time: number}>('SELECT start_time FROM Sessions WHERE end_time IS NOT NULL ORDER BY start_time DESC LIMIT 1');
    return row ? row.start_time : null;
};

export const getSessionSets = (sessionId: number): any[] => {
    return db.getAllSync(`
        SELECT s.*, 
        IFNULL(e.name, 'Deleted Exercise') as exercise_name, 
        IFNULL(e.type, 'weight') as exercise_type 
        FROM Sets s LEFT JOIN Exercises e ON s.exercise_id = e.id 
        WHERE s.session_id = ? ORDER BY s.set_order ASC
    `, [sessionId]);
};

export const getPrevExercisePerformance = (exerciseId: number): any[] => {
    // Finds the absolute most recent completed Session that explicitly logged this exact exercise.
    const lastSession = db.getFirstSync<{session_id: number}>(`
        SELECT s.session_id 
        FROM Sets s 
        JOIN Sessions sess ON s.session_id = sess.id 
        WHERE s.exercise_id = ? AND sess.end_time IS NOT NULL 
        ORDER BY sess.start_time DESC LIMIT 1
    `, [exerciseId]);

    if (!lastSession) return [];

    // Pull the exact sets logged for that session.
    return db.getAllSync(`
        SELECT * FROM Sets 
        WHERE session_id = ? AND exercise_id = ? 
        ORDER BY set_order ASC
    `, [lastSession.session_id, exerciseId]);
};

export const getExerciseProgression = (exerciseId: number): { date_ms: number, volume: number }[] => {
    return db.getAllSync<{ date_ms: number, volume: number }>(`
        SELECT sess.start_time as date_ms, SUM(s.weight * s.rep_count) as volume
        FROM Sets s
        JOIN Sessions sess ON s.session_id = sess.id
        WHERE s.exercise_id = ? AND sess.end_time IS NOT NULL AND s.weight > 0
        GROUP BY sess.id
        ORDER BY sess.start_time ASC
    `, [exerciseId]);
};

export const getRoutineProgression = (templateId: number): { date_ms: number, volume: number }[] => {
    return db.getAllSync<{ date_ms: number, volume: number }>(`
        SELECT sess.start_time as date_ms, SUM(s.weight * s.rep_count) as volume
        FROM Sets s
        JOIN Sessions sess ON s.session_id = sess.id
        WHERE sess.template_id = ? AND sess.end_time IS NOT NULL AND s.weight > 0
        GROUP BY sess.id
        ORDER BY sess.start_time ASC
    `, [templateId]);
};

export const addBodyWeightEntry = (weightKg: number, loggedAt: number = Date.now()) => {
    return db.runSync(
      'INSERT INTO Body_Weight_Entries (weight_kg, logged_at) VALUES (?, ?)',
      [weightKg, loggedAt],
    );
};

export const getBodyWeightEntries = (): BodyWeightEntry[] => {
    return db.getAllSync<BodyWeightEntry>(
      'SELECT * FROM Body_Weight_Entries ORDER BY logged_at ASC',
    );
};

export const deleteBodyWeightEntry = (id: number) => {
    return db.runSync('DELETE FROM Body_Weight_Entries WHERE id = ?', [id]);
};

export const resetBodyWeightEntries = () => {
    return db.runSync('DELETE FROM Body_Weight_Entries');
};
