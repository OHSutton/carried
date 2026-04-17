import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Keyboard, StyleSheet } from 'react-native';
import { Check, Square } from 'lucide-react-native';
import { formatTimeLocal } from '../utils/time';

export const SetRow = React.memo(({ setIdx, isLogged, currentInput, inputKey, target, prevLabel, prevSet, handleUntick, handleLogSet, updateLiveInput, openTimePicker }: any) => {
  const [weight, setWeight] = useState(currentInput.weight);
  const [reps, setReps] = useState(currentInput.reps);

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
     setWeight(currentInput.weight);
     setReps(currentInput.reps);
  }, [currentInput.weight, currentInput.reps]);

  useEffect(() => {
      let int: any;
      if (timerRunning) {
          int = setInterval(() => setTimerSeconds(s => s + 1), 1000);
      }
      return () => clearInterval(int);
  }, [timerRunning]);

  const handleToggleTimer = () => {
      if (timerRunning) {
          setTimerRunning(false);
          updateLiveInput(inputKey, 'duration', timerSeconds.toString());
      } else {
          setTimerRunning(true);
          setTimerSeconds(currentInput.duration ? parseInt(currentInput.duration) : 0);
      }
  };

  const isTime = target.type === 'time';
  const currentDuration = isLogged ? (isLogged.duration || 0) : (timerRunning ? timerSeconds : (parseInt(currentInput.duration) || 0));

  return (
    <View style={styles.tableRow}>
      <View style={[styles.rowContent, isLogged && styles.rowContentCompleted]}>
        <View style={styles.colPrevWrap}>
          <Text style={styles.colPrevCell}>{prevLabel}</Text>
        </View>
        
        {isTime ? (
            <View style={styles.timeEntryWrap}>
                {!isLogged && (
                   <TouchableOpacity onPress={handleToggleTimer} style={[styles.timeToggleButton, timerRunning && styles.timeToggleButtonActive]}>
                      <Text style={[styles.timeToggleText, timerRunning && styles.timeToggleTextActive]}>{timerRunning ? 'STOP' : 'START'}</Text>
                   </TouchableOpacity>
                )}
                <TouchableOpacity disabled={!!isLogged || timerRunning} onPress={() => !isLogged && !timerRunning && openTimePicker && openTimePicker(inputKey, currentDuration)} style={styles.timeDurationButton}>
                   <Text style={styles.timeDurationText}>{currentDuration > 0 ? formatTimeLocal(currentDuration) : '0s'}</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <>
                <View style={styles.inputColumn}>
                  <TextInput
                    key={isLogged ? 'logged' : 'unlogged'}
                    style={styles.colWeightInput}
                    keyboardType="numeric"
                    placeholder={prevSet && prevSet.weight > 0 ? prevSet.weight.toString() : '--'}
                    placeholderTextColor="#666"
                    value={isLogged ? isLogged.weight?.toString() : weight}
                    editable={!isLogged}
                    onChangeText={(val) => {
                      setWeight(val);
                      updateLiveInput(inputKey, 'weight', val);
                    }}
                  />
                </View>
                <View style={styles.inputColumn}>
                  <TextInput
                    key={isLogged ? 'logged-rep' : 'unlogged-rep'}
                    style={styles.colRepsInput}
                    keyboardType="numeric"
                    placeholder={prevSet && prevSet.rep_count > 0 ? prevSet.rep_count.toString() : (target.reps || '--')}
                    placeholderTextColor="#666"
                    value={isLogged ? isLogged.rep_count?.toString() : reps}
                    editable={!isLogged}
                    onChangeText={(val) => {
                      setReps(val);
                      updateLiveInput(inputKey, 'reps', val);
                    }}
                  />
                </View>
            </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.colCheckCol, isLogged && styles.colCheckColCompleted]}
        onPress={() => {
            Keyboard.dismiss();
            if (isLogged) {
                handleUntick(isLogged.id);
            } else {
                let dur = currentDuration;
                if (timerRunning) {
                    setTimerRunning(false);
                    dur = timerSeconds;
                    updateLiveInput(inputKey, 'duration', dur.toString());
                }
                handleLogSet(target.exerciseId, setIdx, target.rest_time, isTime ? dur : undefined, target.reps);
            }
        }}
      >
        {isLogged ? <Check color="#00E5FF" size={28} strokeWidth={3} /> : <Square color="#5C5C60" size={28} strokeWidth={2.2} />}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  tableRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'stretch',
    minHeight: 58,
    gap: 6,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    alignItems: 'stretch',
    minHeight: 58,
  },
  rowContentCompleted: { backgroundColor: '#162C2A' },
  colPrevWrap: { flex: 1.45, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  colPrevCell: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputColumn: { flex: 1.35, justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  colWeightInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  colRepsInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeEntryWrap: { flex: 2.7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  timeToggleButton: { backgroundColor: '#2C2C2E', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  timeToggleButtonActive: { backgroundColor: '#FF4444' },
  timeToggleText: { color: '#00E5FF', fontWeight: 'bold', fontSize: 12 },
  timeToggleTextActive: { color: '#FFF' },
  timeDurationButton: { minWidth: 72, alignItems: 'center', backgroundColor: '#2C2C2E', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  timeDurationText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  colCheckCol: { width: 58, backgroundColor: '#141416', alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  colCheckColCompleted: { backgroundColor: 'rgba(0,229,255,0.08)' },
});
