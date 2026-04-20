import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatRest } from '../utils/time';
import { CreateExerciseModal } from '../components/CreateExerciseModal';
import { 
    getTemplates, addTemplate, updateTemplate, deleteTemplate, 
    getExercises, addExercise, updateExercise, getPlans, addPlan, 
    updatePlan, deletePlan, setActivePlan, getActivePlan, 
    getConfig, setConfig,
    UserTemplate, Exercise, Plan
} from '../database/queries';
import { Play, Trash2, Plus, Search, X, Edit2, Dumbbell, Timer, TimerOff, CheckCircle2, Navigation, ChevronUp, ChevronDown, Bell, FileText } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../store/sessionStore';

export const WorkoutsScreen = () => {
    const insets = useSafeAreaInsets();
    const { isActive } = useSessionStore();

    // Data
    const [templates, setTemplates] = useState<UserTemplate[]>([]);
    const [allExercises, setAllExercises] = useState<Exercise[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [activePlanId, setActivePlanId] = useState<number | null>(null);

    // Dropdown state for rest timer
    const [openRestDropdownId, setOpenRestDropdownId] = useState<number | null>(null);

    // Template Builder State
    const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [selectedBuilderExercises, setSelectedBuilderExercises] = useState<any[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notesModalVisible, setNotesModalVisible] = useState(false);
    const [editingNotesExerciseId, setEditingNotesExerciseId] = useState<number | null>(null);
    const [notesDraft, setNotesDraft] = useState('');

    // Create Exercise Form State
    const [createExerciseModal, setCreateExerciseModal] = useState(false);
    const [editingLibExerciseId, setEditingLibExerciseId] = useState<number | null>(null);
    
    // Plan Builder State
    const [plansModalVisible, setPlansModalVisible] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
    const [newPlanName, setNewPlanName] = useState('');
    const [newPlanRoutines, setNewPlanRoutines] = useState<number[]>([]);
    const [newPlanFreqType, setNewPlanFreqType] = useState<string>('free_range');
    const [newPlanFreqData, setNewPlanFreqData] = useState<string>('{}');

    const MUSCLE_OPTIONS = ['Chest', 'Lats', 'Upper Back', 'Lower Back', 'Traps', 'Quads', 'Hamstrings', 'Calves', 'Core', 'Obliques', 'Front Delts', 'Side Delts', 'Rear Delts', 'Biceps', 'Triceps', 'Forearms', 'Glutes'];

    const REST_OPTIONS = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

    const loadData = () => {
        setTemplates(getTemplates());
        setAllExercises(getExercises());
        setPlans(getPlans());
        const ap = getActivePlan();
        setActivePlanId(ap ? ap.id : null);
    };

    useFocusEffect(
        React.useCallback(() => { loadData(); }, [])
    );

    const buildTemplateExercise = (exercise: Exercise, overrides: any = {}) => ({
        exerciseId: exercise.id,
        name: exercise.name,
        type: exercise.type,
        sets: '3',
        reps: exercise.type === 'weight' ? '10' : '',
        ...overrides,
        notes: overrides.notes ?? exercise.notes ?? '',
        rest_time: (overrides.rest_time ?? exercise.rest_time ?? 0).toString(),
    });

    const hydrateTemplateExercise = (item: any) => {
        const exercise = allExercises.find((ex) => ex.id === item.exerciseId);
        if (!exercise) {
            return {
                ...item,
                notes: item.notes ?? '',
                rest_time: (item.rest_time ?? 0).toString(),
            };
        }
        return buildTemplateExercise(exercise, item);
    };

    // --- TEMPLATE LOGIC ---
    const openCreateTemplateModal = () => {
        setNewTemplateName('');
        setSelectedBuilderExercises([]);
        setEditingTemplateId(null);
        setSearchQuery('');
        setEditingNotesExerciseId(null);
        setNotesDraft('');
        setHasUnsavedChanges(false);
        setTemplatesModalVisible(true);
    };

    const openEditTemplateModal = (template: UserTemplate) => {
        setEditingTemplateId(template.id);
        setNewTemplateName(template.name);
        try { setSelectedBuilderExercises(JSON.parse(template.exercises).map((item: any) => hydrateTemplateExercise(item))); } catch (e) { setSelectedBuilderExercises([]); }
        setSearchQuery('');
        setEditingNotesExerciseId(null);
        setNotesDraft('');
        setHasUnsavedChanges(false);
        setTemplatesModalVisible(true);
    };

    const handleSaveTemplate = () => {
        if (!newTemplateName.trim()) return Alert.alert('Hold up', 'Please enter a routine name.');
        if (selectedBuilderExercises.length === 0) return Alert.alert('Hold up', 'Add at least one exercise.');
        if (editingTemplateId) updateTemplate(editingTemplateId, newTemplateName.trim(), JSON.stringify(selectedBuilderExercises));
        else addTemplate(newTemplateName.trim(), JSON.stringify(selectedBuilderExercises));
        setHasUnsavedChanges(false);
        setTemplatesModalVisible(false);
        loadData();
    };

    const handleDeleteTemplate = (id: number) => {
        Alert.alert('Delete Routine?', 'Are you sure?', [
            { text: 'Cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { deleteTemplate(id); loadData(); } }
        ]);
    };

    const handleCloseTemplateModal = () => {
        if (hasUnsavedChanges) {
            Alert.alert('Discard Changes?', 'You have unsaved changes.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => { setHasUnsavedChanges(false); setTemplatesModalVisible(false); } }
            ]);
        } else setTemplatesModalVisible(false);
    };

    const handleSelectBuilderExercise = (ex: Exercise) => {
        if (!selectedBuilderExercises.find(s => s.exerciseId === ex.id)) {
            setSelectedBuilderExercises([...selectedBuilderExercises, buildTemplateExercise(ex)]);
            setHasUnsavedChanges(true);
        }
        setSearchQuery('');
    };

    const updateBuilderSelected = (id: number, field: string, value: string) => {
        setSelectedBuilderExercises(
            selectedBuilderExercises.map(s => s.exerciseId === id ? { ...s, [field]: value } : s)
        );
        setHasUnsavedChanges(true);
    };

    const moveBuilderUp = (index: number) => {
        if (index === 0) return;
        const items = [...selectedBuilderExercises];
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
        setSelectedBuilderExercises(items);
        setHasUnsavedChanges(true);
    };

    const moveBuilderDown = (index: number) => {
        if (index === selectedBuilderExercises.length - 1) return;
        const items = [...selectedBuilderExercises];
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
        setSelectedBuilderExercises(items);
        setHasUnsavedChanges(true);
    };

    const openExerciseNotesEditor = (exerciseId: number) => {
        const targetExercise = selectedBuilderExercises.find((item) => item.exerciseId === exerciseId);
        setEditingNotesExerciseId(exerciseId);
        setNotesDraft(targetExercise?.notes || '');
        setNotesModalVisible(true);
    };

    const handleSaveExerciseNotes = () => {
        if (editingNotesExerciseId === null) return;
        const targetExercise = allExercises.find((exercise) => exercise.id === editingNotesExerciseId);
        if (!targetExercise) return;

        updateExercise(
            targetExercise.id,
            targetExercise.name,
            targetExercise.type,
            notesDraft.trim(),
            targetExercise.muscles,
            targetExercise.rest_time ?? 0,
        );

        const refreshedExercises = getExercises();
        setAllExercises(refreshedExercises);
        setSelectedBuilderExercises((prev) =>
            prev.map((item) =>
                item.exerciseId === editingNotesExerciseId
                    ? { ...item, notes: notesDraft.trim() }
                    : item,
            ),
        );
        setHasUnsavedChanges(true);
        setNotesModalVisible(false);
        setEditingNotesExerciseId(null);
        setNotesDraft('');
    };

    const movePlanRoutineUp = (index: number) => {
        if (index === 0) return;
        const items = [...newPlanRoutines];
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
        setNewPlanRoutines(items);
    };

    const movePlanRoutineDown = (index: number) => {
        if (index === newPlanRoutines.length - 1) return;
        const items = [...newPlanRoutines];
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
        setNewPlanRoutines(items);
    };

    // --- PLAN LOGIC ---
    const openCreatePlanModal = () => {
        setNewPlanName('');
        setNewPlanRoutines([]);
        setNewPlanFreqType('free_range');
        setNewPlanFreqData('{}');
        setEditingPlanId(null);
        setPlansModalVisible(true);
    };

    const openEditPlanModal = (plan: Plan) => {
        setEditingPlanId(plan.id);
        setNewPlanName(plan.name);
        setNewPlanFreqType(plan.frequency_type);
        setNewPlanFreqData(plan.frequency_data);
        try { setNewPlanRoutines(JSON.parse(plan.routines)); } catch(e) { setNewPlanRoutines([]); }
        setPlansModalVisible(true);
    };

    const handleSavePlan = () => {
        if (!newPlanName.trim()) return Alert.alert('Hold up', 'Please enter a plan name.');
        if (newPlanRoutines.length === 0) return Alert.alert('Hold up', 'Add at least one routine.');
        
        if (editingPlanId) updatePlan(editingPlanId, newPlanName.trim(), JSON.stringify(newPlanRoutines), newPlanFreqType, newPlanFreqData);
        else addPlan(newPlanName.trim(), JSON.stringify(newPlanRoutines), newPlanFreqType, newPlanFreqData);
        
        setPlansModalVisible(false);
        loadData();
    };

    const handleDeletePlan = (id: number) => {
        Alert.alert('Delete Plan?', 'Are you sure?', [
            { text: 'Cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { deletePlan(id); loadData(); } }
        ]);
    };

    const toggleActivePlan = (id: number) => {
        setActivePlan(activePlanId === id ? null : id);
        loadData();
    };

    const submitCreateExercise = (name: string, type: 'weight' | 'time', muscles: string[]) => {
        if (!name.trim()) return;
        if (editingLibExerciseId) updateExercise(editingLibExerciseId, name.trim(), type, '', JSON.stringify(muscles), 0);
        else addExercise(name.trim(), type, '', JSON.stringify(muscles), 0);
        setAllExercises(getExercises());
        const newlyCreated = getExercises().find((e) => e.name === name.trim());
        if (newlyCreated && !editingLibExerciseId && templatesModalVisible) handleSelectBuilderExercise(newlyCreated);
        setCreateExerciseModal(false);
        setSearchQuery('');
    };

    const filteredExercises = allExercises.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.heading}>Workouts & Plans</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {/* PLANS SECTION */}
                <View style={styles.sectionHeaderLine}>
                    <Text style={styles.label}>Your Plans</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={openCreatePlanModal}>
                        <Plus color="#FFF" size={20} />
                    </TouchableOpacity>
                </View>

                {plans.length === 0 ? (
                    <Text style={styles.emptyText}>Group routines into a Plan to set a schedule!</Text>
                ) : (
                    plans.map(item => {
                        const isActivePlan = activePlanId === item.id;
                        return (
                            <View key={item.id} style={[styles.planCard, isActivePlan && styles.planCardActive]}>
                                <TouchableOpacity style={{ flex: 1, paddingRight: 12 }} onPress={() => toggleActivePlan(item.id)}>
                                    <Text style={styles.templateName}>{item.name}</Text>
                                    <Text style={[styles.templateMuscles, { color: isActivePlan ? '#88FF88' : '#00E5FF' }]}>
                                        {isActivePlan ? '★ ACTIVE PLAN' : 'Tap to set as Active Plan'}
                                    </Text>
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <TouchableOpacity onPress={() => openEditPlanModal(item)} style={styles.cardEditBtn}>
                                        <Edit2 color="#A0A0A0" size={20} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeletePlan(item.id)}>
                                        <Trash2 color="#FF4444" size={20} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* ROUTINES SECTION */}
                <View style={[styles.sectionHeaderLine, { marginTop: 32 }]}>
                    <Text style={styles.label}>Your Routines</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={openCreateTemplateModal}>
                        <Plus color="#FFF" size={20} />
                    </TouchableOpacity>
                </View>

                {templates.length === 0 ? (
                    <Text style={styles.emptyText}>Build a routine to get started!</Text>
                ) : (
                    templates.map(item => {
                        let matchingExercises: Exercise[] = [];
                        try { matchingExercises = JSON.parse(item.exercises).map((p: any) => allExercises.find(a => a.id === p.exerciseId)).filter(Boolean); } catch(e) {}
                        let musclesData = new Set<string>();
                        matchingExercises.forEach(ex => { try { JSON.parse(ex.muscles || '[]').forEach((m: string) => musclesData.add(m)); } catch(e) {} });
                        const musclesArr = Array.from(musclesData);

                        return (
                            <View key={item.id} style={styles.templateCard}>
                                <View style={{ flex: 1, paddingRight: 12 }}>
                                    <Text style={styles.templateName}>{item.name}</Text>
                                    {musclesArr.length > 0 && <Text style={styles.templateMuscles} numberOfLines={1}>{musclesArr.join(' • ')}</Text>}
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <TouchableOpacity onPress={() => openEditTemplateModal(item)} style={styles.cardEditBtn}>
                                        <Edit2 color="#A0A0A0" size={20} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteTemplate(item.id)}>
                                        <Trash2 color="#FF4444" size={20} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* ROUTINE MODAL */}
            <Modal visible={templatesModalVisible} animationType="slide" transparent onRequestClose={handleCloseTemplateModal}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalKeyboardAvoiding}
                    >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>{editingTemplateId ? 'Edit Routine' : 'Build Routine'}</Text>
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSaveTemplate}>
                                    <Text style={styles.primaryActionText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleCloseTemplateModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <X color="#FFF" size={28} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView
                            contentContainerStyle={styles.routineModalScrollContent}
                            keyboardShouldPersistTaps="handled"
                            scrollIndicatorInsets={{ right: 2 }}
                        >
                            <TextInput style={styles.input} placeholder="Routine Name" placeholderTextColor="#666" value={newTemplateName} onChangeText={t => { setNewTemplateName(t); setHasUnsavedChanges(true); }} />
                            <View style={styles.builderSectionHeader}>
                                <Text style={styles.sectionLabel}>Search & Add Exercises</Text>
                                <TouchableOpacity
                                    style={styles.inlineCreateBtn}
                                    onPress={() => {
                                        setEditingLibExerciseId(null);
                                        setCreateExerciseModal(true);
                                    }}
                                >
                                    <Plus color="#00E5FF" size={16} />
                                    <Text style={styles.inlineCreateBtnText}>Create Exercise</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.searchBox, { marginBottom: searchQuery ? 0 : 16 }]}>
                                <Search color="#666" size={20} />
                                <TextInput style={styles.searchInput} placeholder="Type an exercise..." placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
                            </View>
                            {searchQuery.length > 0 && (
                                <View style={styles.autocompleteContainer}>
                                    {filteredExercises.slice(0, 4).map((item) => (
                                        <View key={item.id} style={styles.exerciseSelectRow}>
                                            <TouchableOpacity style={{ flex: 1 }} onPress={() => handleSelectBuilderExercise(item)}>
                                                <Text style={styles.exerciseSelectName}>{item.name}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleSelectBuilderExercise(item)}
                                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                                style={styles.exerciseSelectIconBtn}
                                            >
                                                <Plus color="#00E5FF" size={24} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    <TouchableOpacity style={styles.exerciseSelectRow} onPress={() => { setEditingLibExerciseId(null); setCreateExerciseModal(true); }}>
                                        <Text style={[styles.exerciseSelectName, { color: '#00E5FF', fontWeight: 'bold' }]}>+ Create "{searchQuery}"</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {selectedBuilderExercises.length > 0 && (
                                <View style={styles.selectedWrapper}>
                                    {selectedBuilderExercises.map((sel, idx) => (
                                        <View key={sel.exerciseId} style={styles.compactExerciseCard}>
                                            <View style={styles.compactReorderColumn}>
                                                <TouchableOpacity
                                                    onPress={() => moveBuilderUp(idx)}
                                                    style={[styles.compactIconBtn, idx === 0 && styles.compactIconBtnDisabled]}
                                                    disabled={idx === 0}
                                                >
                                                    <ChevronUp color={idx === 0 ? '#5A5A5D' : '#A0A0A0'} size={18} />
                                                </TouchableOpacity>
                                                <View style={styles.compactControlDivider} />
                                                <TouchableOpacity
                                                    onPress={() => moveBuilderDown(idx)}
                                                    style={[styles.compactIconBtn, idx === selectedBuilderExercises.length - 1 && styles.compactIconBtnDisabled]}
                                                    disabled={idx === selectedBuilderExercises.length - 1}
                                                >
                                                    <ChevronDown color={idx === selectedBuilderExercises.length - 1 ? '#5A5A5D' : '#A0A0A0'} size={18} />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.compactExerciseBody}>
                                                <View style={styles.compactExerciseTitleRow}>
                                                    <View style={styles.compactExerciseNumberBadge}>
                                                        <Text style={styles.compactExerciseIndex}>{idx + 1}</Text>
                                                    </View>
                                                    <Text style={styles.compactExerciseName}>{sel.name}</Text>
                                                </View>
                                                <View style={styles.compactExerciseMetaRow}>
                                                    <TouchableOpacity
                                                        style={[styles.compactNotesBtn, !!sel.notes?.trim() && styles.compactNotesBtnActive]}
                                                        onPress={() => openExerciseNotesEditor(sel.exerciseId)}
                                                    >
                                                        <FileText color={sel.notes?.trim() ? '#00E5FF' : '#6F6F74'} size={16} />
                                                    </TouchableOpacity>
                                                    <View style={styles.compactStatGroup}>
                                                        <Text style={styles.compactStatLabel}>Sets</Text>
                                                        <TextInput
                                                            style={styles.compactNumberInput}
                                                            value={sel.sets}
                                                            onChangeText={(t) => updateBuilderSelected(sel.exerciseId, 'sets', t)}
                                                            keyboardType="numeric"
                                                        />
                                                    </View>
                                                    <TouchableOpacity
                                                        style={[styles.compactRestButton, openRestDropdownId === sel.exerciseId && styles.compactRestButtonActive]}
                                                        onPress={() => setOpenRestDropdownId(sel.exerciseId)}
                                                    >
                                                        {parseInt(sel.rest_time || '0', 10) <= 0 ? <TimerOff size={13} color="#00E5FF" /> : <Timer size={13} color="#00E5FF" />}
                                                        <Text style={styles.compactRestText}>{formatRest(parseInt(sel.rest_time || '0', 10))}</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => { setSelectedBuilderExercises(selectedBuilderExercises.filter(s => s.exerciseId !== sel.exerciseId)); setHasUnsavedChanges(true); }} style={styles.compactDeleteBtn}>
                                                        <Trash2 color="#FF4444" size={17} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* PLAN MODAL */}
            <Modal visible={plansModalVisible} animationType="slide" transparent onRequestClose={() => setPlansModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalKeyboardAvoiding}
                    >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>{editingPlanId ? 'Edit Plan' : 'Build Plan'}</Text>
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSavePlan}>
                                    <Text style={styles.primaryActionText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setPlansModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <X color="#FFF" size={28} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                            <TextInput style={styles.input} placeholder="Plan Name (e.g. Bro Split)" placeholderTextColor="#666" value={newPlanName} onChangeText={setNewPlanName} />
                            
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Tap to Add Routines to Plan:</Text>
                            <View style={styles.routineGrid}>
                                {templates.map(t => {
                                    return (
                                        <TouchableOpacity 
                                            key={t.id} 
                                            style={styles.routinePill} 
                                            onPress={() => {
                                                setNewPlanRoutines([...newPlanRoutines, t.id]);
                                            }}
                                        >
                                            <Text style={styles.routinePillText}>+ {t.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {newPlanRoutines.length > 0 && (
                                <View style={{ marginTop: 24 }}>
                                    <Text style={styles.sectionLabel}>Plan Order (Tap arrows to reorder):</Text>
                                    {newPlanRoutines.map((rid, idx) => {
                                        const rName = templates.find(t => t.id === rid)?.name;
                                        return (
                                            <View key={`${idx}-${rid}`} style={[styles.targetRow, { paddingBottom: 12, marginBottom: 12 }]}>
                                                <View style={styles.targetHeader}>
                                                    <Text style={styles.targetRowName}>{idx + 1}. {rName}</Text>
                                                    <View style={styles.targetControls}>
                                                        <TouchableOpacity
                                                            onPress={() => movePlanRoutineUp(idx)}
                                                            style={[styles.iconBtnTight, idx === 0 && styles.iconBtnDisabled]}
                                                            disabled={idx === 0}
                                                        >
                                                            <ChevronUp color={idx === 0 ? '#5A5A5D' : '#FFF'} size={22} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => movePlanRoutineDown(idx)}
                                                            style={[styles.iconBtnTight, idx === newPlanRoutines.length - 1 && styles.iconBtnDisabled]}
                                                            disabled={idx === newPlanRoutines.length - 1}
                                                        >
                                                            <ChevronDown color={idx === newPlanRoutines.length - 1 ? '#5A5A5D' : '#FFF'} size={22} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => {
                                                            const items = [...newPlanRoutines];
                                                            items.splice(idx, 1);
                                                            setNewPlanRoutines(items);
                                                        }} style={styles.iconBtnTight}>
                                                            <X color="#FF4444" size={22} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
            
            {/* Action Sheet Modal for Rest Picker */}
            <Modal visible={openRestDropdownId !== null} animationType="slide" transparent>
                <View style={[styles.modalOverlaySecondary, { justifyContent: 'flex-end', padding: 0 }]}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Select Rest Timer</Text>
                            <TouchableOpacity onPress={() => setOpenRestDropdownId(null)}>
                                <X color="#FFF" size={28} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {REST_OPTIONS.map((opt) => {
                                const currentSel = selectedBuilderExercises.find(s => s.exerciseId === openRestDropdownId);
                                const isActive = currentSel?.rest_time === opt.toString();
                                return (
                                    <TouchableOpacity 
                                        key={opt} 
                                        style={styles.restDropdownItem}
                                        onPress={() => {
                                            if (openRestDropdownId) updateBuilderSelected(openRestDropdownId, 'rest_time', opt.toString());
                                            setOpenRestDropdownId(null);
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

            <Modal visible={notesModalVisible} animationType="slide" transparent onRequestClose={() => {
                setNotesModalVisible(false);
                setEditingNotesExerciseId(null);
                setNotesDraft('');
            }}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalKeyboardAvoiding}
                    >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Exercise Notes</Text>
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSaveExerciseNotes}>
                                    <Text style={styles.primaryActionText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setNotesModalVisible(false);
                                        setEditingNotesExerciseId(null);
                                        setNotesDraft('');
                                    }}
                                >
                                    <X color="#FFF" size={28} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TextInput
                            style={[styles.input, styles.notesInput]}
                            placeholder="Add any cues, setup reminders, or technique notes..."
                            placeholderTextColor="#666"
                            value={notesDraft}
                            onChangeText={setNotesDraft}
                            multiline
                            textAlignVertical="top"
                            autoFocus
                        />
                    </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Create Exercise Modal */}
            <CreateExerciseModal 
                visible={createExerciseModal}
                onClose={() => setCreateExerciseModal(false)}
                onSubmit={submitCreateExercise}
                initialName={searchQuery.trim()}
                isEditing={!!editingLibExerciseId}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F0F0F' },
    header: { padding: 24, paddingBottom: 10 },
    headerRow: { padding: 24, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heading: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
    list: { paddingHorizontal: 24, paddingBottom: 100 },
    sectionHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
    label: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#2C2C2E', padding: 8, borderRadius: 8 },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 20, marginBottom: 20 },
    
    templateCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#444' },
    planCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#8844FF' },
    planCardActive: { borderLeftColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.05)' },
    cardEditBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2A2D' },
    templateName: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    templateMuscles: { color: '#00E5FF', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalKeyboardAvoiding: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    modalOverlaySecondary: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 20 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
    primaryActionBtn: { backgroundColor: '#00E5FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    primaryActionText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
    routineModalScrollContent: { paddingBottom: 40, paddingRight: 14 },
    
    input: { backgroundColor: '#2C2C2E', color: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24 },
    builderSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 },
    sectionLabel: { color: '#A0A0A0', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', flex: 1 },
    inlineCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.22)' },
    inlineCreateBtnText: { color: '#00E5FF', fontSize: 13, fontWeight: '700' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', borderRadius: 12, paddingHorizontal: 16 },
    searchInput: { flex: 1, color: '#FFF', paddingVertical: 16, marginLeft: 12, fontSize: 16 },
    autocompleteContainer: { backgroundColor: '#2C2C2E', borderRadius: 12, padding: 8, marginBottom: 24 },
    exerciseSelectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#3C3C3E' },
    exerciseSelectName: { color: '#FFF', fontSize: 16 },
    exerciseSelectIconBtn: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginRight: -4 },
    
    selectedWrapper: { marginTop: 16 },
    targetRow: { backgroundColor: '#2C2C2E', borderRadius: 12, padding: 16, marginBottom: 12 },
    targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    targetRowName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1 },
    targetControls: { flexDirection: 'row', gap: 8 },
    iconBtnTight: { padding: 4 },
    iconBtnDisabled: { opacity: 0.55 },
    targetInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    smallInput: { backgroundColor: '#1C1C1E', color: '#FFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 60, textAlign: 'center', fontSize: 16 },
    inputLabel: { color: '#A0A0A0', fontSize: 14, fontWeight: 'bold' },
    compactExerciseCard: { backgroundColor: '#202022', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, flexDirection: 'row', gap: 12, alignItems: 'stretch' },
    compactReorderColumn: { width: 34, borderRadius: 12, backgroundColor: '#161618', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, flexShrink: 0 },
    compactExerciseNumberBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,229,255,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,229,255,0.24)', flexShrink: 0 },
    compactExerciseBody: { flex: 1, gap: 10, minHeight: 68, justifyContent: 'center' },
    compactExerciseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    compactExerciseIndex: { color: '#00E5FF', fontSize: 12, fontWeight: '800', textAlign: 'center' },
    compactExerciseName: { color: '#FFF', fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 20 },
    compactNotesBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161618', borderWidth: 1, borderColor: '#242428', flexShrink: 0 },
    compactNotesBtnActive: { borderColor: 'rgba(0,229,255,0.35)', backgroundColor: 'rgba(0,229,255,0.08)' },
    compactExerciseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'nowrap' },
    compactControlDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#2D2D31', marginVertical: 2 },
    compactStatGroup: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#161618', borderRadius: 10, paddingLeft: 8, paddingRight: 5, paddingVertical: 3, flexShrink: 0 },
    compactStatLabel: { color: '#8A8A8A', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    compactNumberInput: { color: '#FFF', minWidth: 30, textAlign: 'center', fontSize: 15, fontWeight: '700', paddingVertical: 2, paddingHorizontal: 6 },
    compactRestButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#161618', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, flexShrink: 1, minWidth: 0 },
    compactRestButtonActive: { borderWidth: 1, borderColor: 'rgba(0,229,255,0.35)' },
    compactRestText: { color: '#FFF', fontSize: 12, fontWeight: '700', flexShrink: 1 },
    compactControls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    compactIconBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    compactIconBtnDisabled: { opacity: 0.7 },
    compactDeleteBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,68,68,0.08)' },
    notesInput: { minHeight: 160 },
    
    freqToggleBlock: { flexDirection: 'row', gap: 12 },
    freqBtn: { flex: 1, backgroundColor: '#2C2C2E', padding: 16, borderRadius: 12, alignItems: 'center' },
    freqBtnActive: { backgroundColor: '#00E5FF' },
    freqText: { color: '#FFF', fontWeight: 'bold' },
    freqTextActive: { color: '#000' },
    
    routineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    routinePill: { backgroundColor: '#2C2C2E', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
    routinePillActive: { backgroundColor: '#00E5FF' },
    routinePillText: { color: '#FFF', fontWeight: 'bold' },
    routinePillTextActive: { color: '#000' },

    restBubble: { backgroundColor: '#2C2C2E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    restBubbleActive: { backgroundColor: '#00E5FF' },
    restBubbleText: { color: '#FFF', fontWeight: 'bold' },

    restSelectBtn: { backgroundColor: '#1C1C1E', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3C3C3E' },
    restSelectText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    restDropdownMenu: { backgroundColor: '#1C1C1E', marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: '#3C3C3E', overflow: 'hidden' },
    restDropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
    restDropdownText: { color: '#FFF', fontSize: 16 },
});
