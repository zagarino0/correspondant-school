import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import {
  createMedicalEvent,
  deleteMedicalEvent,
  getMedicalEvents,
  getMedicalPeople,
  updateMedicalEvent,
  type MedicalEvent,
  type MedicalEventInput,
  type MedicalEventType,
  type MedicalPerson,
} from "../../services/medical/medical.service";

const BLUE = "#344976";

const TYPE_LABELS: Record<MedicalEventType, string> = {
  CONSULTATION: "Consultation",
  MEDICAL_VISIT: "Visite médicale",
  FOLLOW_UP: "Suivi médical",
  MEDICATION: "Traitement autorisé",
  VIGILANCE: "Surveillance",
};

function formatDay(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" });
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function toLocalIso(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours || 0, minutes || 0, 0, 0);
  return value.toISOString();
}

function eventColor(event: MedicalEvent) {
  if (event.priority === "URGENT") return "#991B1B";
  if (event.status === "COMPLETED") return "#166534";
  return BLUE;
}

export default function MedicalCalendarScreen() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<MedicalEvent[]>([]);
  const [people, setPeople] = useState<MedicalPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [selectedPerson, setSelectedPerson] = useState<MedicalPerson | null>(null);
  const [type, setType] = useState<MedicalEventType>("FOLLOW_UP");
  const [title, setTitle] = useState("Suivi médical");
  const [time, setTime] = useState("14:00");
  const [description, setDescription] = useState("");

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return date;
    }),
    [weekStart],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const start = new Date(weekStart);
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);

      const [eventResult, peopleResult] = await Promise.all([
        getMedicalEvents(start.toISOString(), end.toISOString()),
        getMedicalPeople(),
      ]);

      setEvents(eventResult.events);
      setPeople(peopleResult.people.filter((person) => person.role === "STUDENT"));
    } catch {
      setError("Impossible de charger le calendrier médical.");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, MedicalEvent[]>();
    for (const event of events) {
      const key = dateKey(new Date(event.startAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const openCreate = (day: Date) => {
    setSelectedDay(day);
    setSelectedPerson(people[0] ?? null);
    setType("FOLLOW_UP");
    setTitle("Suivi médical");
    setTime("14:00");
    setDescription("");
    setModalVisible(true);
  };

  const saveEvent = async () => {
    if (!selectedPerson) {
      setError("Sélectionnez un élève.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const input: MedicalEventInput = {
        targetUserId: selectedPerson.id,
        type,
        title: title.trim() || TYPE_LABELS[type],
        description: description.trim() || null,
        startAt: toLocalIso(selectedDay, time),
        status: "PLANNED",
        priority: "NORMAL",
      };
      await createMedicalEvent(input);
      setModalVisible(false);
      await load();
    } catch {
      setError("Impossible d'enregistrer le suivi médical.");
    } finally {
      setSaving(false);
    }
  };

  const markCompleted = async (event: MedicalEvent) => {
    try {
      await updateMedicalEvent(event.id, { status: "COMPLETED" });
      await load();
    } catch {
      setError("Impossible de mettre à jour le suivi.");
    }
  };

  const removeEvent = async (event: MedicalEvent) => {
    try {
      await deleteMedicalEvent(event.id);
      await load();
    } catch {
      setError("Impossible de supprimer le suivi.");
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ESPACE INFIRMIER</Text>
          <Text style={styles.title}>Suivi médical</Text>
          <Text style={styles.subtitle}>
            Planifiez les consultations, visites et suivis réalisés à l'école.
          </Text>
        </View>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <Pressable style={styles.navButton} onPress={() => {
          const next = new Date(weekStart);
          next.setDate(next.getDate() - 7);
          setWeekStart(next);
        }}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>

        <Pressable
          style={styles.todayButton}
          onPress={() => setWeekStart(startOfWeek(new Date()))}
        >
          <Text style={styles.todayText}>Aujourd'hui</Text>
        </Pressable>

        <Pressable style={styles.navButton} onPress={() => {
          const next = new Date(weekStart);
          next.setDate(next.getDate() + 7);
          setWeekStart(next);
        }}>
          <Text style={styles.navText}>›</Text>
        </Pressable>

        <Pressable style={styles.newButton} onPress={() => openCreate(new Date())}>
          <Text style={styles.newButtonText}>+ Nouveau suivi</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.weekHeader}>
            {weekDays.map((day) => (
              <Pressable key={dateKey(day)} style={styles.dayHeader} onPress={() => openCreate(day)}>
                <Text style={styles.dayText}>{formatDay(day)}</Text>
                <Text style={[styles.addDay, dateKey(day) === dateKey(new Date()) && styles.todayDot]}>+</Text>
              </Pressable>
            ))}
          </View>

          {weekDays.map((day) => {
            const dayEvents = eventsByDay.get(dateKey(day)) ?? [];
            return (
              <View key={dateKey(day)} style={styles.daySection}>
                <View style={styles.daySectionHeader}>
                  <Text style={styles.sectionDay}>{formatDay(day)}</Text>
                  <Text style={styles.count}>{dayEvents.length} suivi(s)</Text>
                </View>

                {dayEvents.length === 0 ? (
                  <Pressable style={styles.emptyDay} onPress={() => openCreate(day)}>
                    <Text style={styles.emptyText}>Aucun suivi planifié</Text>
                    <Text style={styles.emptyAction}>Ajouter</Text>
                  </Pressable>
                ) : (
                  dayEvents.map((event) => (
                    <View key={event.id} style={styles.eventCard}>
                      <View style={[styles.eventAccent, { backgroundColor: eventColor(event) }]} />
                      <View style={styles.eventMain}>
                        <View style={styles.eventTop}>
                          <Text style={styles.eventTime}>
                            {new Date(event.startAt).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                          <Text style={[styles.status, { color: eventColor(event) }]}>
                            {event.status === "COMPLETED" ? "Effectué" : event.status === "CANCELLED" ? "Annulé" : "Prévu"}
                          </Text>
                        </View>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventPerson}>
                          {event.target ? event.target.firstName + " " + event.target.lastName : "Personne non définie"}
                        </Text>
                        <Text style={styles.eventType}>{TYPE_LABELS[event.type]}</Text>
                        {event.description ? <Text style={styles.eventDescription}>{event.description}</Text> : null}

                        <View style={styles.eventActions}>
                          {event.status === "PLANNED" ? (
                            <Pressable onPress={() => void markCompleted(event)}>
                              <Text style={styles.actionText}>Marquer effectué</Text>
                            </Pressable>
                          ) : null}
                          <Pressable onPress={() => void removeEvent(event)}>
                            <Text style={styles.deleteText}>Supprimer</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>NOUVEAU SUIVI</Text>
                <Text style={styles.modalTitle}>Planifier une activité</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Élève</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
              {people.slice(0, 30).map((person) => {
                const active = selectedPerson?.id === person.id;
                return (
                  <Pressable
                    key={person.id}
                    onPress={() => setSelectedPerson(person)}
                    style={[styles.personChip, active && styles.personChipActive]}
                  >
                    <Text style={[styles.personChipText, active && styles.personChipTextActive]}>
                      {person.firstName} {person.lastName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
              {(Object.keys(TYPE_LABELS) as MedicalEventType[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setType(value)}
                  style={[styles.personChip, type === value && styles.personChipActive]}
                >
                  <Text style={[styles.personChipText, type === value && styles.personChipTextActive]}>
                    {TYPE_LABELS[value]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Titre</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Suivi médical" />

            <View style={styles.twoFields}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Date</Text>
                <Text style={styles.readonlyField}>
                  {selectedDay.toLocaleDateString("fr-FR")}
                </Text>
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Heure</Text>
                <TextInput value={time} onChangeText={setTime} style={styles.input} keyboardType="numbers-and-punctuation" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Note / motif</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.textarea]}
              placeholder="Ex. contrôle d'une allergie"
              multiline
            />

            <Pressable disabled={saving} onPress={() => void saveEvent()} style={styles.saveButton}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Enregistrer le suivi</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F5" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E7E3",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: BLUE },
  title: { marginTop: 5, fontSize: 25, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 5, fontSize: 13, lineHeight: 18, color: "#667085", maxWidth: 650 },
  backButton: { alignSelf: "center", borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  backText: { fontSize: 12, fontWeight: "800", color: "#344054" },
  toolbar: { padding: 14, gap: 8, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" },
  navButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 24, color: BLUE, lineHeight: 26 },
  todayButton: { borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: "#EEF2F8" },
  todayText: { fontSize: 12, fontWeight: "800", color: BLUE },
  newButton: { marginLeft: "auto", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: BLUE },
  newButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  errorBox: { margin: 14, padding: 12, borderRadius: 12, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", flexDirection: "row", gap: 10, alignItems: "center" },
  errorText: { flex: 1, color: "#991B1B", fontSize: 12 },
  retryText: { color: BLUE, fontSize: 12, fontWeight: "900" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 14, paddingBottom: 30 },
  weekHeader: { flexDirection: "row", gap: 8, marginBottom: 12 },
  dayHeader: { flex: 1, minWidth: 75, padding: 10, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E7EC" },
  dayText: { fontSize: 11, fontWeight: "900", color: "#344054", textTransform: "capitalize" },
  addDay: { marginTop: 7, fontSize: 16, fontWeight: "900", color: BLUE },
  todayDot: { color: "#166534" },
  daySection: { marginBottom: 14 },
  daySectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
  sectionDay: { fontSize: 14, fontWeight: "900", color: "#111827", textTransform: "capitalize" },
  count: { fontSize: 11, color: "#667085" },
  emptyDay: { padding: 15, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#D0D5DD", backgroundColor: "#FFFFFF", flexDirection: "row", justifyContent: "space-between" },
  emptyText: { fontSize: 12, color: "#667085" },
  emptyAction: { fontSize: 12, fontWeight: "900", color: BLUE },
  eventCard: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 14, marginBottom: 8, overflow: "hidden", borderWidth: 1, borderColor: "#EAECF0" },
  eventAccent: { width: 4 },
  eventMain: { flex: 1, padding: 13 },
  eventTop: { flexDirection: "row", justifyContent: "space-between" },
  eventTime: { fontSize: 11, fontWeight: "900", color: BLUE },
  status: { fontSize: 10, fontWeight: "900" },
  eventTitle: { marginTop: 4, fontSize: 15, fontWeight: "900", color: "#101828" },
  eventPerson: { marginTop: 4, fontSize: 12, fontWeight: "800", color: "#344054" },
  eventType: { marginTop: 3, fontSize: 11, color: "#667085" },
  eventDescription: { marginTop: 7, fontSize: 12, lineHeight: 17, color: "#475467" },
  eventActions: { marginTop: 10, flexDirection: "row", gap: 16 },
  actionText: { fontSize: 11, fontWeight: "900", color: "#166534" },
  deleteText: { fontSize: 11, fontWeight: "800", color: "#B42318" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modal: { maxHeight: "92%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  modalEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.3, color: BLUE },
  modalTitle: { marginTop: 3, fontSize: 20, fontWeight: "900", color: "#101828" },
  close: { fontSize: 30, lineHeight: 28, color: "#667085" },
  fieldLabel: { marginTop: 12, marginBottom: 6, fontSize: 11, fontWeight: "900", color: "#344054" },
  peopleRow: { gap: 7, paddingBottom: 2 },
  personChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F2F4F7", borderWidth: 1, borderColor: "#E4E7EC" },
  personChipActive: { backgroundColor: "#EEF2F8", borderColor: BLUE },
  personChipText: { fontSize: 11, color: "#475467", fontWeight: "700" },
  personChipTextActive: { color: BLUE, fontWeight: "900" },
  input: { minHeight: 42, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: "#101828", fontSize: 13, backgroundColor: "#FFFFFF" },
  readonlyField: { minHeight: 42, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: "#475467", fontSize: 13, backgroundColor: "#F9FAFB" },
  twoFields: { flexDirection: "row", gap: 10 },
  fieldHalf: { flex: 1 },
  textarea: { minHeight: 72, textAlignVertical: "top" },
  saveButton: { marginTop: 16, minHeight: 46, borderRadius: 11, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
