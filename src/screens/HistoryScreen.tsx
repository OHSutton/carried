import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ScrollView, TouchableOpacity, Modal, InteractionManager, ActivityIndicator, Alert } from 'react-native';
import { getSessions, getSessionSets, getExercises, getTemplates, getExerciseProgression, getRoutineProgression } from '../database/queries';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarCheck, Clock, Dumbbell, TrendingUp, X, ChevronLeft, ChevronRight, Activity, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { deleteSession } from '../database/queries';

const SCREEN_WIDTH = Dimensions.get('window').width;

const getMuscleCategory = (musclesStr: string) => {
    try {
        const arr = JSON.parse(musclesStr || '[]');
        let cats = { upper: 0, lower: 0, core: 0 };
        arr.forEach((m: string) => {
            if (['Chest','Back','Lats','Traps','Shoulders','Biceps','Triceps','Forearms'].includes(m)) cats.upper++;
            else if (['Quads','Hamstrings','Glutes','Calves'].includes(m)) cats.lower++;
            else if (['Core','Obliques','Lower Back'].includes(m)) cats.core++;
        });
        return cats;
    } catch { return { upper: 0, lower: 0, core: 0 }; }
};

export const HistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Overview'|'Exercises'|'Routines'>('Overview');
  
  // Data States
  const [sessions, setSessions] = useState<any[]>([]);
  const [cumChartData, setCumChartData] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar State
  const today = new Date();
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Secondary Tabs State
  const [exProgressData, setExProgressData] = useState<any[]>([]);
  const [routineProgressData, setRoutineProgressData] = useState<any[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true);
      const task = InteractionManager.runAfterInteractions(() => {
        loadOverviewData();
        if (activeTab === 'Exercises') loadExercisesData();
        if (activeTab === 'Routines') loadRoutinesData();
        setIsLoading(false);
      });
      return () => task.cancel();
    }, [activeTab])
  );

  const loadOverviewData = () => {
      const rawSessions = getSessions();
      let cumData: number[] = [];
      let cumLabels: string[] = [];
      let runningVolume = 0;

      const withSets = rawSessions.map((s) => {
        const sets = getSessionSets(s.id);
        const volume = sets.reduce((acc, curr) => acc + (curr.weight || 0) * (curr.rep_count || 0), 0);
        let cats = { upper: 0, lower: 0, core: 0 };
        return { ...s, sets, volume, cats };
      });

      const allEx = getExercises();
      withSets.forEach(s => {
          s.sets.forEach((set: any) => {
              const exDef = allEx.find(e => e.id === set.exercise_id);
              if (exDef && exDef.muscles) {
                  const mCats = getMuscleCategory(exDef.muscles);
                  s.cats.upper += mCats.upper;
                  s.cats.lower += mCats.lower;
                  s.cats.core += mCats.core;
              }
          });
      });

      // Cumulative calculation (chronological) with Date grouping
      const chronoSessions = [...withSets].reverse().filter(s => s.volume > 0);
      let currentDayStr = '';

      chronoSessions.forEach(s => {
          runningVolume += s.volume;
          const d = new Date(s.start_time);
          const dateStr = `${d.getMonth()+1}/${d.getDate()}`;
          
          if (dateStr === currentDayStr && cumData.length > 0) {
              cumData[cumData.length - 1] = runningVolume;
          } else {
              cumData.push(runningVolume);
              cumLabels.push(dateStr);
              currentDayStr = dateStr;
          }
      });

      if (cumData.length >= 2) {
        setCumChartData({ labels: cumLabels, datasets: [{ data: cumData }] });
      } else {
        setCumChartData(null);
      }

      setSessions(withSets);
  };

  const loadExercisesData = () => {
      const allEx = getExercises();
      const results: any[] = [];
      allEx.forEach(ex => {
          const prog = getExerciseProgression(ex.id);
          if (prog.length > 1) {
              results.push({ name: ex.name, data: prog.map(p => p.volume) });
          }
      });
      setExProgressData(results.sort((a,b) => a.name.localeCompare(b.name)));
  };

  const loadRoutinesData = () => {
      const routines = getTemplates();
      const results: any[] = [];
      routines.forEach(rt => {
          const prog = getRoutineProgression(rt.id);
          if (prog.length > 1) {
              results.push({ name: rt.name, data: prog.map(p => p.volume) });
          }
      });
      setRoutineProgressData(results);
  };

  const reloadActiveTab = () => {
      loadOverviewData();
      if (activeTab === 'Exercises') loadExercisesData();
      if (activeTab === 'Routines') loadRoutinesData();
  };

  const handleDeleteWorkout = (sessionId: number) => {
      Alert.alert(
        'Delete Workout?',
        'This will permanently remove this workout from your history and analytics.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteSession(sessionId);
              if (selectedSession?.id === sessionId) {
                setSelectedSession(null);
              }
              reloadActiveTab();
            },
          },
        ],
      );
  };

  const shiftCalMonth = (dir: -1 | 1) => {
      setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + dir, 1));
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const sessionLookupMap = useMemo(() => {
      const map: Record<string, any[]> = {};
      sessions.forEach(s => {
          const d = new Date(s.start_time);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          if (!map[key]) map[key] = [];
          map[key].push(s);
      });
      return map;
  }, [sessions]);

  const renderCalendar = () => {
      const year = calMonth.getFullYear();
      const month = calMonth.getMonth();
      const numDays = getDaysInMonth(year, month);
      const startDay = getFirstDayOfMonth(year, month);
      const days = [];
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      for (let i = 0; i < startDay; i++) days.push(null);
      for (let i = 1; i <= numDays; i++) days.push(i);

      let grid = [];
      for (let i = 0; i < days.length; i += 7) {
          grid.push(days.slice(i, i + 7));
      }

      return (
          <View style={styles.calContainer}>
              <View style={styles.calHeader}>
                  <TouchableOpacity onPress={() => shiftCalMonth(-1)}>
                      <ChevronLeft color="#00E5FF" size={24}/>
                  </TouchableOpacity>
                  <Text style={styles.calTitle}>{monthNames[month]} {year}</Text>
                  <TouchableOpacity onPress={() => shiftCalMonth(1)}>
                      <ChevronRight color="#00E5FF" size={24}/>
                  </TouchableOpacity>
              </View>
              <View style={styles.calDaysRow}>
                  {['S','M','T','W','T','F','S'].map((d, i) => <Text key={i} style={styles.calDayName}>{d}</Text>)}
              </View>
              {grid.map((row, rIdx) => (
                  <View key={rIdx} style={styles.calRow}>
                      {row.map((dayNum, dIdx) => {
                          if (!dayNum) return <View key={dIdx} style={styles.calCell} />;
                          const cellDate = new Date(year, month, dayNum);
                          const isToday = cellDate.toDateString() === today.toDateString();
                          
                          const key = `${year}-${month}-${dayNum}`;
                          const daySessions = sessionLookupMap[key] || [];

                          const hasWorkout = daySessions.length > 0;

                          return (
                              <TouchableOpacity 
                                key={dIdx} 
                                style={[styles.calCell, isToday && styles.calCellToday, hasWorkout && styles.calCellActive]}
                                onPress={() => hasWorkout && setSelectedSession(daySessions[0])}
                                disabled={!hasWorkout}
                              >
                                  <Text style={[styles.calCellText, hasWorkout && {color: '#000', fontWeight: 'bold'}]}>{dayNum}</Text>
                              </TouchableOpacity>
                          );
                      })}
                  </View>
              ))}
          </View>
      );
  };

  const renderSparkline = (dataPts: number[]) => {
      // Extremely minimal inline line chart
      return (
          <LineChart
            data={{ labels: [], datasets: [{ data: dataPts }] }}
            width={SCREEN_WIDTH - 80}
            height={80}
            withDots={false}
            withInnerLines={false}
            withOuterLines={false}
            withHorizontalLabels={false}
            withVerticalLabels={false}
            chartConfig={{
              backgroundColor: '#2C2C2E',
              backgroundGradientFrom: '#2C2C2E',
              backgroundGradientTo: '#2C2C2E',
              color: () => '#00E5FF',
              paddingRight: 0,
              paddingTop: 0,
            }}
            bezier
            style={{ paddingRight: 0, paddingBottom: 0, margin: 0, marginTop: 10, borderRadius: 8 }}
          />
      );
  }

  const renderOverview = () => (
      <View>
          {cumChartData ? (
            <View style={styles.chartContainer}>
              <View style={styles.chartTitleRow}>
                <TrendingUp color="#00E5FF" size={20} />
                <Text style={styles.chartTitle}>Cumulative Total Load Progression</Text>
              </View>
              <LineChart
                data={cumChartData}
                width={SCREEN_WIDTH - 80}
                height={220}
                yAxisSuffix="kg"
                withDots={false}
                chartConfig={{
                  backgroundColor: '#1C1C1E',
                  backgroundGradientFrom: '#2C2C2E',
                  backgroundGradientTo: '#1C1C1E',
                  color: (o = 1) => `rgba(0, 229, 255, ${o})`,
                  labelColor: (o = 1) => `rgba(255, 255, 255, ${o})`,
                  decimalPlaces: 0,
                  propsForDots: { r: '3' },
                }}
                bezier
                style={{ borderRadius: 16, marginVertical: 8 }}
              />
            </View>
          ) : (
            <View style={styles.emptyChart}><Text style={styles.emptyText}>Complete a few weighted workouts to see cumulative progression!</Text></View>
          )}

          {renderCalendar()}

          <Text style={styles.sectionTitle}>Workout History</Text>
          {sessions.length === 0 ? <Text style={styles.emptyText}>No finished workouts yet!</Text> : sessions.map((item, idx) => {
              const d = new Date(item.start_time);
              const totalM = item.cats.upper + item.cats.lower + item.cats.core || 1;
              const pUp = (item.cats.upper / totalM) * 100;
              const pLow = (item.cats.lower / totalM) * 100;
              const pCor = (item.cats.core / totalM) * 100;

              return (
                  <TouchableOpacity key={item.id} style={styles.card} onPress={() => setSelectedSession(item)}>
                      <View style={styles.cardHeader}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                              <Text style={styles.dateText}>{d.toLocaleDateString()} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                              <Text style={styles.templateName}>{item.template_name || 'Free Workout'}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteWorkout(item.id)}
                            style={styles.deleteHistoryBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                              <Trash2 color="#FF4444" size={18} />
                          </TouchableOpacity>
                      </View>
                      <View style={styles.statsRow}>
                          <View style={styles.statBox}><Clock size={14} color="#00E5FF" /><Text style={styles.statText}>{Math.floor((item.duration||0)/60)}m</Text></View>
                          <View style={styles.statBox}><Dumbbell size={14} color="#00E5FF" /><Text style={styles.statText}>{item.volume} kg</Text></View>
                          <View style={styles.statBox}><CalendarCheck size={14} color="#00E5FF" /><Text style={styles.statText}>{item.sets.length} sets</Text></View>
                      </View>
                      <View style={styles.stackedBarBlock}>
                          <View style={styles.stackedBar}>
                              <View style={{flex: pUp, backgroundColor: '#00E5FF'}}/>
                              <View style={{flex: pLow, backgroundColor: '#FF4444'}}/>
                              <View style={{flex: pCor, backgroundColor: '#FFBB00'}}/>
                          </View>
                          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
                              <Text style={{color: '#00E5FF', fontSize: 10, fontWeight: 'bold'}}>Upper</Text>
                              <Text style={{color: '#FF4444', fontSize: 10, fontWeight: 'bold'}}>Lower</Text>
                              <Text style={{color: '#FFBB00', fontSize: 10, fontWeight: 'bold'}}>Core</Text>
                          </View>
                      </View>
                  </TouchableOpacity>
              )
          })}
      </View>
  );

  const renderExercisesTab = () => (
      <FlatList
          data={exProgressData}
          keyExtractor={(_, idx) => idx.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Log workouts to view volume progression charts for your exercises.</Text>}
          renderItem={({ item }) => (
              <View style={styles.sparklineCard}>
                  <Text style={styles.sparklineTitle}>{item.name}</Text>
                  <Text style={styles.sparklineSubtitle}>Total Session Volume (Weight × Reps)</Text>
                  {renderSparkline(item.data)}
              </View>
          )}
      />
  );

  const renderRoutinesTab = () => (
      <FlatList
          data={routineProgressData}
          keyExtractor={(_, idx) => idx.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Log routines multiple times to view their progression charts.</Text>}
          renderItem={({ item }) => (
              <View style={styles.sparklineCard}>
                  <Text style={styles.sparklineTitle}>{item.name}</Text>
                  <Text style={styles.sparklineSubtitle}>Total Session Volume (Weight × Reps)</Text>
                  {renderSparkline(item.data)}
              </View>
          )}
      />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Analytics</Text>
      </View>

      <View style={styles.tabContainer}>
          {['Overview','Exercises','Routines'].map((tab) => (
             <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab as any)}>
                 <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
             </TouchableOpacity>
          ))}
      </View>

      {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#00E5FF" />
              <Text style={{ color: '#888', marginTop: 16 }}>Crunching data...</Text>
          </View>
      ) : (
          <>
              {activeTab === 'Overview' && (
                  <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                      {renderOverview()}
                  </ScrollView>
              )}
              {activeTab === 'Exercises' && renderExercisesTab()}
              {activeTab === 'Routines' && renderRoutinesTab()}
          </>
      )}

      {/* Session Details Modal */}
      <Modal visible={!!selectedSession} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <View style={styles.modalHeaderRow}>
               <Text style={styles.modalTitle}>{selectedSession?.template_name || 'Free Workout'}</Text>
               <View style={styles.modalHeaderActions}>
                 <TouchableOpacity onPress={() => selectedSession?.id && handleDeleteWorkout(selectedSession.id)}>
                   <Trash2 color="#FF4444" size={22} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => setSelectedSession(null)}>
                   <X color="#FFF" size={28} />
                 </TouchableOpacity>
               </View>
             </View>
             
             <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
               {(() => {
                 if (!selectedSession || !selectedSession.sets) return null;
                 const groupedSets = selectedSession.sets.reduce((acc: any, set: any) => {
                   if (!acc[set.exercise_name]) acc[set.exercise_name] = [];
                   acc[set.exercise_name].push(set);
                   return acc;
                 }, {});

                 return Object.keys(groupedSets).map((exName, idx) => (
                   <View key={idx} style={styles.groupBlock}>
                     <Text style={styles.groupTitle}>{exName}</Text>
                     {groupedSets[exName].map((set: any, sIdx: number) => {
                       const isTime = set.exercise_type === 'time';
                       const timeStr = `${Math.floor((set.duration||0)/60)}m ${(set.duration||0)%60}s`;
                       return (
                         <View key={sIdx} style={styles.setRow}>
                           <Text style={styles.setColLeft}>Set {sIdx + 1}</Text>
                           <Text style={styles.setColRight}>
                             {isTime || set.duration > 0 ? timeStr : `${set.weight || 0}kg × ${set.rep_count || 0} reps`}
                           </Text>
                         </View>
                       )
                     })}
                   </View>
                 ));
               })()}
             </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { padding: 24, paddingBottom: 10 },
  heading: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginVertical: 16, paddingHorizontal: 24 },
  list: { paddingBottom: 100, paddingHorizontal: 24 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 12, padding: 4, marginBottom: 16, marginHorizontal: 24 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#2C2C2E' },
  tabText: { color: '#666', fontWeight: 'bold', fontSize: 14 },
  tabTextActive: { color: '#00E5FF' },

  card: { backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#00E5FF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  deleteHistoryBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,68,68,0.08)' },
  dateText: { color: '#00E5FF', fontSize: 14, fontWeight: 'bold' },
  templateName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2C2C2E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statText: { color: '#E0E0E0', fontSize: 12, fontWeight: '600' },

  stackedBarBlock: { marginTop: 4 },
  stackedBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#2C2C2E' },

  chartContainer: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 20 },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  chartTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  emptyChart: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { color: '#666', textAlign: 'center', fontSize: 16 },
  
  calContainer: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 16 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  calDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  calDayName: { color: '#666', width: 36, textAlign: 'center', fontSize: 12, fontWeight: 'bold' },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  calCell: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  calCellToday: { borderWidth: 2, borderColor: '#FFF' },
  calCellActive: { backgroundColor: '#00E5FF' },
  calCellText: { color: '#FFF', fontSize: 14 },

  sparklineCard: { backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, paddingBottom: 0, marginBottom: 16 },
  sparklineTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  sparklineSubtitle: { color: '#00E5FF', fontSize: 12, fontWeight: 'bold', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  groupBlock: { backgroundColor: '#2C2C2E', borderRadius: 12, padding: 16, marginBottom: 16 },
  groupTitle: { color: '#00E5FF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#3C3C3E' },
  setColLeft: { color: '#A0A0A0', fontSize: 14, fontWeight: 'bold' },
  setColRight: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});
