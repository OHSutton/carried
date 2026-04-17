import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  TextInput,
  ScrollView,
  Alert,
  Vibration,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSessionStore } from '../store/sessionStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getTemplates,
  startSession,
  endSession,
  getSessionSets,
  addSet,
  deleteSet,
  deleteSession,
  getExercises,
  addExercise,
  updateExercise,
  updateTemplate,
  getPrevExercisePerformance,
  getActivePlan,
  advanceActivePlan,
  getConfig,
  getLastSessionTime,
  getSessions,
  getBodyWeightEntries,
  addBodyWeightEntry,
  deleteBodyWeightEntry,
  UserTemplate,
  Exercise,
  Plan,
  BodyWeightEntry,
} from '../database/queries';
import {
  Play,
  Square,
  CheckCircle2,
  Timer,
  TimerOff,
  Pause,
  Trash2,
  Plus,
  Minus,
  Search,
  X,
  Edit2,
  Dumbbell,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  Target,
  AlertTriangle,
  Calendar,
  Check,
} from 'lucide-react-native';
import {
  updateWorkoutNotification,
  clearWorkoutNotification,
  requestNotificationPermissions,
} from '../utils/notifications';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';

import { SetRow } from '../components/SetRow';
import { CreateExerciseModal } from '../components/CreateExerciseModal';
import { formatTime, formatTimeLocal, formatRest } from '../utils/time';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const HomeScreen = () => {
  const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const todayWeekIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const {
    isActive,
    isPaused,
    sessionId,
    workoutName,
    accumulatedSeconds,
    restSecondsLeft,
    startSession: storeStart,
    endSession: storeEnd,
    startRestTimer,
    modifyRestTimer,
    pauseSession,
    resumeSession,
  } = useSessionStore();

  const [templates, setTemplates] = useState<UserTemplate[]>([]);

  const [baseTemplateId, setBaseTemplateId] = useState<number | null>(null);
  const [basePayloadStr, setBasePayloadStr] = useState<string>('');
  const [templatePayload, setTemplatePayload] = useState<any[]>([]);
  const [completedSets, setCompletedSets] = useState<any[]>([]);
  const [extraSets, setExtraSets] = useState<{ [key: number]: number }>({});
  const [liveInputs, setLiveInputs] = useState<{
    [key: string]: { weight: string; reps: string; duration?: string };
  }>({});

  const [sessionRestCache, setSessionRestCache] = useState<{
    [key: number]: number;
  }>({});
  const [openRestPickerFor, setOpenRestPickerFor] = useState<number | null>(
    null,
  );
  const [prevPerf, setPrevPerf] = useState<{ [key: number]: any[] }>({});

  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Time Picker Modal State
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerKey, setTimePickerKey] = useState<string | null>(null);
  const [timePickerValues, setTimePickerValues] = useState({ h: 0, m: 0, s: 0 });

  const openTimePicker = (key: string, currentSec: number) => {
    setTimePickerKey(key);
    setTimePickerValues({
      h: Math.floor(currentSec / 3600),
      m: Math.floor((currentSec % 3600) / 60),
      s: currentSec % 60,
    });
    setTimePickerVisible(true);
  };

  // Home Dashboard State
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [nextRoutine, setNextRoutine] = useState<UserTemplate | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState({ text: '', isOverdue: false, isDueToday: false });
  const [weekCompletion, setWeekCompletion] = useState<boolean[]>(Array(7).fill(false));
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightEntry[]>([]);
  const [bodyWeightModalVisible, setBodyWeightModalVisible] = useState(false);
  const [bodyWeightInput, setBodyWeightInput] = useState('');
  const [showBodyWeightHistory, setShowBodyWeightHistory] = useState(false);
  const [bodyWeightTimeframe, setBodyWeightTimeframe] = useState<'1m' | '3m' | '6m' | '1y' | 'all'>('all');
  const [bodyWeightTimeframePickerVisible, setBodyWeightTimeframePickerVisible] = useState(false);

  const insets = useSafeAreaInsets();

  // Create Exercise Form State (for live addition)
  const [createExerciseModal, setCreateExerciseModal] = useState(false);
  const [editingLibExerciseId, setEditingLibExerciseId] = useState<number | null>(null);

  const [restGoal, setRestGoal] = useState(0);

  const REST_OPTIONS = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

  const [prevRest, setPrevRest] = useState(0);
  useEffect(() => {
    if (prevRest > 0 && restSecondsLeft === 0 && isActive) {
      Vibration.vibrate([0, 500, 200, 500]);
    }
    setPrevRest(restSecondsLeft);

    if (restSecondsLeft > restGoal) setRestGoal(restSecondsLeft);
    else if (restSecondsLeft === 0) setRestGoal(0);
  }, [restSecondsLeft, isActive]);

  const loadData = () => {
    setAllExercises(getExercises());
    const completedSessions = getSessions();
    const now = new Date();
    const todayDay = now.getDay();
    const mondayOffset = todayDay === 0 ? 6 : todayDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - mondayOffset);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const completedDays = Array(7).fill(false);
    completedSessions.forEach((session) => {
      const sessionDate = new Date(session.start_time);
      if (sessionDate >= startOfWeek && sessionDate < endOfWeek) {
        const sessionDay = sessionDate.getDay();
        const weekIndex = sessionDay === 0 ? 6 : sessionDay - 1;
        completedDays[weekIndex] = true;
      }
    });
    setWeekCompletion(completedDays);
    setBodyWeightEntries(getBodyWeightEntries());

    // Load Dashboard State
    const ap = getActivePlan();
    setActivePlan(ap);
    if (ap) {
      try {
        const rIds = JSON.parse(ap.routines);
        if (rIds.length > 0) {
          const nextId = rIds[ap.current_routine_index];
          const tmpl = getTemplates().find(t => t.id === nextId);
          setNextRoutine(tmpl || null);
        } else {
          setNextRoutine(null);
        }
      } catch (e) { }
    } else {
      setNextRoutine(null);
    }

    const notifSetting = getConfig('notification_frequency', 'never');
    const lastSession = getLastSessionTime();

    if (notifSetting === 'never' || !lastSession) {
      setScheduleStatus({ text: 'Anytime', isOverdue: false, isDueToday: false });
    } else {
      const lastDate = new Date(lastSession);
      lastDate.setHours(0, 0, 0, 0);
      let targetDate = new Date(lastDate);

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
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const diffTime = now.getTime() - targetDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays > 0) {
        setScheduleStatus({ text: 'Overdue', isOverdue: true, isDueToday: false });
      } else if (diffDays === 0) {
        setScheduleStatus({ text: 'Today', isOverdue: false, isDueToday: true });
      } else {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        setScheduleStatus({ text: days[targetDate.getDay()], isOverdue: false, isDueToday: false });
      }
    }

    if (isActive && sessionId) {
      fetchLiveProgress();
    }
  };

  const handleSkipRoutine = () => {
    advanceActivePlan();
    loadData();
  };

  const handleSaveBodyWeight = () => {
    const parsed = parseFloat(bodyWeightInput);
    if (Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Weight', 'Enter a valid body weight in kilograms.');
      return;
    }
    addBodyWeightEntry(parsed);
    setBodyWeightInput('');
    setBodyWeightModalVisible(false);
    setBodyWeightEntries(getBodyWeightEntries());
  };

  const handleDeleteBodyWeight = (id: number) => {
    Alert.alert(
      'Delete Weigh-In?',
      'This will permanently remove this body weight entry.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBodyWeightEntry(id);
            setBodyWeightEntries(getBodyWeightEntries());
          },
        },
      ],
    );
  };

  const updateLiveInput = React.useCallback((key: string, field: string, val: string) => {
    setLiveInputs(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: val }
    }));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [isActive]),
  );

  const fetchLiveProgress = () => {
    if (!sessionId) return;
    const sets = getSessionSets(sessionId);
    setCompletedSets(sets);
  };

  const handleStartWorkout = async (template: UserTemplate) => {
    await requestNotificationPermissions();

    setBaseTemplateId(template.id);
    setBasePayloadStr(template.exercises);
    const _sessionId = startSession(template.id);
    storeStart(_sessionId, template.name);
    setExtraSets({});
    setSessionRestCache({});
    setOpenRestPickerFor(null);
    setSearchQuery('');

    try {
      const parsed = JSON.parse(template.exercises);
      setTemplatePayload(parsed);

      let perfCache: { [key: number]: any[] } = {};
      parsed.forEach((ex: any) => {
        perfCache[ex.exerciseId] = getPrevExercisePerformance(ex.exerciseId);
      });
      setPrevPerf(perfCache);

      let initInputs: any = {};
      parsed.forEach((ex: any) => {
        const targetS = parseInt(ex.sets) || 1;
        const exPerf = perfCache[ex.exerciseId] || [];
        for (let i = 0; i < targetS + 20; i++) {
          const pastSet = exPerf[i];
          initInputs[`${ex.exerciseId}_${i}`] = {
            weight: '',
            reps: '',
            duration: '',
          };
        }
      });
      setLiveInputs(initInputs);
    } catch (e) {
      setTemplatePayload([]);
    }
  };

  const handleLogSet = (
    exerciseId: number,
    setIndex: number,
    defaultRest: number | string = 0,
    manualDuration?: number,
    targetReps?: string | number
  ) => {
    if (!sessionId) return;
    const input = liveInputs[`${exerciseId}_${setIndex}`];
    if (!input) return;

    let w = parseFloat(input.weight);
    let r = parseInt(input.reps);

    if (isNaN(w) || isNaN(r)) {
      const prevSets = prevPerf[exerciseId] || [];
      const pSet = prevSets[setIndex];
      if (isNaN(w)) w = (pSet && pSet.weight > 0) ? pSet.weight : 0;
      if (isNaN(r)) {
        if (pSet && pSet.rep_count > 0) {
          r = pSet.rep_count;
        } else {
          r = parseInt((targetReps as string) || '0') || 0;
        }
      }
    }

    addSet(sessionId, exerciseId, r, w, manualDuration || (parseInt(input.duration || '0') || 0), setIndex);

    const baseRest =
      typeof defaultRest === 'string'
        ? Number.isNaN(parseInt(defaultRest, 10))
          ? 0
          : parseInt(defaultRest, 10)
        : defaultRest;
    const finalRest = sessionRestCache[exerciseId] ?? baseRest;
    if (finalRest > 0) startRestTimer(finalRest);
    else startRestTimer(0);
    fetchLiveProgress();
  };

  const handleUntick = (setId: number) => {
    deleteSet(setId);
    fetchLiveProgress();
  };

  const executeEndWorkout = (doUpdate: boolean) => {
    if (doUpdate && baseTemplateId && workoutName) {
      const updatedPayload = templatePayload.map((ex) => {
        const originalSets = parseInt(ex.sets) || 1;
        const extra = extraSets[ex.exerciseId] || 0;

        let finalRest = ex.rest;
        if (sessionRestCache[ex.exerciseId] !== undefined) {
          finalRest = sessionRestCache[ex.exerciseId].toString();
        }

        return {
          ...ex,
          sets: Math.max(1, originalSets + extra).toString(),
          rest: finalRest
        };
      });
      updateTemplate(
        baseTemplateId,
        workoutName,
        JSON.stringify(updatedPayload),
      );
    }

    if (sessionId) {
      endSession(sessionId, accumulatedSeconds);
      advanceActivePlan(); // Move the plan index forward
    }
    storeEnd();
    setTemplatePayload([]);
    setCompletedSets([]);
    setExtraSets({});
    setSessionRestCache({});
  };

  const handleFinishDiff = () => {
    // Check for incomplete sets
    let incompleteSets = 0;
    templatePayload.forEach((target: any) => {
      const baseSetCount = parseInt(target.sets) || 1;
      const explicitTarget = Math.max(
        1,
        baseSetCount + (extraSets[target.exerciseId] || 0),
      );
      const loggedCount = completedSets.filter(
        (s) => s.exercise_id === target.exerciseId,
      ).length;
      if (loggedCount < explicitTarget) {
        incompleteSets += explicitTarget - loggedCount;
      }
    });

    if (incompleteSets > 0) {
      Alert.alert(
        'Incomplete Sets',
        `You still have ${incompleteSets} unticked set${incompleteSets > 1 ? 's' : ''} remaining. Finish anyway?`,
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Finish Anyway',
            onPress: () => proceedToFinish(),
          },
        ],
      );
    } else {
      proceedToFinish();
    }
  };

  const proceedToFinish = () => {
    if (!basePayloadStr) return executeEndWorkout(false);
    const ogArray = JSON.parse(basePayloadStr);
    let diffText: string[] = [];

    ogArray.forEach((og: any) => {
      if (!templatePayload.find((t) => t.exerciseId === og.exerciseId)) {
        diffText.push(`• Removed ${og.name}`);
      }
    });

    templatePayload.forEach((live) => {
      const og = ogArray.find((o: any) => o.exerciseId === live.exerciseId);
      if (!og) diffText.push(`• Added ${live.name}`);

      const extra = extraSets[live.exerciseId];
      if (extra && extra !== 0) {
        if (extra > 0)
          diffText.push(`• Added ${extra} extra sets to ${live.name}`);
        else if (extra < 0)
          diffText.push(`• Dropped ${Math.abs(extra)} sets from ${live.name}`);
      }

      if (sessionRestCache[live.exerciseId] !== undefined) {
        const newRest = sessionRestCache[live.exerciseId];
        const oldRest = Number.isNaN(parseInt(og?.rest, 10)) ? 0 : parseInt(og?.rest, 10);
        if (newRest !== oldRest) {
          diffText.push(`• Changed ${live.name} rest timer to ${newRest}s`);
        }
      }
    });

    if (diffText.length > 0) {
      Alert.alert(
        'Template Update',
        'You modified this workout significantly! Automatically sync these upgrades back to the base template?\n\n' +
        diffText.join('\n'),
        [
          {
            text: 'No, Just Finish',
            style: 'cancel',
            onPress: () => executeEndWorkout(false),
          },
          { text: 'Sync & Finish', onPress: () => executeEndWorkout(true) },
        ],
      );
    } else {
      executeEndWorkout(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Session',
      'Are you sure? This deletes everything you just logged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            if (sessionId) deleteSession(sessionId);
            storeEnd();
            setTemplatePayload([]);
            setCompletedSets([]);
            setExtraSets({});
            setSessionRestCache({});
          },
        },
      ],
    );
  };

  const addExtraSet = (exerciseId: number) =>
    setExtraSets((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] || 0) + 1,
    }));
  const removeExtraSet = (exerciseId: number, baseSets: number) => {
    setExtraSets((prev) => ({
      ...prev,
      [exerciseId]: Math.max(1 - baseSets, (prev[exerciseId] || 0) - 1),
    }));
  };

  const removeExerciseEntirely = (exerciseId: number) => {
    Alert.alert('Drop Exercise?', 'Remove this from your active session?', [
      { text: 'Cancel' },
      {
        text: 'Drop',
        style: 'destructive',
        onPress: () =>
          setTemplatePayload((prev) =>
            prev.filter((p) => p.exerciseId !== exerciseId),
          ),
      },
    ]);
  };

  const handleInjectLiveExercise = (ex: Exercise) => {
    const tr = templatePayload.find((p) => p.exerciseId === ex.id);
    if (tr) {
      setSearchQuery('');
      setAddModalVisible(false);
      return;
    }

    setTemplatePayload([
      ...templatePayload,
      {
        exerciseId: ex.id,
        name: ex.name,
        type: ex.type,
        sets: '3',
        reps: ex.type === 'weight' ? '10' : '',
        rest_time: (ex.rest_time ?? 0).toString(),
      },
    ]);
    // Load prev performance for newly added exercise
    setPrevPerf((prev) => ({
      ...prev,
      [ex.id]: getPrevExercisePerformance(ex.id),
    }));
    setSearchQuery('');
    setAddModalVisible(false);
  };

  const handleCreateExercise = () => {
    setEditingLibExerciseId(null);
    setCreateExerciseModal(true);
  };

  const submitCreateExercise = (name: string, type: 'weight' | 'time', muscles: string[]) => {
    if (!name.trim()) return;

    if (editingLibExerciseId) {
      updateExercise(
        editingLibExerciseId,
        name.trim(),
        type,
        JSON.stringify(muscles),
        0,
      );
    } else {
      addExercise(
        name.trim(),
        type,
        '',
        JSON.stringify(muscles),
        0,
      );
    }

    const updatedEx = getExercises();
    setAllExercises(updatedEx);

    const newlyCreated = updatedEx.find((e) => e.name === name.trim());
    if (newlyCreated && !editingLibExerciseId) {
      handleInjectLiveExercise(newlyCreated);
    }
    setCreateExerciseModal(false);
    setSearchQuery('');
  };

  const filteredExercises = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const exactMatchExists = filteredExercises.some(
    (ex) => ex.name.toLowerCase() === searchQuery.toLowerCase().trim(),
  );

  const filteredBodyWeightEntries = React.useMemo(() => {
    if (bodyWeightTimeframe === 'all') return bodyWeightEntries;
    const now = new Date();
    const cutoff = new Date();
    if (bodyWeightTimeframe === '1m') cutoff.setMonth(now.getMonth() - 1);
    else if (bodyWeightTimeframe === '3m') cutoff.setMonth(now.getMonth() - 3);
    else if (bodyWeightTimeframe === '6m') cutoff.setMonth(now.getMonth() - 6);
    else if (bodyWeightTimeframe === '1y') cutoff.setFullYear(now.getFullYear() - 1);
    
    return bodyWeightEntries.filter(e => new Date(e.logged_at) >= cutoff);
  }, [bodyWeightEntries, bodyWeightTimeframe]);

  const visibleFirstWeight = filteredBodyWeightEntries.length > 0 ? filteredBodyWeightEntries[0].weight_kg : null;
  const visibleLastWeight = filteredBodyWeightEntries.length > 0 ? filteredBodyWeightEntries[filteredBodyWeightEntries.length - 1].weight_kg : null;
  const weightDelta = visibleFirstWeight && visibleLastWeight ? visibleLastWeight - visibleFirstWeight : 0;
  const isGain = weightDelta > 0;
  const deltaColor = isGain ? '#88FF88' : (weightDelta < 0 ? '#FF4444' : '#A0A0A0');
  const deltaText = `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}kg`;

  let activeHUDStr = 'Routine Complete - Great Job!';
  if (isActive) {
    for (let i = 0; i < templatePayload.length; i++) {
      const target = templatePayload[i];
      const loggedCount = completedSets.filter(
        (s) => s.exercise_id === target.exerciseId,
      ).length;
      const explicitTarget = Math.max(
        1,
        (parseInt(target.sets) || 1) + (extraSets[target.exerciseId] || 0),
      );
      if (loggedCount < explicitTarget) {
        activeHUDStr = `${target.name} (${loggedCount + 1}/${explicitTarget})`;
        break;
      }
    }
  }

  useEffect(() => {
    if (isActive) {
      if (restSecondsLeft > 0) {
        updateWorkoutNotification(`Rest: ${formatTime(restSecondsLeft)}`, `Up Next: ${activeHUDStr}\nTotal Time: ${formatTime(accumulatedSeconds)}`);
      } else {
        updateWorkoutNotification(`Active: ${workoutName || 'Workout'}`, `Up Next: ${activeHUDStr}\nTotal Time: ${formatTime(accumulatedSeconds)}`);
      }
    } else {
      clearWorkoutNotification();
    }
  }, [isActive, restSecondsLeft, accumulatedSeconds, activeHUDStr]);

  if (isActive) {
    const filteredExercises = allExercises.filter((ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const exactMatchExists = filteredExercises.some(
      (ex) => ex.name.toLowerCase() === searchQuery.toLowerCase().trim(),
    );
    const progressBarWidth =
      restGoal > 0 ? (restSecondsLeft / restGoal) * 100 : 0;

    return (
      <View style={[styles.activeContainer, { paddingTop: insets.top }]}>
        <View style={styles.liveHeader}>
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Text style={styles.liveTitle} numberOfLines={1}>
                {workoutName}
              </Text>
              {isPaused && (
                <View style={styles.pausedBadge}>
                  <Text style={styles.pausedBadgeText}>PAUSED</Text>
                </View>
              )}
            </View>
            <Text style={[styles.timerText, isPaused && { color: '#666' }]}>
              {formatTime(accumulatedSeconds)}
            </Text>
            <Text style={styles.hudText}>{activeHUDStr}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={isPaused ? resumeSession : pauseSession}
            >
              {isPaused ? (
                <Play color="#88FF88" size={26} fill="#88FF88" />
              ) : (
                <Pause color="#FFF" size={26} fill="#FFF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleDiscard}>
              <Trash2 color="#FF4444" size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={handleFinishDiff}
            >
              <Square color="#000" size={16} fill="#000" />
              <Text style={styles.finishBtnText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>

        {restSecondsLeft > 0 && (
          <View style={styles.restBannerWrapper}>
            <View style={styles.restBanner}>
              <TouchableOpacity
                onPress={() => modifyRestTimer(-10)}
                style={styles.restModBtn}
              >
                <Text style={styles.restModText}>-10s</Text>
              </TouchableOpacity>
              <View style={styles.restCenter}>
                <Timer color="#00E5FF" size={24} />
                <Text style={styles.restText}>
                  {formatTime(restSecondsLeft)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => modifyRestTimer(10)}
                style={styles.restModBtn}
              >
                <Text style={styles.restModText}>+10s</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.restProgressBar,
                { width: `${progressBarWidth}%` },
              ]}
            />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.liveScroll}
          keyboardShouldPersistTaps="handled"
        >
          {templatePayload.map((target, idx) => {
            const baseSetCount = parseInt(target.sets) || 1;
            const explicitTarget = Math.max(
              1,
              baseSetCount + (extraSets[target.exerciseId] || 0),
            );
            const loggedForThisEx = completedSets.filter(
              (s) => s.exercise_id === target.exerciseId,
            );
            const maxLoggedOrder = Math.max(
              -1,
              ...loggedForThisEx.map((s) => s.set_order),
            );
            const canRemoveSet =
              explicitTarget > 1 && maxLoggedOrder < explicitTarget - 1;
            const displayRows = Math.max(
              explicitTarget,
              maxLoggedOrder + 1,
            );

            const baseRest =
              typeof target.rest_time === 'string'
                ? Number.isNaN(parseInt(target.rest_time, 10))
                  ? 0
                  : parseInt(target.rest_time, 10)
                : target.rest_time;
            const finalRest = sessionRestCache[target.exerciseId] ?? baseRest;

            return (
              <View key={idx} style={[styles.exerciseBlock, { zIndex: openRestPickerFor === target.exerciseId ? 2 : 1 }]}>
                <View style={[styles.exerciseHeaderRow, { position: 'relative' }]}>
                  <Text style={styles.exerciseTitle}>{target.name}</Text>
                  <View style={styles.headerControls}>
                    <TouchableOpacity
                      style={styles.inlineRestBtn}
                      onPress={() =>
                        setOpenRestPickerFor(
                          openRestPickerFor === target.exerciseId
                            ? null
                            : target.exerciseId,
                        )
                      }
                    >
                      {finalRest <= 0 ? <TimerOff color="#00E5FF" size={16} /> : <Timer color="#00E5FF" size={16} />}
                      <Text style={styles.inlineRestText}>
                        {formatRest(finalRest)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeExerciseEntirely(target.exerciseId)}
                      style={styles.iconBtnTight}
                    >
                      <Trash2 color="#FF4444" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Removed Absolute Inline Dropdown */}

                <View style={styles.tableHeader}>
                  <View style={styles.tableHeaderContent}>
                    <Text style={styles.colPrev}>PREV</Text>
                    {target.type === 'time' ? (
                      <View style={styles.colTime}>
                        <Text style={styles.colTimeText}>DURATION</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.colWeight}>KG</Text>
                        <Text style={styles.colReps}>REPS</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.colCheck}>DONE</Text>
                </View>

                {Array.from({ length: displayRows }).map((_, setIdx) => {
                  const isLogged = loggedForThisEx.find(s => s.set_order === setIdx);
                  const inputKey = `${target.exerciseId}_${setIdx}`;
                  const currentInput = liveInputs[inputKey] || {
                    weight: '',
                    reps: '',
                  };

                  const prevSets = prevPerf[target.exerciseId] || [];
                  const prevSet = prevSets[setIdx];
                  let prevLabel = 'N/A';
                  if (prevSet) {
                    if (target.type === 'time') {
                      const pm = Math.floor((prevSet.duration || 0) / 60);
                      const ps = (prevSet.duration || 0) % 60;
                      prevLabel = ps > 0 ? `${pm}m${ps}s` : `${pm}m`;
                    } else {
                      prevLabel = `${prevSet.weight || 0}kg × ${prevSet.rep_count || 0}`;
                    }
                  }

                  return (
                    <SetRow
                      key={setIdx}
                      setIdx={setIdx}
                      isLogged={isLogged}
                      currentInput={currentInput}
                      inputKey={inputKey}
                      target={target}
                      prevLabel={prevLabel}
                      prevSet={prevSet}
                      handleUntick={handleUntick}
                      handleLogSet={handleLogSet}
                      updateLiveInput={updateLiveInput}
                      openTimePicker={openTimePicker}
                    />
                  );
                })}

                <View style={styles.setControls}>
                  {explicitTarget > 1 && (
                    <TouchableOpacity
                      style={[
                        styles.modSetBtn,
                        !canRemoveSet && styles.modSetBtnDisabled,
                      ]}
                      onPress={() =>
                        canRemoveSet &&
                        removeExtraSet(target.exerciseId, baseSetCount)
                      }
                      disabled={!canRemoveSet}
                    >
                      <Minus
                        color={canRemoveSet ? '#FF4444' : '#6A6A6D'}
                        size={16}
                      />
                      <Text
                        style={[
                          styles.modSetText,
                          { color: canRemoveSet ? '#FF4444' : '#6A6A6D' },
                        ]}
                      >
                        Remove Set
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.modSetBtn}
                    onPress={() => addExtraSet(target.exerciseId)}
                  >
                    <Plus color="#88FF88" size={16} />
                    <Text style={[styles.modSetText, { color: '#88FF88' }]}>
                      Add Set
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={styles.additionBlock}>
            <TouchableOpacity
              style={styles.addExerciseTrigger}
              onPress={() => setAddModalVisible(true)}
            >
              <Plus color="#00E5FF" size={24} />
              <Text style={styles.addExerciseTriggerText}>
                Add Exercise To Session
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Time Picker Modal */}
        <Modal visible={timePickerVisible} animationType="slide" transparent>
          <View style={styles.modalOverlaySecondary}>
            <View style={[styles.modalContent, { paddingBottom: 40 }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Set Duration</Text>
                <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
                  <X color="#FFF" size={28} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 30 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>Hours</Text>
                  <TextInput
                    style={[styles.input, { width: 80, textAlign: 'center', fontSize: 24, paddingVertical: 10, marginTop: 10 }]}
                    keyboardType="numeric"
                    value={timePickerValues.h.toString()}
                    onChangeText={(v) => setTimePickerValues(prev => ({ ...prev, h: parseInt(v) || 0 }))}
                  />
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>Minutes</Text>
                  <TextInput
                    style={[styles.input, { width: 80, textAlign: 'center', fontSize: 24, paddingVertical: 10, marginTop: 10 }]}
                    keyboardType="numeric"
                    value={timePickerValues.m.toString()}
                    onChangeText={(v) => setTimePickerValues(prev => ({ ...prev, m: parseInt(v) || 0 }))}
                  />
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>Seconds</Text>
                  <TextInput
                    style={[styles.input, { width: 80, textAlign: 'center', fontSize: 24, paddingVertical: 10, marginTop: 10 }]}
                    keyboardType="numeric"
                    value={timePickerValues.s.toString()}
                    onChangeText={(v) => setTimePickerValues(prev => ({ ...prev, s: parseInt(v) || 0 }))}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.primaryAction, { alignItems: 'center', paddingVertical: 16, borderRadius: 12 }]}
                onPress={() => {
                  if (timePickerKey) {
                    const totalSec = (timePickerValues.h * 3600) + (timePickerValues.m * 60) + timePickerValues.s;
                    updateLiveInput(timePickerKey, 'duration', totalSec.toString());
                  }
                  setTimePickerVisible(false);
                }}
              >
                <Text style={styles.primaryActionText}>Save Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={openRestPickerFor !== null} animationType="slide" transparent>
          <View style={[styles.modalOverlaySecondary, { justifyContent: 'flex-end', padding: 0 }]}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Select Rest Timer</Text>
                <TouchableOpacity onPress={() => setOpenRestPickerFor(null)}>
                  <X color="#FFF" size={28} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {REST_OPTIONS.map((opt) => {
                  const isActive = openRestPickerFor !== null && sessionRestCache[openRestPickerFor] === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={styles.restDropdownItem}
                      onPress={() => {
                        if (openRestPickerFor) {
                          setSessionRestCache((prev) => ({
                            ...prev,
                            [openRestPickerFor]: opt,
                          }));
                        }
                        setOpenRestPickerFor(null);
                      }}
                    >
                      <Text style={[styles.restDropdownText, isActive && { color: '#00E5FF', fontWeight: 'bold' }]}>
                        {formatRest(opt)} {isActive ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={addModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Search Library</Text>
                <TouchableOpacity
                  onPress={() => {
                    setAddModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <X color="#FFF" size={28} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.searchBox,
                  { marginBottom: searchQuery ? 0 : 16 },
                ]}
              >
                <Search color="#666" size={20} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Add new exercise..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>

              {searchQuery.length > 0 && (
                <ScrollView
                  style={styles.autocompleteContainer}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredExercises.slice(0, 4).map((item) => {
                    const alreadyInSession = templatePayload.some(
                      (p: any) => p.exerciseId === item.id,
                    );
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.exerciseSelectRow,
                          alreadyInSession && {
                            backgroundColor: 'rgba(0, 229, 255, 0.08)',
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => handleInjectLiveExercise(item)}
                        >
                          <Text style={styles.exerciseSelectName}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 16,
                            alignItems: 'center',
                          }}
                        >
                          {alreadyInSession ? (
                            <CheckCircle2 color="#88FF88" size={22} />
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleInjectLiveExercise(item)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Plus color="#00E5FF" size={24} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {!exactMatchExists && (
                    <TouchableOpacity
                      style={styles.exerciseSelectRow}
                      onPress={handleCreateExercise}
                    >
                      <Text
                        style={[
                          styles.exerciseSelectName,
                          { color: '#00E5FF', fontWeight: 'bold' },
                        ]}
                      >
                        + Create "{searchQuery}"
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>


      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Your Dashboard</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weekStrip}>
          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label, index) => {
              const done = weekCompletion[index];
              return (
                <View
                  key={label}
                  style={[
                    styles.weekDayStack,
                    index === todayWeekIndex && styles.weekDayStackCurrent,
                  ]}
                >
                  <Text style={styles.weekDayLabel}>{label}</Text>
                  <View style={[styles.weekCheckCircle, done ? styles.weekCheckCircleDone : styles.weekCheckCirclePending]}>
                    <Check
                      size={16}
                      color={done ? '#041317' : '#6B6B70'}
                      strokeWidth={3}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        {activePlan ? (
          <View style={styles.dashboardCard}>
            {nextRoutine ? (
              <>
                <View style={styles.planHeaderRow}>
                  <Text style={styles.nextRoutineName} numberOfLines={1}>{nextRoutine.name}</Text>
                  <View style={styles.planMetaRow}>
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{activePlan.name}</Text>
                    </View>
                    <View
                      style={[
                        styles.scheduleChip,
                        scheduleStatus.isOverdue && styles.scheduleChipOverdue,
                        scheduleStatus.isDueToday && styles.scheduleChipDueToday,
                      ]}
                    >
                      {scheduleStatus.isOverdue && <AlertTriangle color="#FF4444" size={16} />}
                      {scheduleStatus.isDueToday && <Calendar color="#00E5FF" size={16} />}
                      {!scheduleStatus.isOverdue && !scheduleStatus.isDueToday && <Calendar color="#A0A0A0" size={14} />}
                      <Text style={[
                        styles.scheduleChipText,
                        scheduleStatus.isOverdue && styles.scheduleChipTextOverdue,
                        scheduleStatus.isDueToday && styles.scheduleChipTextDueToday,
                      ]}>
                        {scheduleStatus.text}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.dashboardActions}>
                  <TouchableOpacity
                    style={styles.skipActionBtn}
                    onPress={handleSkipRoutine}
                  >
                    <Text style={styles.skipActionText}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.startActionBtn}
                    onPress={() => handleStartWorkout(nextRoutine)}
                  >
                    <Play color="#000" size={20} fill="#000" />
                    <Text style={styles.startActionText}>Start</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>This plan has no routines! Add them in the Workouts tab.</Text>
            )}
          </View>
        ) : (
          <View style={styles.dashboardCard}>
            <Text style={styles.emptyText}>You haven't set an active plan yet!</Text>
            <Text style={[styles.emptyText, { marginTop: 10, fontSize: 14 }]}>Head over to the Workouts tab to create and activate a plan.</Text>
          </View>
        )}

        <View style={styles.bodyWeightCard}>
          <View style={styles.bwHeader}>
            <Text style={styles.bwTitle}>Body Weight</Text>
            <View style={styles.bwBadgesRow}>
              {visibleLastWeight !== null && (
                <View style={styles.bwBadgeBase}>
                  <Text style={styles.bwBadgeTextBase}>{visibleLastWeight.toFixed(1)}kg</Text>
                </View>
              )}
              {filteredBodyWeightEntries.length > 1 && (
                <View style={[styles.bwBadgeBase, { backgroundColor: isGain ? 'rgba(136,255,136,0.1)' : 'rgba(255,68,68,0.1)', borderColor: 'transparent' }]}>
                  <Text style={[styles.bwBadgeTextBase, { color: deltaColor }]}>{deltaText}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.bwTimeframeBtn}
                onPress={() => setBodyWeightTimeframePickerVisible(true)}
              >
                <Text style={styles.bwTimeframeText}>{bodyWeightTimeframe.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredBodyWeightEntries.length > 1 ? (
            <View style={styles.bodyWeightChartFrame}>
              <LineChart
                data={{
                  labels: filteredBodyWeightEntries.map(() => ''),
                  datasets: [{ data: filteredBodyWeightEntries.map((entry) => entry.weight_kg) }],
                }}
                width={SCREEN_WIDTH + 15}
                height={160}
                withDots
                withInnerLines={false}
                withOuterLines={false}
                withHorizontalLabels={true}
                withVerticalLabels={false}
                yAxisInterval={1}
                formatYLabel={(value) => `${Math.round(Number(value))}kg`}
                segments={3}
                chartConfig={{
                  backgroundColor: '#1C1C1E',
                  backgroundGradientFrom: '#1C1C1E',
                  backgroundGradientTo: '#1C1C1E',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 229, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(160, 160, 160, ${opacity})`,
                  fillShadowGradient: '#00E5FF',
                  fillShadowGradientOpacity: 0.15,
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#00E5FF',
                  },
                  propsForLabels: {
                    fontSize: 12,
                    fontWeight: 'bold',
                  },
                  paddingRight: 10,
                  paddingTop: 16,
                }}
                bezier
                style={styles.bodyWeightChart}
              />
            </View>
          ) : (
            <View style={styles.bodyWeightEmpty}>
              <TouchableOpacity
                style={styles.bodyWeightFloatingAddBtn}
                onPress={() => setBodyWeightModalVisible(true)}
              >
                <Plus color="#FFF" size={16} />
                <Text style={styles.bodyWeightFloatingAddText}>Record Weight</Text>
              </TouchableOpacity>
              <Text style={styles.bodyWeightEmptyText}>
                Add at least two weigh-ins to see your trend.
              </Text>
            </View>
          )}

          {filteredBodyWeightEntries.length > 0 && (
            <View style={styles.bodyWeightHistorySection}>
              <View style={styles.bodyWeightHistoryHeader}>
                <TouchableOpacity
                  style={styles.bodyWeightHistoryToggle}
                  onPress={() => setShowBodyWeightHistory((prev) => !prev)}
                >
                  <Text style={styles.bodyWeightHistoryToggleText}>Weigh-Ins</Text>
                  {showBodyWeightHistory ? (
                    <ChevronUp color="#A0A0A0" size={18} />
                  ) : (
                    <ChevronDown color="#A0A0A0" size={18} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bodyWeightInlineAddBtn}
                  onPress={() => setBodyWeightModalVisible(true)}
                >
                  <Plus color="#000" size={16} />
                  <Text style={styles.bodyWeightInlineAddText}>Record Weight</Text>
                </TouchableOpacity>
              </View>

              {showBodyWeightHistory && (
                <View style={styles.bodyWeightHistoryList}>
                  {[...filteredBodyWeightEntries].reverse().map((entry) => {
                    const entryDate = new Date(entry.logged_at);
                    return (
                      <View key={entry.id} style={styles.bodyWeightHistoryRow}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.bodyWeightHistoryValue}>
                            {entry.weight_kg.toFixed(1)} kg
                          </Text>
                          <Text style={styles.bodyWeightHistoryDate}>
                            {entryDate.toLocaleDateString()} {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.bodyWeightDeleteBtn}
                          onPress={() => handleDeleteBodyWeight(entry.id)}
                        >
                          <Trash2 color="#FF4444" size={16} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={bodyWeightTimeframePickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlaySecondary, { justifyContent: 'flex-end', padding: 0 }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Timeframe</Text>
              <TouchableOpacity onPress={() => setBodyWeightTimeframePickerVisible(false)}>
                <X color="#FFF" size={28} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {['1m', '3m', '6m', '1y', 'all'].map((opt) => {
                const isActive = bodyWeightTimeframe === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={styles.restDropdownItem}
                    onPress={() => {
                      setBodyWeightTimeframe(opt as any);
                      setBodyWeightTimeframePickerVisible(false);
                    }}
                  >
                    <Text style={[styles.restDropdownText, isActive && { color: '#00E5FF', fontWeight: 'bold' }]}>
                      {opt.toUpperCase()} {isActive ? '✓' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={bodyWeightModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Record Body Weight</Text>
              <TouchableOpacity onPress={() => setBodyWeightModalVisible(false)}>
                <X color="#FFF" size={28} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Weight in kg"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              value={bodyWeightInput}
              onChangeText={setBodyWeightInput}
              autoFocus
            />
            <TouchableOpacity style={styles.bodyWeightSaveBtn} onPress={handleSaveBodyWeight}>
              <Text style={styles.bodyWeightSaveText}>Save Weight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CreateExerciseModal
        visible={createExerciseModal}
        onClose={() => setCreateExerciseModal(false)}
        onSubmit={submitCreateExercise}
        isEditing={!!editingLibExerciseId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { padding: 24, paddingBottom: 10 },
  heading: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  dashboardContent: { paddingHorizontal: 24, paddingBottom: 24, gap: 18 },
  weekStrip: {
    backgroundColor: '#171719',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#252528',
  },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekDayStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    borderRadius: 14,
  },
  weekDayStackCurrent: {
    borderWidth: 1,
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0,229,255,0.06)',
  },
  weekDayLabel: { color: '#A0A0A0', fontSize: 12, fontWeight: '700' },
  weekCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weekCheckCircleDone: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  weekCheckCirclePending: {
    backgroundColor: '#232326',
    borderColor: '#333338',
  },
  label: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  list: { paddingHorizontal: 24 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
  templateCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#00E5FF',
  },
  templateName: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  templateMuscles: { color: '#00E5FF', fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.8 },

  activeContainer: { flex: 1, backgroundColor: '#0F0F0F' },
  liveHeader: {
    backgroundColor: '#1C1C1E',
    padding: 24,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  liveTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  pausedBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pausedBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  timerText: {
    color: '#00E5FF',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  hudText: { color: '#00E5FF', fontSize: 14, fontWeight: 'bold', marginTop: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 8 },
  iconBtnTight: { paddingHorizontal: 4 },
  finishBtn: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  finishBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  restBannerWrapper: { backgroundColor: 'rgba(0, 229, 255, 0.05)' },
  restBanner: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restProgressBar: {
    height: 3,
    backgroundColor: '#00E5FF',
    alignSelf: 'center',
  },
  restCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restText: { color: '#00E5FF', fontSize: 24, fontWeight: '900' },
  restModBtn: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  restModText: { color: '#00E5FF', fontWeight: 'bold', fontSize: 16 },

  liveScroll: { padding: 20, paddingBottom: 100 },
  exerciseBlock: { marginBottom: 32 },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseTitle: {
    color: '#00E5FF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineRestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  inlineRestText: { color: '#00E5FF', fontWeight: 'bold', fontSize: 14 },
  restBubbleScroll: { gap: 8, marginBottom: 16 },
  restBubble: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
  },
  restBubbleActive: { backgroundColor: '#00E5FF' },
  restBubbleText: { color: '#FFF', fontWeight: 'bold' },

  tableHeader: { flexDirection: 'row', marginBottom: 8, gap: 6 },
  tableHeaderContent: { flex: 1, flexDirection: 'row', paddingHorizontal: 8 },
  colPrev: {
    flex: 1.45,
    color: '#666',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  colWeight: {
    flex: 1.35,
    color: '#666',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  colReps: {
    flex: 1.35,
    color: '#666',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  colTime: { flex: 2.7, alignItems: 'center' },
  colTimeText: { color: '#666', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  colCheck: { width: 58, color: '#666', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },

  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  tableRowCompleted: { backgroundColor: '#162C2A' },

  colWeightInput: {
    flex: 1.8,
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    marginHorizontal: 4,
    fontSize: 16,
    fontWeight: 'bold',
  },
  colRepsInput: {
    flex: 1.8,
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    marginHorizontal: 4,
    fontSize: 16,
    fontWeight: 'bold',
  },

  colCheckCol: { flex: 1.2, alignItems: 'center', justifyContent: 'center' },
  colPrevCell: {
    flex: 1.5,
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
  },

  setControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  modSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
  },
  modSetBtnDisabled: {
    backgroundColor: '#171719',
  },
  modSetText: { fontWeight: 'bold', fontSize: 14 },

  additionBlock: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    paddingTop: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  addExerciseTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  addExerciseTriggerText: {
    color: '#00E5FF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalOverlaySecondary: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  sectionLabel: {
    color: '#A0A0A0',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  autocompleteContainer: {
    backgroundColor: '#2C2C2E',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    maxHeight: 250,
  },
  exerciseSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
    alignItems: 'center',
  },
  exerciseSelectName: { color: '#FFF', fontSize: 16, flexShrink: 1 },

  typeToggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeToggleActive: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  typeToggleText: { color: '#FFF', fontWeight: 'bold' },

  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  muscleBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  muscleBadgeActive: { backgroundColor: '#00E5FF' },
  muscleBadgeText: { color: '#FFF', fontWeight: 'bold' },

  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryAction: {
    backgroundColor: '#00E5FF',
    width: '100%',
    alignItems: 'center',
  },
  primaryActionText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  closeSearch: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  closeSearchText: { color: '#666', fontWeight: 'bold' },
  selectedWrapper: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  targetRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 229, 255, 0.1)',
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetRowName: {
    color: '#00E5FF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  targetControls: { flexDirection: 'row', gap: 6 },
  targetInputsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
  targetInputCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallInput: {
    backgroundColor: '#1C1C1E',
    color: '#FFF',
    borderRadius: 8,
    width: 50,
    padding: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputLabel: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  dashboardCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  planBadgeText: { color: '#00E5FF', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  scheduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#222225',
    borderWidth: 1,
    borderColor: '#303034',
  },
  scheduleChipOverdue: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderColor: 'rgba(255,68,68,0.35)',
  },
  scheduleChipDueToday: {
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderColor: 'rgba(0,229,255,0.28)',
  },
  scheduleChipText: { color: '#A0A0A0', fontSize: 13, fontWeight: '700' },
  scheduleChipTextOverdue: { color: '#FF4444' },
  scheduleChipTextDueToday: { color: '#00E5FF' },
  nextRoutineName: { color: '#FFF', fontSize: 24, fontWeight: '900', lineHeight: 28, flex: 1, paddingRight: 4 },
  dashboardActions: { flexDirection: 'row', gap: 10 },
  skipActionBtn: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  skipActionText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  startActionBtn: {
    flex: 2,
    backgroundColor: '#00E5FF',
    borderRadius: 14,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  startActionText: { color: '#000', fontSize: 18, fontWeight: '900' },
  bodyWeightCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  bwHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 0,
  },
  bwTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bwBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bwBadgeBase: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bwBadgeTextBase: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bwTimeframeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  bwTimeframeText: {
    color: '#00E5FF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bodyWeightChartFrame: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  bodyWeightChart: {
    borderRadius: 24,
    marginLeft: -10,
    marginBottom: -15,
    marginTop: 10,
  },
  bodyWeightEmpty: {
    backgroundColor: '#222225',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  bodyWeightFloatingAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00E5FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  bodyWeightFloatingAddText: { color: '#000', fontSize: 15, fontWeight: '800' },
  bodyWeightEmptyText: { color: '#666', fontSize: 14, textAlign: 'center' },
  bodyWeightHistorySection: {
    margin: 16,
    backgroundColor: '#171719',
    borderRadius: 18,
    overflow: 'hidden',
  },
  bodyWeightHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  bodyWeightHistoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#202022',
    flex: 1,
  },
  bodyWeightHistoryToggleText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  bodyWeightInlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00E5FF',
    borderWidth: 1,
    borderColor: '#00E5FF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  bodyWeightInlineAddText: { color: '#000', fontSize: 13, fontWeight: '800' },
  bodyWeightHistoryList: {
    borderTopWidth: 1,
    borderTopColor: '#26262A',
  },
  bodyWeightHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#232326',
  },
  bodyWeightHistoryValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  bodyWeightHistoryDate: {
    color: '#7E7E84',
    fontSize: 12,
    marginTop: 3,
  },
  bodyWeightDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,68,68,0.08)',
  },
  bodyWeightSaveBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bodyWeightSaveText: { color: '#000', fontSize: 16, fontWeight: '900' },

  restDropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  restDropdownText: { color: '#FFF', fontSize: 16 },
});
