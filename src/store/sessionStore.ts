import { create } from 'zustand';
import { db } from '../database/db';
import { cancelRestTimerNotification, scheduleRestTimerNotification } from '../utils/notifications';

const SESSION_STATE_KEY = 'active_session_state';

type PersistedSessionState = {
  isActive: boolean;
  isPaused: boolean;
  sessionId: number | null;
  workoutName: string | null;
  startTime: number | null;
  accumulatedSeconds: number;
  lastTickTime: number | null;
  restSecondsLeft: number;
};

const ensureConfigTable = () => {
  db.runSync('CREATE TABLE IF NOT EXISTS App_Config (key TEXT PRIMARY KEY, value TEXT)');
};

const loadPersistedSession = (): PersistedSessionState | null => {
  try {
    ensureConfigTable();
    const row = db.getFirstSync<{ value: string }>('SELECT value FROM App_Config WHERE key = ?', [SESSION_STATE_KEY]);
    return row ? JSON.parse(row.value) : null;
  } catch (e) {
    return null;
  }
};

const persistSession = (state: PersistedSessionState) => {
  try {
    ensureConfigTable();
    db.runSync('INSERT OR REPLACE INTO App_Config (key, value) VALUES (?, ?)', [
      SESSION_STATE_KEY,
      JSON.stringify(state),
    ]);
  } catch (e) {}
};

const clearPersistedSession = () => {
  try {
    ensureConfigTable();
    db.runSync('DELETE FROM App_Config WHERE key = ?', [SESSION_STATE_KEY]);
  } catch (e) {}
};

const syncRestTimerNotification = (state: { restSecondsLeft: number; workoutName: string | null; isPaused: boolean }) => {
  if (state.isPaused || state.restSecondsLeft <= 0) {
    void cancelRestTimerNotification();
    return;
  }

  void scheduleRestTimerNotification(
    'Rest Complete',
    `${state.workoutName || 'Workout'}: time for your next set.`,
    state.restSecondsLeft,
  );
};

const persistedState = loadPersistedSession();

export type ActiveSessionState = {
  isActive: boolean;
  isPaused: boolean;
  sessionId: number | null;
  workoutName: string | null;
  startTime: number | null;
  accumulatedSeconds: number;
  lastTickTime: number | null;
  
  restSecondsLeft: number;
  
  startSession: (sessionId: number, name: string) => void;
  tick: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  startRestTimer: (seconds: number) => void;
  modifyRestTimer: (delta: number) => void;
};

export const useSessionStore = create<ActiveSessionState>((set) => ({
  isActive: persistedState?.isActive ?? false,
  isPaused: persistedState?.isPaused ?? false,
  sessionId: persistedState?.sessionId ?? null,
  workoutName: persistedState?.workoutName ?? null,
  startTime: persistedState?.startTime ?? null,
  accumulatedSeconds: persistedState?.accumulatedSeconds ?? 0,
  lastTickTime: persistedState?.lastTickTime ?? null,
  restSecondsLeft: persistedState?.restSecondsLeft ?? 0,
  
  startSession: (id, name) => set(() => {
      const nextState = {
      isActive: true,
      isPaused: false,
      sessionId: id,
      workoutName: name,
      startTime: Date.now(),
      lastTickTime: Date.now(),
      accumulatedSeconds: 0,
      restSecondsLeft: 0,
    };
      persistSession(nextState);
      void cancelRestTimerNotification();
      return nextState;
  }),
  
  pauseSession: () => set((state) => {
      const nextState = { ...state, isPaused: true };
      persistSession(nextState);
      void cancelRestTimerNotification();
      return { isPaused: true };
  }),
  
  resumeSession: () => set((state) => ({ 
      ...(persistSession({
        ...state,
        isPaused: false,
        lastTickTime: Date.now(),
      }), {}),
      ...(syncRestTimerNotification({
        ...state,
        isPaused: false,
      }), {}),
      isPaused: false,
      lastTickTime: Date.now()
  })),

  tick: () => set((state) => {
      if (!state.isActive || !state.lastTickTime) return state;
      const now = Date.now();
      const deltaSeconds = Math.floor((now - state.lastTickTime) / 1000);
      
      if (deltaSeconds < 1) return state;

      if (state.isPaused) {
         const pausedState = { ...state, lastTickTime: now };
         persistSession(pausedState);
         return { lastTickTime: now };
      }

      let newRest = state.restSecondsLeft;
      if (newRest > 0) {
          newRest -= deltaSeconds;
          if (newRest < 0) newRest = 0;
      }

      const nextState = {
          ...state,
          accumulatedSeconds: state.accumulatedSeconds + deltaSeconds,
          lastTickTime: now,
          restSecondsLeft: newRest
      };
      persistSession(nextState);
      if (state.restSecondsLeft > 0 && newRest === 0) {
        void cancelRestTimerNotification();
      }

      return {
          accumulatedSeconds: state.accumulatedSeconds + deltaSeconds,
          lastTickTime: now,
          restSecondsLeft: newRest
      };
  }),
  
  startRestTimer: (sec) => set((state) => {
      const nextState = { ...state, restSecondsLeft: Math.max(0, sec) };
      persistSession(nextState);
      syncRestTimerNotification(nextState);
      return { restSecondsLeft: Math.max(0, sec) };
  }),
  modifyRestTimer: (delta) => set((state) => {
      const nextRest = Math.max(0, state.restSecondsLeft + delta);
      const nextState = { ...state, restSecondsLeft: nextRest };
      persistSession(nextState);
      syncRestTimerNotification(nextState);
      return { restSecondsLeft: nextRest };
  }),
  
  endSession: () => set(() => {
      clearPersistedSession();
      void cancelRestTimerNotification();
      return {
      isActive: false,
      isPaused: false,
      sessionId: null,
      workoutName: null,
      startTime: null,
      accumulatedSeconds: 0,
      lastTickTime: null,
      restSecondsLeft: 0
  };
  })
}));
