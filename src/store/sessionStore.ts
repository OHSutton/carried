import { create } from 'zustand';

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
  isActive: false,
  isPaused: false,
  sessionId: null,
  workoutName: null,
  startTime: null,
  accumulatedSeconds: 0,
  lastTickTime: null,
  restSecondsLeft: 0,
  
  startSession: (id, name) => set({ 
      isActive: true, 
      isPaused: false,
      sessionId: id, 
      workoutName: name, 
      startTime: Date.now(), 
      lastTickTime: Date.now(),
      accumulatedSeconds: 0,
      restSecondsLeft: 0
  }),
  
  pauseSession: () => set({ isPaused: true }),
  
  resumeSession: () => set((state) => ({ 
      isPaused: false,
      lastTickTime: Date.now()
  })),

  tick: () => set((state) => {
      if (!state.isActive || !state.lastTickTime) return state;
      const now = Date.now();
      const deltaSeconds = Math.floor((now - state.lastTickTime) / 1000);
      
      if (deltaSeconds < 1) return state;

      if (state.isPaused) {
         return { lastTickTime: now };
      }

      let newRest = state.restSecondsLeft;
      if (newRest > 0) {
          newRest -= deltaSeconds;
          if (newRest < 0) newRest = 0;
      }

      return { 
          accumulatedSeconds: state.accumulatedSeconds + deltaSeconds,
          lastTickTime: now,
          restSecondsLeft: newRest
      };
  }),
  
  startRestTimer: (sec) => set({ restSecondsLeft: sec }),
  modifyRestTimer: (delta) => set((state) => ({ restSecondsLeft: Math.max(0, state.restSecondsLeft + delta) })),
  
  endSession: () => set({ 
      isActive: false, 
      isPaused: false,
      sessionId: null, 
      workoutName: null, 
      startTime: null, 
      accumulatedSeconds: 0,
      lastTickTime: null,
      restSecondsLeft: 0
  })
}));
