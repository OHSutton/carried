import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Dumbbell, Timer } from 'lucide-react-native';

const MUSCLE_OPTIONS = [
  'Chest', 'Lats', 'Upper Back', 'Lower Back', 'Traps', 
  'Quads', 'Hamstrings', 'Calves', 'Core', 'Front Delts', 
  'Side Delts', 'Rear Delts', 'Biceps', 'Triceps', 'Forearms', 'Glutes'
];

interface CreateExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, type: 'weight' | 'time', muscles: string[]) => void;
  initialName?: string;
  initialType?: 'weight' | 'time';
  initialMuscles?: string[];
  isEditing?: boolean;
}

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({ 
  visible, onClose, onSubmit, initialName = '', initialType = 'weight', initialMuscles = [], isEditing = false 
}) => {
  const stableInitialMuscles = useMemo(() => initialMuscles, [JSON.stringify(initialMuscles)]);
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<'weight' | 'time'>(initialType);
  const [muscles, setMuscles] = useState<string[]>(stableInitialMuscles);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setType(initialType);
      setMuscles(stableInitialMuscles);
    }
  }, [visible, initialName, initialType, stableInitialMuscles]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), type, muscles);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlaySecondary}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardAvoiding}
        >
        <View style={[styles.modalContent, { maxHeight: '75%' }]}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Exercise' : 'New Exercise'}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerSaveButton} onPress={handleSubmit}>
                <Text style={styles.headerSaveText}>{isEditing ? 'Save' : 'Create'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <X color="#FFF" size={28} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Exercise Name..."
              placeholderTextColor="#666"
            />

            <Text style={styles.sectionLabel}>Exercise Type:</Text>
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeToggleBtn, type === 'weight' && styles.typeToggleActive]}
                onPress={() => setType('weight')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Dumbbell color={type === 'weight' ? '#000' : '#A0A0A0'} size={18} />
                  <Text style={[styles.typeToggleText, type === 'weight' && { color: '#000' }]}>Reps</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeToggleBtn, type === 'time' && styles.typeToggleActive]}
                onPress={() => setType('time')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Timer color={type === 'time' ? '#000' : '#A0A0A0'} size={18} />
                  <Text style={[styles.typeToggleText, type === 'time' && { color: '#000' }]}>Time</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Target Muscles (Optional):</Text>
            <View style={styles.muscleGrid}>
              {MUSCLE_OPTIONS.map((m) => {
                const isSel = muscles.includes(m);
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.muscleBadge, isSel && styles.muscleBadgeActive]}
                    onPress={() => {
                      if (isSel) setMuscles((prev) => prev.filter((x) => x !== m));
                      else setMuscles([...muscles, m]);
                    }}
                  >
                    <Text style={[styles.muscleBadgeText, isSel && { color: '#000' }]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlaySecondary: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalKeyboardAvoiding: {
    flex: 1,
    justifyContent: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerSaveButton: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  headerSaveText: { color: '#000', fontWeight: '700', fontSize: 14 },
  modalTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  sectionLabel: { color: '#666', fontSize: 14, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
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
});
