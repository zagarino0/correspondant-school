import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";

import {
  createAttendanceEvent,
  createParentSummons,
  getAttendance,
  getClasses,
  getDashboard,
} from "../../../services/surveillant/surveillant.service";
import type {
  AttendanceEventType,
  SurveillantAttendanceItem,
  SurveillantClassOption,
  SurveillantDashboardResponse,
  SurveillantSession,
  ParentSummonsReason,
} from "../../../services/surveillant/surveillant.types";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import type { RealtimeEvent } from "../../../services/realtime/websocket.types";

type Props = { firstName: string };

const ACTIONS: Array<{ type: AttendanceEventType; label: string }> = [
  { type: "LATE_AUTHORIZED", label: "Retard autorisé" },
  { type: "LATE_NOT_AUTHORIZED", label: "Retard non autorisé" },
  { type: "ABSENCE_JUSTIFIED", label: "Absence justifiée" },
  { type: "ABSENCE_UNJUSTIFIED", label: "Absence non justifiée" },
];

export function SurveillantDashboard({ firstName }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<SurveillantDashboardResponse | null>(null);
  const [controlSession, setControlSession] = useState<SurveillantSession | null>(null);
  const [controlStudents, setControlStudents] = useState<SurveillantAttendanceItem[]>([]);
  const [controlLoading, setControlLoading] = useState(false);
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [classCategory, setClassCategory] = useState<"primaire" | "premier-cycle" | "deuxieme-cycle" | "">("");
  const [classOptions, setClassOptions] = useState<SurveillantClassOption[]>([]);
  const [classPickerLoading, setClassPickerLoading] = useState(false);
  const [classPickerHasMore, setClassPickerHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [summonsStudent, setSummonsStudent] = useState<SurveillantAttendanceItem | null>(null);
  const [summonsVisible, setSummonsVisible] = useState(false);
  const [summonsReason, setSummonsReason] = useState<ParentSummonsReason>("Retards répétés");
  const [summonsMessage, setSummonsMessage] = useState("");
  const [summonsDate, setSummonsDate] = useState("");
  const [summonsTime, setSummonsTime] = useState("");
  const [summonsError, setSummonsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(await getDashboard());
  }, []);

  useEffect(() => {
    let mounted = true;
    void load()
      .catch(() => {
        if (mounted) setData(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const connection = createRealtimeConnection({
      onEvent: (event: RealtimeEvent) => {
        if (event.type === "attendance:event" || event.type === "parent:summons:new") {
          void load().catch(() => undefined);
        }
      },
    });
    connection.connect();

    return () => {
      mounted = false;
      connection.close();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const openClassPicker = useCallback(async () => {
    setClassPickerVisible(true);
    setClassSearch("");
    setClassLevel("");
    setClassCategory("");
    setClassPickerLoading(true);
    try {
      const result = await getClasses({ limit: 20 });
      setClassOptions(result.items);
      setClassPickerHasMore(result.hasMore);
    } finally {
      setClassPickerLoading(false);
    }
  }, []);

  const searchClasses = useCallback(async (search: string, level = classLevel, category = classCategory) => {
    setClassSearch(search);
    setClassPickerLoading(true);
    try {
      const result = await getClasses({
        search,
        level: level || undefined,
        category: category || undefined,
        limit: 20,
      });
      setClassOptions(result.items);
      setClassPickerHasMore(result.hasMore);
    } finally {
      setClassPickerLoading(false);
    }
  }, [classCategory, classLevel]);

  const applyClassFilters = useCallback(async (level: string, category: "" | "primaire" | "premier-cycle" | "deuxieme-cycle") => {
    setClassLevel(level);
    setClassCategory(category);
    setClassPickerLoading(true);
    try {
      const result = await getClasses({
        search: classSearch,
        level: level || undefined,
        category: category || undefined,
        limit: 20,
      });
      setClassOptions(result.items);
      setClassPickerHasMore(result.hasMore);
    } finally {
      setClassPickerLoading(false);
    }
  }, [classSearch]);

  const openClassControl = useCallback(async (session: SurveillantSession) => {
    setControlSession(session);
    setControlStudents([]);
    setControlLoading(true);
    try {
      const result = await getAttendance({ classId: session.classId });
      setControlStudents(result.attendance);
    } finally {
      setControlLoading(false);
    }
  }, []);

  const closeClassControl = () => {
    if (busyId === null) {
      setControlSession(null);
      setControlStudents([]);
    }
  };

  const handleEvent = async (item: SurveillantAttendanceItem, type: AttendanceEventType) => {
    setBusyId(`${item.id}:${type}`);
    try {
      await createAttendanceEvent(item.studentId, item.id, type);
      const result = await getAttendance({ classId: controlSession?.classId });
      setControlStudents(result.attendance);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const defaultSummonsMessage = useCallback(
    (
      reason: ParentSummonsReason,
      student: SurveillantAttendanceItem | null,
      date = summonsDate,
      time = summonsTime,
    ) => {
      const name = student ? `${student.student.firstName} ${student.student.lastName}` : "votre enfant";
      const className = controlSession?.className ?? "sa classe";
      const appointment = date && time
        ? `\n\nRendez-vous : ${date} à ${time}`
        : "";
      return `Bonjour,\n\nNous vous invitons à vous présenter à l’établissement concernant ${reason.toLowerCase()} de votre enfant ${name}, élève de ${className}.${appointment}\n\nMerci de prendre connaissance de cette convocation.`;
    },
    [controlSession, summonsDate, summonsTime],
  );

  const openSummons = (item: SurveillantAttendanceItem) => {
    const reason: ParentSummonsReason =
      item.events[0]?.type === "LATE_NOT_AUTHORIZED"
        ? "Retard non autorisé"
        : item.status === "ABSENT"
          ? "Absence non justifiée"
          : "Retards répétés";
    const now = new Date();
    const autoDate = [
      String(now.getDate()).padStart(2, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      now.getFullYear(),
    ].join("/");
    const autoTime = [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join(":");

    setSummonsStudent(item);
    setSummonsReason(reason);
    setSummonsDate(autoDate);
    setSummonsTime(autoTime);
    setSummonsMessage(defaultSummonsMessage(reason, item, autoDate, autoTime));
    setSummonsError(null);
    setSummonsVisible(true);
  };

  const closeSummons = () => {
    if (busyId === null) {
      setSummonsVisible(false);
      setSummonsStudent(null);
      setSummonsError(null);
    }
  };

  const submitSummons = async () => {
    if (!summonsStudent) return;

    let message = summonsMessage.trim();
    if (!message) {
      setSummonsError("Le message au parent est obligatoire.");
      return;
    }
    if ((summonsDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(summonsDate)) ||
        (summonsTime && !/^\d{2}:\d{2}$/.test(summonsTime))) {
      setSummonsError("Utilisez les formats JJ/MM/AAAA et HH:MM.");
      return;
    }

    let scheduledAt: string | null = null;
    if (summonsDate && summonsTime) {
      const [day, month, year] = summonsDate.split("/").map(Number);
      const [hour, minute] = summonsTime.split(":").map(Number);
      const date = new Date(year, month - 1, day, hour, minute);
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getHours() !== hour ||
        date.getMinutes() !== minute
      ) {
        setSummonsError("La date ou l’heure du rendez-vous est invalide.");
        return;
      }
      scheduledAt = date.toISOString();

      const appointmentText = `Rendez-vous : ${summonsDate} à ${summonsTime}`;
      const appointmentPattern = /Rendez-vous\s*:\s*\d{2}\/\d{2}\/\d{4}\s+à\s+\d{2}:\d{2}/i;
      const legacyAppointmentPattern = /\ble\s+\d{2}\/\d{2}\/\d{4}\s+à\s+\d{2}:\d{2}/i;

      if (appointmentPattern.test(message)) {
        message = message.replace(appointmentPattern, appointmentText);
      } else if (legacyAppointmentPattern.test(message)) {
        message = message.replace(legacyAppointmentPattern, appointmentText);
      } else {
        message = `${message.replace(/\s+$/, "")}\n\n${appointmentText}`;
      }
    } else if (summonsDate || summonsTime) {
      setSummonsError("Renseignez la date et l’heure du rendez-vous ensemble.");
      return;
    }

    setBusyId(`summons:${summonsStudent.studentId}`);
    setSummonsError(null);
    try {
      await createParentSummons(summonsStudent.studentId, {
        attendanceEventId: summonsStudent.events[0]?.id ?? null,
        reason: summonsReason,
        message,
        scheduledAt,
      });
      closeSummons();
      await load();
    } catch {
      setSummonsError("Impossible d’envoyer la convocation au parent.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#344976" />
        <Text style={styles.loadingText}>Chargement de votre espace…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Espace surveillant indisponible</Text>
        <Text style={styles.emptyText}>Impossible de charger les données de surveillance.</Text>
        <Pressable style={styles.primaryButton} onPress={() => void refresh()}>
          <Text style={styles.primaryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const statWidth = width >= 720 ? "31.5%" : "31%";

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour {firstName}</Text>
          <Text style={styles.role}>Espace surveillant</Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Élèves" value={data.summary.totalStudents} width={statWidth} />
          <Stat label="Présences" value={data.summary.presentToday} width={statWidth} />
          <Stat label="Retards" value={data.summary.lateToday} width={statWidth} />
        </View>
        <SectionTitle title="ACCÈS RAPIDES" />
        <View style={styles.quickActions}>
          <Pressable style={styles.quickAction} onPress={() => router.push("/(app)/students")}>
            <Text style={styles.quickActionIcon}>É</Text>
            <View style={styles.quickActionCopy}>
              <Text style={styles.quickActionLabel}>Élèves</Text>
              <Text style={styles.quickActionDescription}>Rechercher et consulter les fiches élèves</Text>
            </View>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push("/(app)/surveillant/school-life")}>
            <Text style={styles.quickActionIcon}>V</Text>
            <View style={styles.quickActionCopy}>
              <Text style={styles.quickActionLabel}>Vie scolaire</Text>
              <Text style={styles.quickActionDescription}>Sorties, mouvements, incidents et autorisations</Text>
            </View>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push("/(app)/schedule")}>
            <Text style={styles.quickActionIcon}>E</Text>
            <View style={styles.quickActionCopy}>
              <Text style={styles.quickActionLabel}>Emploi du temps</Text>
              <Text style={styles.quickActionDescription}>Consulter le planning de toutes les classes</Text>
            </View>
          </Pressable>
        </View>

        <SectionTitle title="SUIVI DU JOUR" />
        <View style={styles.card}>
          {data.currentSession ? (
            <>
              <Text style={styles.time}>
                {formatTime(data.currentSession.startTime)} – {formatTime(data.currentSession.endTime)}
              </Text>
              <Text style={styles.className}>{data.currentSession.className}</Text>
              <Text style={styles.subject}>
                {teacherName(data.currentSession)} — {data.currentSession.subject}
              </Text>
              <Text style={styles.meta}>
                Présents {data.currentSession.attendance.present} · Absents{" "}
                {data.currentSession.attendance.absent} · Retards {data.currentSession.attendance.late}
              </Text>
              <Pressable
                style={styles.outlineButton}
                onPress={() => void openClassControl(data.currentSession!)}
              >
                <Text style={styles.outlineButtonText}>Voir la classe</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyCard}>Aucune séance en cours.</Text>
          )}
        </View>

        <SectionTitle title="PRÉSENCES À CONTRÔLER" />
        <View style={styles.cardList}>
          {data.attendanceToControl.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyCard}>Aucune présence à contrôler.</Text>
            </View>
          ) : (
            data.attendanceToControl.map((session) => (
              <View key={session.scheduleId} style={styles.controlRow}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{session.className}</Text>
                  <Text style={styles.rowMeta}>{session.attendance.totalStudents} élèves</Text>
                </View>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => void openClassControl(session)}
                >
                  <Text style={styles.smallButtonText}>Contrôler</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => void openClassPicker()}>
          <Text style={styles.secondaryButtonText}>Rechercher une classe</Text>
        </Pressable>

        <SectionTitle title="RETARDS DU JOUR" />
        <View style={styles.card}>
          {data.lateArrivals.length === 0 ? (
            <Text style={styles.emptyCard}>Aucun retard enregistré aujourd’hui.</Text>
          ) : (
            data.lateArrivals.slice(0, 8).map((item) => (
              <View key={item.id} style={styles.lateRow}>
                <Text style={styles.lateStudent}>
                  {item.student.firstName} {item.student.lastName}
                </Text>
                <Text style={styles.lateTime}>
                  {item.attendance.arrivalTime ? formatDateTime(item.attendance.arrivalTime) : "—"}
                </Text>
              </View>
            ))
          )}
        </View>

        <SectionTitle title="PROCHAINEMENT" />
        <View style={styles.card}>
          {data.upcomingSessions.length === 0 ? (
            <Text style={styles.emptyCard}>Aucune séance à venir.</Text>
          ) : (
            data.upcomingSessions.slice(0, 6).map((session) => (
              <View key={session.scheduleId} style={styles.upcomingRow}>
                <Text style={styles.upcomingTime}>{formatTime(session.startTime)}</Text>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{session.className}</Text>
                  <Text style={styles.rowMeta}>{session.subject}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={classPickerVisible} transparent animationType="slide" onRequestClose={() => setClassPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, width >= 720 && styles.modalWide]}>
            <View style={styles.modalHeader}>
              <View style={styles.rowMain}>
                <Text style={styles.modalTitle}>Rechercher une classe</Text>
                <Text style={styles.rowMeta}>Les résultats sont chargés progressivement.</Text>
              </View>
              <Pressable onPress={() => setClassPickerVisible(false)}>
                <Text style={styles.closeText}>Fermer</Text>
              </Pressable>
            </View>
            <TextInput
              value={classSearch}
              onChangeText={(value) => void searchClasses(value)}
              placeholder="Rechercher une classe…"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoFocus
            />
            <View style={styles.filterRow}>
              {[
                ["", "Toutes"],
                ["primaire", "Primaire"],
                ["premier-cycle", "Premier cycle"],
                ["deuxieme-cycle", "Deuxième cycle"],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  style={[styles.filterChip, classCategory === value && styles.filterChipActive]}
                  onPress={() => void applyClassFilters(classLevel, value as "" | "primaire" | "premier-cycle" | "deuxieme-cycle")}
                >
                  <Text style={[styles.filterChipText, classCategory === value && styles.filterChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={classLevel}
              onChangeText={(value) => void applyClassFilters(value, classCategory)}
              placeholder="Niveau exact (ex. 6e, 5e, CM2)…"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
            {classPickerLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#344976" />
              </View>
            ) : (
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {classOptions.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.classOption}
                    onPress={() => {
                      setClassPickerVisible(false);
                      void openClassControl({
                        scheduleId: "class:" + item.id,
                        classId: item.id,
                        className: item.name,
                        subject: "",
                        teacher: null,
                        startTime: "",
                        endTime: "",
                        room: null,
                      });
                    }}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      <Text style={styles.rowMeta}>
                        {item.level ? item.level + " · " : ""}{item.studentCount} élèves
                      </Text>
                    </View>
                    <Text style={styles.selectText}>Contrôler</Text>
                  </Pressable>
                ))}
                {classOptions.length === 0 && (
                  <Text style={styles.emptyCard}>Aucune classe trouvée.</Text>
                )}
                {classPickerHasMore && (
                  <Text style={styles.moreHint}>Affinez la recherche pour accéder aux autres classes.</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={controlSession !== null} transparent animationType="slide" onRequestClose={closeClassControl}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, width >= 720 && styles.modalWide]}>
            <View style={styles.modalHeader}>
              <View style={styles.rowMain}>
                <Text style={styles.modalTitle}>{controlSession?.className ?? "Classe"}</Text>
                <Text style={styles.rowMeta}>Contrôle des présences</Text>
              </View>
              <Pressable onPress={closeClassControl} disabled={busyId !== null}>
                <Text style={styles.closeText}>Fermer</Text>
              </Pressable>
            </View>

            {controlLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#344976" />
                <Text style={styles.loadingText}>Chargement des élèves…</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalList}>
                {controlStudents.map((item) => (
                  <View key={item.id} style={styles.studentRow}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>
                        {item.student.firstName} {item.student.lastName}
                      </Text>
                      <Text style={styles.rowMeta}>{attendanceLabel(item)}</Text>
                    </View>

                    <View style={styles.studentActions}>
                      {availableActions(item).map((action) => {
                        const active = item.events.some((event) => event.type === action.type);
                        return (
                          <Pressable
                            key={action.type}
                            style={[styles.eventButton, active && styles.eventButtonActive]}
                            disabled={busyId !== null}
                            onPress={() => void handleEvent(item, action.type)}
                          >
                            <Text style={[styles.eventButtonText, active && styles.eventButtonTextActive]}>
                              {shortActionLabel(action.type)}
                            </Text>
                          </Pressable>
                        );
                      })}
                      <Pressable
                        style={styles.summonsButton}
                        disabled={busyId !== null}
                        onPress={() => openSummons(item)}
                      >
                        <Text style={styles.summonsText}>Convoquer</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={summonsVisible} transparent animationType="slide" onRequestClose={closeSummons}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, width >= 720 && styles.modalWide]}>
            <View style={styles.modalHeader}>
              <View style={styles.rowMain}>
                <Text style={styles.modalTitle}>CONVOQUER LE PARENT</Text>
                <Text style={styles.rowMeta}>
                  {summonsStudent
                    ? `${summonsStudent.student.firstName} ${summonsStudent.student.lastName} · ${controlSession?.className ?? "Classe"}`
                    : ""}
                </Text>
              </View>
              <Pressable onPress={closeSummons} disabled={busyId !== null}>
                <Text style={styles.closeText}>Fermer</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.summonsForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Motif</Text>
              <View style={styles.reasonGrid}>
                {([
                  "Retards répétés",
                  "Retard non autorisé",
                  "Absences répétées",
                  "Absence non justifiée",
                  "Problème de ponctualité",
                  "Suivi disciplinaire",
                  "Autre",
                ] as ParentSummonsReason[]).map((reason) => (
                  <Pressable
                    key={reason}
                    style={[styles.reasonChip, summonsReason === reason && styles.reasonChipActive]}
                    onPress={() => {
                      setSummonsReason(reason);
                      setSummonsMessage(defaultSummonsMessage(reason, summonsStudent));
                    }}
                  >
                    <Text style={[styles.reasonChipText, summonsReason === reason && styles.reasonChipTextActive]}>
                      {reason}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>Message au parent</Text>
              <TextInput
                value={summonsMessage}
                onChangeText={setSummonsMessage}
                multiline
                textAlignVertical="top"
                style={styles.messageInput}
                placeholder="Message de convocation…"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.formLabel}>Date du rendez-vous</Text>
              <TextInput
                value={summonsDate}
                onChangeText={setSummonsDate}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
                style={styles.searchInput}
              />

              <Text style={styles.formLabel}>Heure du rendez-vous</Text>
              <TextInput
                value={summonsTime}
                onChangeText={setSummonsTime}
                placeholder="HH:MM"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
                style={styles.searchInput}
              />

              {summonsError ? <Text style={styles.formError}>{summonsError}</Text> : null}

              <View style={styles.formActions}>
                <Pressable style={styles.cancelButton} onPress={closeSummons} disabled={busyId !== null}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={() => void submitSummons()} disabled={busyId !== null}>
                  {busyId?.startsWith("summons:") ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Convoquer</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Stat({ label, value, width }: { label: string; value: number; width: DimensionValue }) {
  return (
    <View style={[styles.stat, { width }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function teacherName(session: SurveillantSession) {
  return session.teacher ? `M. ${session.teacher.lastName}` : "Enseignant non renseigné";
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function attendanceLabel(item: SurveillantAttendanceItem) {
  const latest = item.events[0];
  if (latest) return eventLabel(latest.type);
  if (item.status === "PRESENT") return "Présent";
  if (item.status === "ABSENT") return "Absent";
  if (item.status === "LATE") return "Retard";
  return "Enregistré";
}

function availableActions(item: SurveillantAttendanceItem) {
  if (item.status === "LATE") {
    return ACTIONS.filter(
      (action) =>
        action.type === "LATE_AUTHORIZED" ||
        action.type === "LATE_NOT_AUTHORIZED",
    );
  }

  if (item.status === "ABSENT") {
    return ACTIONS.filter(
      (action) =>
        action.type === "ABSENCE_JUSTIFIED" ||
        action.type === "ABSENCE_UNJUSTIFIED",
    );
  }

  return [];
}

function eventLabel(type: AttendanceEventType) {
  if (type === "LATE_AUTHORIZED") return "Retard autorisé";
  if (type === "LATE_NOT_AUTHORIZED") return "Retard non autorisé";
  if (type === "ABSENCE_JUSTIFIED") return "Absence justifiée";
  return "Absence non justifiée";
}

function shortActionLabel(type: AttendanceEventType) {
  if (type === "LATE_AUTHORIZED") return "RA";
  if (type === "LATE_NOT_AUTHORIZED") return "RNA";
  if (type === "ABSENCE_JUSTIFIED") return "AJ";
  return "ANJ";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16, paddingBottom: 110, gap: 10 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAction: {
    flex: 1,
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#EEF2F7",
    color: "#344976",
    fontSize: 14,
    fontWeight: "900",
    overflow: "hidden",
  },
  quickActionCopy: { flex: 1 },
  quickActionLabel: { fontSize: 12, fontWeight: "900", color: "#344976" },
  quickActionDescription: { marginTop: 3, fontSize: 9, lineHeight: 13, color: "#64748B" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { marginTop: 8, color: "#64748B", fontSize: 13 },
  empty: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyText: { marginTop: 8, color: "#64748B", textAlign: "center" },
  header: { paddingVertical: 8, marginBottom: 4 },
  greeting: { fontSize: 25, fontWeight: "800", color: "#111827" },
  role: { marginTop: 3, fontSize: 14, fontWeight: "700", color: "#344976" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  stat: { minHeight: 82, padding: 13, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  statValue: { marginTop: 8, fontSize: 24, fontWeight: "900", color: "#111827" },
  sectionTitle: { marginTop: 16, marginBottom: 3, fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  card: { padding: 15, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  cardList: { gap: 8 },
  time: { fontSize: 12, fontWeight: "900", color: "#344976" },
  className: { marginTop: 5, fontSize: 17, fontWeight: "900", color: "#111827" },
  subject: { marginTop: 3, fontSize: 13, color: "#475569" },
  meta: { marginTop: 12, fontSize: 12, color: "#64748B" },
  outlineButton: { alignSelf: "flex-start", marginTop: 13, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: "#344976" },
  outlineButtonText: { color: "#344976", fontSize: 11, fontWeight: "900" },
  controlRow: { minHeight: 62, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  rowMeta: { marginTop: 3, fontSize: 12, color: "#64748B" },
  smallButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: "#344976" },
  smallButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  secondaryButton: { alignSelf: "stretch", minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  secondaryButtonText: { color: "#344976", fontSize: 12, fontWeight: "900" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  filterChipActive: { borderColor: "#344976", backgroundColor: "#344976" },
  filterChipText: { fontSize: 10, fontWeight: "800", color: "#475569" },
  filterChipTextActive: { color: "#FFFFFF" },
  searchInput: { minHeight: 46, marginBottom: 10, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", color: "#111827", fontSize: 13 },
  classOption: { minHeight: 60, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 7, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  selectText: { color: "#344976", fontSize: 11, fontWeight: "900" },
  moreHint: { paddingVertical: 12, textAlign: "center", color: "#64748B", fontSize: 11 },
  lateRow: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  lateStudent: { fontSize: 13, fontWeight: "700", color: "#111827" },
  lateTime: { fontSize: 12, color: "#64748B" },
  upcomingRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  upcomingTime: { width: 48, fontSize: 12, fontWeight: "900", color: "#344976" },
  emptyCard: { color: "#64748B", fontSize: 13 },
  primaryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: "#344976" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.35)" },
  modal: { maxHeight: "88%", backgroundColor: "#F5F7FA", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  modalWide: { width: "92%", maxWidth: 900, alignSelf: "center", marginBottom: 20, borderRadius: 22 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  closeText: { color: "#344976", fontSize: 12, fontWeight: "900" },
  modalLoading: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  modalList: { flexGrow: 0 },
  studentRow: { padding: 12, marginBottom: 8, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  studentActions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  eventButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  eventButtonActive: { borderColor: "#344976", backgroundColor: "#344976" },
  eventButtonText: { fontSize: 10, fontWeight: "900", color: "#475569" },
  eventButtonTextActive: { color: "#FFFFFF" },
  summonsButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "#344976" },
  summonsText: { color: "#344976", fontSize: 10, fontWeight: "900" },
  summonsForm: { flexGrow: 0 },
  formLabel: { marginBottom: 6, fontSize: 11, fontWeight: "900", color: "#475569" },
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 13 },
  reasonChip: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  reasonChipActive: { borderColor: "#344976", backgroundColor: "#344976" },
  reasonChipText: { fontSize: 10, fontWeight: "800", color: "#475569" },
  reasonChipTextActive: { color: "#FFFFFF" },
  messageInput: { minHeight: 115, marginBottom: 13, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", color: "#111827", fontSize: 13 },
  formError: { marginBottom: 10, color: "#B91C1C", fontSize: 11, fontWeight: "700" },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingTop: 4, paddingBottom: 10 },
  cancelButton: { minWidth: 90, alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  cancelButtonText: { color: "#475569", fontSize: 12, fontWeight: "900" },
  confirmButton: { minWidth: 110, alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#344976" },
  confirmButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
});
