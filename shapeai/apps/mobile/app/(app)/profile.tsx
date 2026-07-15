import { useState, useEffect } from 'react'
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../../src/stores/auth.store'
import { getUserProfile, updateUserProfile } from '../../src/services/profile.service'
import { getReminderConfig, saveReminderConfig, type ReminderConfig } from '../../src/services/workout-reminder.service'
import type { UserProfile } from '@shapeai/shared'

const GOAL_LABEL: Record<string, string> = {
  hypertrophy: 'Hipertrofia',
  fat_loss: 'Emagrecimento',
  conditioning: 'Condicionamento',
}

const PERSONAS: Array<{
  id: 'rafael' | 'marina' | 'bruno'
  name: string
  tagline: string
}> = [
  {
    id: 'rafael',
    name: 'Rafael',
    tagline: 'Equilibrado e direto ao ponto.',
  },
  {
    id: 'marina',
    name: 'Marina',
    tagline: 'Acolhedora e motivadora.',
  },
  {
    id: 'bruno',
    name: 'Bruno',
    tagline: 'Durão e sem desculpas.',
  },
]

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { signOut, session } = useAuthStore()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<'rafael' | 'marina' | 'bruno'>('rafael')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPersona, setIsSavingPersona] = useState(false)
  const [editingField, setEditingField] = useState<'height_cm' | 'weight_kg' | 'primary_goal' | null>(null)
  const [fieldInput, setFieldInput] = useState('')
  const [reminder, setReminder] = useState<ReminderConfig>({ enabled: false, hour: 18, minute: 0 })
  const [showTimePicker, setShowTimePicker] = useState(false)

  useEffect(() => {
    getUserProfile()
      .then((p) => {
        setProfile(p)
        setSelectedPersona(p.coach_persona ?? 'rafael')
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
    getReminderConfig().then(setReminder).catch(() => {})
    AsyncStorage.getItem('user_display_name').then((n) => { if (n) setDisplayName(n) })
  }, [])

  const displayedName = displayName ?? session?.user?.email?.split('@')[0] ?? 'atleta'

  const startEditName = () => {
    setNameInput(displayName ?? '')
    setEditingName(true)
  }

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (trimmed) {
      await AsyncStorage.setItem('user_display_name', trimmed)
      setDisplayName(trimmed)
    }
    setEditingName(false)
  }

  const handleReminderToggle = async (value: boolean) => {
    const updated = { ...reminder, enabled: value }
    setReminder(updated)
    await saveReminderConfig(updated).catch(() => {})
    await updateUserProfile({ notifications_enabled: value }).catch(() => {})
  }

  const handleTimeSelect = async (hour: number, minute: number) => {
    const updated = { ...reminder, hour, minute }
    setReminder(updated)
    setShowTimePicker(false)
    await saveReminderConfig(updated).catch(() => {})
  }

  const handleSelectPersona = async (persona: 'rafael' | 'marina' | 'bruno') => {
    if (persona === selectedPersona || isSavingPersona) return
    const prev = selectedPersona
    setSelectedPersona(persona)
    setIsSavingPersona(true)
    try {
      await updateUserProfile({ coach_persona: persona })
    } catch {
      setSelectedPersona(prev)
    } finally {
      setIsSavingPersona(false)
    }
  }

  function startEdit(field: 'height_cm' | 'weight_kg') {
    if (!profile) return
    setFieldInput(String(profile[field] ?? ''))
    setEditingField(field)
  }

  async function saveNumericField(field: 'height_cm' | 'weight_kg') {
    const val = parseFloat(fieldInput)
    if (!isNaN(val) && val > 0 && profile) {
      const updated = { ...profile, [field]: val }
      setProfile(updated)
      updateUserProfile({ [field]: val }).catch(() => setProfile(profile))
    }
    setEditingField(null)
  }

  async function toggleSex() {
    if (!profile) return
    const next = profile.biological_sex === 'M' ? 'F' : 'M'
    const prev = profile
    setProfile({ ...profile, biological_sex: next })
    updateUserProfile({ biological_sex: next }).catch(() => setProfile(prev))
  }

  async function selectGoal(goal: 'hypertrophy' | 'fat_loss' | 'conditioning') {
    if (!profile) return
    const prev = profile
    setProfile({ ...profile, primary_goal: goal })
    setEditingField(null)
    updateUserProfile({ primary_goal: goal }).catch(() => setProfile(prev))
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4CAF50" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.pageTitle}>Perfil</Text>

      {/* Nome */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nome</Text>
        {editingName ? (
          <View style={styles.nameRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Seu nome"
              placeholderTextColor="#444"
              autoFocus
              returnKeyType="done"
              maxLength={24}
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity style={styles.nameSaveBtn} onPress={handleSaveName}>
              <Text style={styles.nameSaveText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nameRow} onPress={startEditName} activeOpacity={0.7}>
            <Text style={styles.nameValue}>{displayedName}</Text>
            <Text style={styles.nameEdit}>Alterar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dados corporais */}
      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Corporais</Text>
          <View style={styles.dataGrid}>

            {/* Altura */}
            <TouchableOpacity style={styles.dataCard} onPress={() => startEdit('height_cm')} activeOpacity={0.7}>
              {editingField === 'height_cm' ? (
                <TextInput
                  style={styles.dataInput}
                  value={fieldInput}
                  onChangeText={setFieldInput}
                  onBlur={() => saveNumericField('height_cm')}
                  onSubmitEditing={() => saveNumericField('height_cm')}
                  keyboardType="numeric"
                  autoFocus
                  returnKeyType="done"
                  maxLength={5}
                />
              ) : (
                <Text style={styles.dataValue}>{profile.height_cm ?? '—'}</Text>
              )}
              <Text style={styles.dataLabel}>Altura (cm)</Text>
            </TouchableOpacity>

            {/* Peso */}
            <TouchableOpacity style={styles.dataCard} onPress={() => startEdit('weight_kg')} activeOpacity={0.7}>
              {editingField === 'weight_kg' ? (
                <TextInput
                  style={styles.dataInput}
                  value={fieldInput}
                  onChangeText={setFieldInput}
                  onBlur={() => saveNumericField('weight_kg')}
                  onSubmitEditing={() => saveNumericField('weight_kg')}
                  keyboardType="numeric"
                  autoFocus
                  returnKeyType="done"
                  maxLength={5}
                />
              ) : (
                <Text style={styles.dataValue}>{profile.weight_kg ?? '—'}</Text>
              )}
              <Text style={styles.dataLabel}>Peso (kg)</Text>
            </TouchableOpacity>

            {/* Sexo — toggle direto */}
            <TouchableOpacity style={styles.dataCard} onPress={toggleSex} activeOpacity={0.7}>
              <Text style={styles.dataValue}>{profile.biological_sex === 'M' ? 'Masc.' : 'Fem.'}</Text>
              <Text style={styles.dataLabel}>Sexo</Text>
            </TouchableOpacity>

            {/* Objetivo — expande opções */}
            <TouchableOpacity
              style={styles.dataCard}
              onPress={() => setEditingField(editingField === 'primary_goal' ? null : 'primary_goal')}
              activeOpacity={0.7}
            >
              <Text style={styles.dataValue} numberOfLines={1}>{GOAL_LABEL[profile.primary_goal] ?? '—'}</Text>
              <Text style={styles.dataLabel}>Objetivo</Text>
            </TouchableOpacity>

          </View>

          {/* Seletor de objetivo */}
          {editingField === 'primary_goal' && (
            <View style={styles.goalSelector}>
              {(['hypertrophy', 'fat_loss', 'conditioning'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.goalOption, profile.primary_goal === g && styles.goalOptionSelected]}
                  onPress={() => selectGoal(g)}
                >
                  <Text style={[styles.goalOptionText, profile.primary_goal === g && styles.goalOptionTextSelected]}>
                    {GOAL_LABEL[g]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Lembrete diário de treino */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lembrete de Treino</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Lembrete diário</Text>
            <Text style={styles.rowDesc}>Receba um aviso todo dia no horário escolhido</Text>
          </View>
          <Switch
            value={reminder.enabled}
            onValueChange={handleReminderToggle}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
        {reminder.enabled && (
          <TouchableOpacity style={styles.timeRow} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.rowLabel}>Horário</Text>
            <Text style={styles.timeValue}>
              {String(reminder.hour).padStart(2, '0')}:{String(reminder.minute).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal seletor de horário */}
      <Modal visible={showTimePicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Escolha o horário</Text>
            <View style={styles.timePickerRow}>
              {/* Horas */}
              <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 24 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.timeOption, reminder.hour === i && styles.timeOptionSelected]}
                    onPress={() => handleTimeSelect(i, reminder.minute)}
                  >
                    <Text style={[styles.timeOptionText, reminder.hour === i && styles.timeOptionTextSelected]}>
                      {String(i).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.timeSeparator}>:</Text>
              {/* Minutos */}
              <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                {[0, 15, 30, 45].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.timeOption, reminder.minute === m && styles.timeOptionSelected]}
                    onPress={() => handleTimeSelect(reminder.hour, m)}
                  >
                    <Text style={[styles.timeOptionText, reminder.minute === m && styles.timeOptionTextSelected]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Personal Virtual — Persona */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Virtual</Text>
        <View style={styles.personaGrid}>
          {PERSONAS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.personaCard, selectedPersona === p.id && styles.personaCardSelected]}
              onPress={() => handleSelectPersona(p.id)}
              disabled={isSavingPersona}
            >
              <Text style={[styles.personaName, selectedPersona === p.id && styles.personaNameSelected]}>
                {p.name}
              </Text>
              <Text style={styles.personaTagline}>{p.tagline}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sair */}
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { paddingHorizontal: 24, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  planCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 24,
    gap: 12,
  },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planLabel: { color: '#aaa', fontSize: 14 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeFree: { backgroundColor: '#333' },
  badgePro: { backgroundColor: '#4CAF50' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  upgradeButton: { backgroundColor: '#0D1F0D', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  upgradeText: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dataCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  dataValue: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  dataLabel: { color: '#666', fontSize: 12 },
  dataInput: {
    color: '#4CAF50', fontSize: 20, fontWeight: '700', marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#4CAF50',
    minWidth: 60, textAlign: 'center', paddingVertical: 0,
  },
  goalSelector: { flexDirection: 'row', gap: 8, marginTop: 10 },
  goalOption: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222',
    alignItems: 'center',
  },
  goalOptionSelected: { borderColor: '#4CAF50', backgroundColor: '#0D1F0D' },
  goalOptionText: { color: '#555', fontSize: 12, fontWeight: '600' },
  goalOptionTextSelected: { color: '#4CAF50' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  rowDesc: { color: '#666', fontSize: 13, lineHeight: 18 },
  signOutButton: { marginTop: 16, alignItems: 'center', padding: 14 },
  signOutText: { color: '#555', fontSize: 15 },

  nameRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#222', gap: 10,
  },
  nameValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  nameEdit: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  nameInput: { flex: 1, color: '#fff', fontSize: 16 },
  nameSaveBtn: {
    backgroundColor: '#4CAF50', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  nameSaveText: { color: '#0A0A0A', fontWeight: '700', fontSize: 14 },

  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#111', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#222', marginTop: 8,
  },
  timeValue: { color: '#4CAF50', fontSize: 20, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#111', borderRadius: 20, padding: 24, width: 260, borderWidth: 1, borderColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  timeColumn: { maxHeight: 200, width: 70 },
  timeSeparator: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  timeOption: { paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  timeOptionSelected: { backgroundColor: '#1B3A1B' },
  timeOptionText: { color: '#666', fontSize: 18, fontWeight: '600' },
  timeOptionTextSelected: { color: '#4CAF50' },

  personaGrid: { gap: 10 },
  personaCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  personaCardSelected: { borderColor: '#4CAF50', backgroundColor: '#0D1F0D' },
  personaName: { color: '#aaa', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  personaNameSelected: { color: '#4CAF50' },
  personaTagline: { color: '#666', fontSize: 12, marginBottom: 6, fontStyle: 'italic' },
  personaExample: { color: '#444', fontSize: 12, lineHeight: 16 },
})
