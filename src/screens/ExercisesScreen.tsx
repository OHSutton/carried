import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { Dumbbell, Plus, Trash2, Clock, CheckSquare, Square, X } from 'lucide-react-native';
import { getExercises, addExercise, deleteExercise, Exercise } from '../database/queries';
import { STANDARD_MUSCLES } from '../database/seedData';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ExercisesScreen = () => {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'weight'|'time'>('weight');
    const [newNotes, setNewNotes] = useState('');
    const [newMuscles, setNewMuscles] = useState<string[]>([]);
    const [newRest, setNewRest] = useState('60');

    const loadExercises = () => {
        const data = getExercises();
        setExercises(data);
    };

    useEffect(() => {
        loadExercises();
    }, []);

    const handleSave = () => {
        if (!newName.trim()) return;
        const restVal = parseInt(newRest) || 60;
        addExercise(newName.trim(), newType, newNotes.trim(), JSON.stringify(newMuscles.sort()), restVal);
        setNewName('');
        setNewType('weight');
        setNewNotes('');
        setNewMuscles([]);
        setNewRest('60');
        setModalVisible(false);
        loadExercises();
    };

    const handleDelete = (id: number) => {
        deleteExercise(id);
        loadExercises();
    };

    const toggleMuscle = (m: string) => {
        if (newMuscles.includes(m)) {
            setNewMuscles(newMuscles.filter(x => x !== m));
        } else {
            setNewMuscles([...newMuscles, m].sort());
        }
    };

    const renderItem = ({ item }: { item: Exercise }) => {
        let parsedMuscles: string[] = [];
        try { parsedMuscles = JSON.parse(item.muscles || '[]'); } catch(e) {}
        
        return (
            <View style={styles.card}>
               <View style={styles.cardHeader}>
                   <View style={styles.cardTitleRow}>
                        {item.type === 'weight' ? <Dumbbell size={20} color="#00E5FF"/> : <Clock size={20} color="#00E5FF"/>}
                        <Text style={styles.cardTitle}>{item.name}</Text>
                   </View>
                   <TouchableOpacity onPress={() => handleDelete(item.id)}>
                       <Trash2 size={20} color="#FF4444" />
                   </TouchableOpacity>
               </View>
               <View style={styles.tagsContainer}>
                   {parsedMuscles.map(m => (
                       <View key={m} style={styles.tag}>
                           <Text style={styles.tagText}>{m}</Text>
                       </View>
                   ))}
               </View>
               {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
            </View>
        );
    };

    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.heading}>Exercise Library</Text>
            </View>
            <FlatList 
                data={exercises}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>No exercises created yet. Tap + to add one!</Text>}
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Plus color="#000" size={32} />
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView contentContainerStyle={{paddingBottom: 20}}>
                            <View style={styles.modalHeaderRow}>
                                <Text style={styles.modalTitle}>New Exercise</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                                    <X color="#FFF" size={28} />
                                </TouchableOpacity>
                            </View>

                            <TextInput 
                                style={styles.input} 
                                placeholder="Exercise Name" 
                                placeholderTextColor="#666"
                                value={newName}
                                onChangeText={setNewName}
                            />

                            <View style={styles.typeSelector}>
                                <TouchableOpacity 
                                    style={[styles.typeButton, newType === 'weight' && styles.typeButtonActive]}
                                    onPress={() => setNewType('weight')}>
                                    <Text style={styles.typeButtonText}>Weight / Reps</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.typeButton, newType === 'time' && styles.typeButtonActive]}
                                    onPress={() => setNewType('time')}>
                                    <Text style={styles.typeButtonText}>Time Based</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.sectionLabel}>Target Muscle Groups:</Text>
                            <View style={styles.musclesGrid}>
                                {STANDARD_MUSCLES.map(m => {
                                    const active = newMuscles.includes(m);
                                    return (
                                        <TouchableOpacity 
                                            key={m} 
                                            style={[styles.muscleChip, active && styles.muscleChipActive]}
                                            onPress={() => toggleMuscle(m)}>
                                            <Text style={[styles.muscleChipText, active && {color: '#000'}]}>{m}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.sectionLabel, {marginTop: 16}]}>Default Rest (Seconds):</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="60" 
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={newRest}
                                onChangeText={setNewRest}
                            />

                            <TextInput 
                                style={[styles.input, styles.textArea]} 
                                placeholder="Notes (optional)" 
                                placeholderTextColor="#666"
                                multiline
                                value={newNotes}
                                onChangeText={setNewNotes}
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.actionText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.primaryAction]} onPress={handleSave}>
                                    <Text style={styles.primaryActionText}>Save</Text>
                                </TouchableOpacity>
                            </View>
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
    list: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#00E5FF' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    tag: { backgroundColor: 'rgba(0, 229, 255, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)' },
    tagText: { color: '#00E5FF', fontSize: 12, fontWeight: 'bold' },
    cardNotes: { color: '#A0A0A0', fontSize: 14, marginTop: 4 },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 50, fontSize: 16 },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center', shadowColor: '#00E5FF', shadowOffset: {height: 4, width: 0}, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
    sectionLabel: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    input: { backgroundColor: '#2C2C2E', color: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
    textArea: { height: 80, textAlignVertical: 'top' },
    typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    typeButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#2C2C2E', alignItems: 'center' },
    typeButtonActive: { backgroundColor: 'rgba(0, 229, 255, 0.2)', borderWidth: 1, borderColor: '#00E5FF' },
    typeButtonText: { color: '#FFF', fontWeight: '600' },
    
    musclesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    muscleChip: { backgroundColor: '#2C2C2E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    muscleChipActive: { backgroundColor: '#00E5FF' },
    muscleChipText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 24 },
    actionButton: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
    actionText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    primaryAction: { backgroundColor: '#00E5FF' },
    primaryActionText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
