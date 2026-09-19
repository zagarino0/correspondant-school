import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { getTeacherDashboard } from "../../../services/teacher/teacher.service";
import { getTeacherAttendance, getTeacherClass, saveTeacherAttendance } from "../../../services/teacher/teacher-class.service";
import type { TeacherAttendanceRow } from "../../../features/dashboard/teacher-classes.types";
import type { TeacherDashboardResponse } from "../../../features/dashboard/teacher-dashboard.types";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

function getLocalDateKey(): string {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export default function TeacherAttendanceScreen() {
  const [date, setDate] = useState(getLocalDateKey);
  const [dashboard, setDashboard] = useState<TeacherDashboardResponse | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [students, setStudents] = useState<TeacherAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [savingEnrollmentId, setSavingEnrollmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schedules = dashboard?.today.schedules ?? [];

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId],
  );

  const selectedClass = useMemo(
    () => dashboard?.classes.find((schoolClass) => schoolClass.id === selectedSchedule?.classId) ?? null,
    [dashboard, selectedSchedule],
  );

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTeacherDashboard(date);
      setDashboard(response);
      setSelectedScheduleId((current) =>
        current && response.today.schedules.some((item) => item.id === current)
          ? current
          : response.today.schedules[0]?.id ?? null,
      );
    } catch {
      setDashboard(null);
      setSelectedScheduleId(null);
      setStudents([]);
      setError("Impossible de charger l'emploi du temps du jour.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadStudents = useCallback(async () => {
    if (!selectedSchedule?.classId) {
      setStudents([]);
      return;
    }

    try {
      setStudentsLoading(true);
      setError(null);
      const [details, attendance] = await Promise.all([
        getTeacherClass(selectedSchedule.classId),
        getTeacherAttendance(selectedSchedule.classId, date),
      ]);
      const attendanceByEnrollment = new Map(attendance.students.map((row) => [row.enrollmentId, row]));
      setStudents(
        details.students.map(
          (student) =>
            attendanceByEnrollment.get(student.enrollmentId) ?? {
              enrollmentId: student.enrollmentId,
              student: student.student,
              attendance: null,
            },
        ),
      );
    } catch {
      setStudents([]);
      setError("Impossible de charger les élèves de cette classe.");
    } finally {
      setStudentsLoading(false);
    }
  }, [date, selectedSchedule]);

  useFocusEffect(useCallback(() => { void loadSchedule(); }, [loadSchedule]));
  useFocusEffect(useCallback(() => { void loadStudents(); }, [loadStudents]));

  async function handleAttendance(row: TeacherAttendanceRow, status: AttendanceStatus) {
    if (!selectedSchedule?.classId) return;

    try {
      setSavingEnrollmentId(row.enrollmentId);
      const response = await saveTeacherAttendance(selectedSchedule.classId, {
        enrollmentId: row.enrollmentId,
        date,
        status,
      });
      const saved = response.attendance;
      setStudents((current) =>
        current.map((item) =>
          item.enrollmentId === row.enrollmentId
            ? {
                ...item,
                attendance: {
                  id: saved.id,
                  date: saved.date,
                  status: saved.status,
                  arrivalTime: saved.arrivalTime ?? null,
                  reason: saved.reason ?? null,
                  note: saved.note ?? null,
                  recordedBy: saved.recordedBy,
                },
              }
            : item,
        ),
      );
    } catch {
      setError("La présence n'a pas pu être enregistrée.");
    } finally {
      setSavingEnrollmentId(null);
    }
  }


  if (loading) {
    return <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>Chargement de l'emploi du temps…</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Présences</Text>
      <Text style={styles.subtitle}>
        La classe et la matière sont déterminées automatiquement par l'emploi du temps du jour.
      </Text>

      <View style={styles.datePanel}>
        <Text style={styles.label}>Date</Text>
        <TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" style={styles.dateInput} autoCapitalize="none" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {schedules.length === 0 ? (

