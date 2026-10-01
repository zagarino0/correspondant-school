import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { getStudents } from "../../../services/students/student.service";
import type { StudentListItem } from "../../../services/students/student.types";

import {
  getSchoolLifeAuthorizations,
  getSchoolLifeDisciplinaryActions,
  getSchoolLifeExits,
  createSchoolLifeExit,
  updateSchoolLifeExit,
  createSchoolLifeMovement,
  createSchoolLifeIncident,
  updateSchoolLifeIncident,
  getSchoolLifeIncidents,
  createSchoolLifeDisciplinaryAction,
  updateSchoolLifeDisciplinaryAction,
  getSchoolLifeMovements,
  type SchoolLifeAuthorizationItem,
  type SchoolLifeDisciplinaryItem,
  type SchoolLifeExitItem,
  type SchoolLifeIncidentItem,
  type SchoolLifeMovementItem,
} from "../../../services/surveillant/schoolLife.service";

type Tab = "overview" | "exits" | "movements" | "incidents" | "discipline" | "authorizations";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "exits", label: "Sorties" },
  { key: "movements", label: "Mouvements" },
  { key: "incidents", label: "Incidents" },
  { key: "discipline", label: "Discipline" },
  { key: "authorizations", label: "Autorisations" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function studentName(item: {
  firstName: string;
  lastName: string;
}) {
  return `${item.lastName} ${item.firstName}`;
}

export default function SurveillantSchoolLifeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [exits, setExits] = useState<SchoolLifeExitItem[]>([]);
  const [movements, setMovements] = useState<SchoolLifeMovementItem[]>([]);
  const [incidents, setIncidents] = useState<SchoolLifeIncidentItem[]>([]);
  const [discipline, setDiscipline] = useState<SchoolLifeDisciplinaryItem[]>([]);
  const [authorizations, setAuthorizations] = useState<SchoolLifeAuthorizationItem[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showDisciplineModal, setShowDisciplineModal] = useState(false);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [exitType, setExitType] = useState<"TEMPORARY" | "PERMANENT">("TEMPORARY");
  const [authorizedPersonName, setAuthorizedPersonName] = useState("");
  const [authorizedPersonPhone, setAuthorizedPersonPhone] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [savingExit, setSavingExit] = useState(false);
  const [exitActionId, setExitActionId] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [movementStudentSearch, setMovementStudentSearch] = useState("");
  const [selectedMovementStudent, setSelectedMovementStudent] = useState<StudentListItem | null>(null);
  const [movementType, setMovementType] = useState<"ENTRY" | "EXIT">("ENTRY");
  const [movementReason, setMovementReason] = useState("");
  const [savingMovement, setSavingMovement] = useState(false);
  const [incidentStudentSearch, setIncidentStudentSearch] = useState("");
  const [selectedIncidentStudent, setSelectedIncidentStudent] = useState<StudentListItem | null>(null);
  const [incidentType, setIncidentType] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [savingIncident, setSavingIncident] = useState(false);
  const [editingIncident, setEditingIncident] = useState<SchoolLifeIncidentItem | null>(null);
  const [selectedDisciplineStudent, setSelectedDisciplineStudent] = useState<StudentListItem | null>(null);
  const [disciplineType, setDisciplineType] = useState("");
  const [disciplineDescription, setDisciplineDescription] = useState("");
  const [disciplineDecisionNote, setDisciplineDecisionNote] = useState("");
  const [disciplineDueAt, setDisciplineDueAt] = useState("");
  const [disciplineStudentSearch, setDisciplineStudentSearch] = useState("");
  const [savingDiscipline, setSavingDiscipline] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState<SchoolLifeDisciplinaryItem | null>(null);
  const [disciplineIncidentId, setDisciplineIncidentId] = useState<string | null>(null);
  const [disciplineIncidentContext, setDisciplineIncidentContext] = useState<SchoolLifeIncidentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [nextExits, nextMovements, nextIncidents, nextDiscipline, nextAuthorizations] =
      await Promise.all([
        getSchoolLifeExits({ date: today() }),
        getSchoolLifeMovements({ date: today() }),
        getSchoolLifeIncidents(),
        getSchoolLifeDisciplinaryActions(),
        getSchoolLifeAuthorizations(),
      ]);

    setExits(nextExits);
    setMovements(nextMovements);
    setIncidents(nextIncidents);
    setDiscipline(nextDiscipline);
    setAuthorizations(nextAuthorizations);
  }, []);

  useEffect(() => {
    void load()
      .catch(() => setError("Impossible de charger la vie scolaire."))
      .finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      setError("Impossible de rafraîchir la vie scolaire.");
    } finally {
      setRefreshing(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      `${student.lastName} ${student.firstName} ${student.studentNumber}`.toLowerCase().includes(query),
    );
  }, [students, studentSearch]);

  const resetExitForm = () => {
    setSelectedStudent(null);
    setStudentSearch("");
    setExitType("TEMPORARY");
    setAuthorizedPersonName("");
    setAuthorizedPersonPhone("");
    setExitReason("");
  };

  const openCreateExit = () => {
    resetExitForm();
    setShowExitModal(true);
  };

  const resetMovementForm = () => {
    setSelectedMovementStudent(null);
    setMovementStudentSearch("");
    setMovementType("ENTRY");
    setMovementReason("");
  };

  const openCreateMovement = () => {
    resetMovementForm();
    setShowMovementModal(true);
  };

  const resetIncidentForm = () => {
    setSelectedIncidentStudent(null);
    setIncidentStudentSearch("");
    setIncidentType("");
    setIncidentSeverity("MEDIUM");
    setIncidentDescription("");
    setEditingIncident(null);
  };

  const openCreateIncident = () => {
    resetIncidentForm();
    setShowIncidentModal(true);
  };

  const resetDisciplineForm = () => {
    setSelectedDisciplineStudent(null);
    setDisciplineType("");
    setDisciplineDescription("");
    setDisciplineDecisionNote("");
    setDisciplineDueAt("");
    setDisciplineStudentSearch("");
    setEditingDiscipline(null);
    setDisciplineIncidentId(null);
    setDisciplineIncidentContext(null);
  };

  const openCreateDiscipline = () => {
    resetDisciplineForm();
    setShowDisciplineModal(true);
  };

  const openCreateDisciplineFromIncident = async (incident: SchoolLifeIncidentItem) => {
    resetDisciplineForm();
    setDisciplineIncidentId(incident.id);
    setDisciplineIncidentContext(incident);
    setDisciplineDescription(
      `Incident du ${dateTime(incident.occurredAt)} — ${incident.description}`,
    );
    setDisciplineDecisionNote(
      `Suivi du surveillant : incident ${incident.type}, gravité ${incident.severity}.`,
    );

    const existingStudent = students.find((student) => student.id === incident.studentId);
    if (existingStudent) {
      setSelectedDisciplineStudent(existingStudent);
    } else {
      try {
        const response = await getStudents({
          status: "ACTIVE",
          search: incident.student.studentNumber,
          page: 1,
          pageSize: 10,
        });
        const matchedStudent = response.students.find((student) => student.id === incident.studentId);
        setSelectedDisciplineStudent(matchedStudent ?? null);
      } catch {
        setSelectedDisciplineStudent(null);
      }
    }

    setShowDisciplineModal(true);
  };

  const openEditDiscipline = (item: SchoolLifeDisciplinaryItem) => {
    setEditingDiscipline(item);
    setSelectedDisciplineStudent(null);
    setDisciplineType(item.type);
    setDisciplineDescription(item.description);
    setDisciplineDecisionNote(item.decisionNote ?? "");
    setDisciplineDueAt(item.dueAt ?? "");
    setDisciplineStudentSearch("");
    setShowDisciplineModal(true);
  };

  const openEditIncident = (item: SchoolLifeIncidentItem) => {
    setEditingIncident(item);
    setSelectedIncidentStudent(null);
    setIncidentStudentSearch("");
    setIncidentType(item.type);
    setIncidentSeverity(item.severity);
    setIncidentDescription(item.description);
    setShowIncidentModal(true);
  };

  useEffect(() => {
    if (!showExitModal) return;

    const timer = setTimeout(() => {
      setLoadingStudents(true);
      void getStudents({
        status: "ACTIVE",
        search: studentSearch.trim() || undefined,
        page: 1,
        pageSize: 30,
      })
        .then((response) => setStudents(response.students))
        .catch(() => setError("Impossible de rechercher les élèves."))
        .finally(() => setLoadingStudents(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [showExitModal, studentSearch]);

  useEffect(() => {
    if (!showMovementModal) return;

    const timer = setTimeout(() => {
      setLoadingStudents(true);
      void getStudents({
        status: "ACTIVE",
        search: movementStudentSearch.trim() || undefined,
        page: 1,
        pageSize: 30,
      })
        .then((response) => setStudents(response.students))
        .catch(() => setError("Impossible de rechercher les élèves."))
        .finally(() => setLoadingStudents(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [showMovementModal, movementStudentSearch]);

  useEffect(() => {
    if (!showDisciplineModal || editingDiscipline) return;

    const timer = setTimeout(() => {
      setLoadingStudents(true);
      void getStudents({
        status: "ACTIVE",
        search: disciplineStudentSearch.trim() || undefined,
        page: 1,
        pageSize: 30,
      })
        .then((response) => setStudents(response.students))
        .catch(() => setError("Impossible de rechercher les élèves."))
        .finally(() => setLoadingStudents(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [showDisciplineModal, disciplineStudentSearch, editingDiscipline]);

  useEffect(() => {
    if (!showIncidentModal || editingIncident) return;

    const timer = setTimeout(() => {
      setLoadingStudents(true);
      void getStudents({
        status: "ACTIVE",
        search: incidentStudentSearch.trim() || undefined,
        page: 1,
        pageSize: 30,
      })
        .then((response) => setStudents(response.students))
        .catch(() => setError("Impossible de rechercher les élèves."))
        .finally(() => setLoadingStudents(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [showIncidentModal, incidentStudentSearch, editingIncident]);

  const submitExit = async () => {
    if (!selectedStudent || !authorizedPersonName.trim() || !exitReason.trim()) {
      setError("Élève, personne autorisée et motif sont obligatoires.");
      return;
    }

    setSavingExit(true);
    setError(null);
    try {
      await createSchoolLifeExit(selectedStudent.id, {
        type: exitType,
        authorizedPersonName: authorizedPersonName.trim(),
        authorizedPersonPhone: authorizedPersonPhone.trim() || null,
        reason: exitReason.trim(),
        exitAt: new Date().toISOString(),
      });
      setShowExitModal(false);
      resetExitForm();
      await load();
    } catch {
      setError("Impossible d'enregistrer la sortie.");
    } finally {
      setSavingExit(false);
    }
  };

  const submitMovement = async () => {
    if (!selectedMovementStudent || !movementReason.trim()) {
      setError("Élève et motif du mouvement sont obligatoires.");
      return;
    }

    setSavingMovement(true);
    setError(null);
    try {
      await createSchoolLifeMovement(selectedMovementStudent.id, {
        type: movementType,
        reason: movementReason.trim(),
        occurredAt: new Date().toISOString(),
      });
      setShowMovementModal(false);
      resetMovementForm();
      await load();
    } catch {
      setError("Impossible d'enregistrer le mouvement.");
    } finally {
      setSavingMovement(false);
    }
  };

  const submitDiscipline = async () => {
    if ((!editingDiscipline && !selectedDisciplineStudent) || !disciplineType.trim() || !disciplineDescription.trim()) {
      setError("Élève, type et description de la mesure sont obligatoires.");
      return;
    }

    setSavingDiscipline(true);
    setError(null);
    try {
      if (editingDiscipline) {
        await updateSchoolLifeDisciplinaryAction(editingDiscipline.studentId, editingDiscipline.id, {
          type: disciplineType.trim(),
          description: disciplineDescription.trim(),
          decisionNote: disciplineDecisionNote.trim() || null,
          actionAt: new Date().toISOString(),
          dueAt: disciplineDueAt || null,
        });
      } else {
        const studentId = disciplineIncidentContext?.studentId ?? selectedDisciplineStudent?.id;
        if (!studentId) {
          setError("L'élève concerné par la mesure est obligatoire.");
          return;
        }

        await createSchoolLifeDisciplinaryAction(studentId, {
          incidentId: disciplineIncidentId,
          type: disciplineType.trim(),
          description: disciplineDescription.trim(),
          decisionNote: disciplineDecisionNote.trim() || null,
          actionAt: new Date().toISOString(),
          dueAt: disciplineDueAt || null,
        });
      }
      setShowDisciplineModal(false);
      resetDisciplineForm();
      await load();
    } catch {
      setError("Impossible d'enregistrer la mesure disciplinaire.");
    } finally {
      setSavingDiscipline(false);
    }
  };

  const submitIncident = async () => {
    if ((!editingIncident && !selectedIncidentStudent) || !incidentType.trim() || !incidentDescription.trim()) {
      setError("Élève, type et description de l'incident sont obligatoires.");
      return;
    }

    setSavingIncident(true);
    setError(null);
    try {
      if (editingIncident) {
        await updateSchoolLifeIncident(editingIncident.studentId, editingIncident.id, {
          type: incidentType.trim(),
          severity: incidentSeverity,
          description: incidentDescription.trim(),
        });
      } else {
        await createSchoolLifeIncident(selectedIncidentStudent!.id, {
          type: incidentType.trim(),
          severity: incidentSeverity,
          description: incidentDescription.trim(),
          occurredAt: new Date().toISOString(),
        });
      }
      setShowIncidentModal(false);
      resetIncidentForm();
      await load();
    } catch {
      setError("Impossible d'enregistrer l'incident.");
    } finally {
      setSavingIncident(false);
    }
  };

  const completeExit = async (item: SchoolLifeExitItem) => {
    setExitActionId(item.id);
    setError(null);
    try {
      await updateSchoolLifeExit(item.studentId, item.id, {
        status: "COMPLETED",
        returnAt: new Date().toISOString(),
      });
      await load();
    } catch {
      setError("Impossible d'enregistrer le retour de l'élève.");
    } finally {
      setExitActionId(null);
    }
  };

  const openExits = useMemo(
    () => exits.filter((item) => item.status === "OPEN").length,
    [exits],
  );
  const pendingAuthorizations = useMemo(
    () => authorizations.filter((item) => item.status === "PENDING").length,
    [authorizations],
  );
  const activeDiscipline = useMemo(
    () => discipline.filter((item) => item.status === "ACTIVE").length,
    [discipline],
  );
  const seriousIncidents = useMemo(
    () => incidents.filter((item) => item.severity === "HIGH" || item.severity === "CRITICAL").length,
    [incidents],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#344976" />
        <Text style={styles.muted}>Chargement de la vie scolaire…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.eyebrow}>ESPACE SURVEILLANT</Text>
            <Text style={styles.title}>Vie scolaire</Text>
            <Text style={styles.subtitle}>
              Suivi opérationnel des mouvements, sorties, incidents et autorisations.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.backButton} onPress={() => router.push("/(app)")}> 
              <Text style={styles.backButtonText}>← Dashboard</Text>
            </Pressable>
            <Pressable style={styles.studentsButton} onPress={() => router.push("/(app)/students")}>
              <Text style={styles.studentsButtonText}>Élèves</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void refresh()}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.tab, tab === item.key && styles.tabActive]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === "overview" ? (
          <>
            <View style={styles.statGrid}>
              <Stat label="Sorties ouvertes" value={openExits} />
              <Stat label="Mouvements aujourd'hui" value={movements.length} />
              <Stat label="Incidents" value={incidents.length} />
              <Stat label="Incidents sérieux" value={seriousIncidents} />
              <Stat label="Discipline active" value={activeDiscipline} />
              <Stat label="Autorisations en attente" value={pendingAuthorizations} />
            </View>

            <Section title="ACCÈS OPÉRATIONNELS">
              <ActionRow title="Présences / Retards" description="Contrôler automatiquement les élèves attendus selon le créneau de l'emploi du temps." onPress={() => router.push("/(app)/surveillant/attendance")} />
              <ActionRow title="Sorties élèves" description="Suivre les élèves actuellement sortis et les retours." onPress={() => setTab("exits")} />
              <ActionRow title="Mouvements" description="Consulter les entrées et sorties enregistrées aujourd'hui." onPress={() => setTab("movements")} />
              <ActionRow title="Incidents" description="Consulter les incidents et leur niveau de gravité." onPress={() => setTab("incidents")} />
              <ActionRow title="Discipline" description="Suivre les mesures disciplinaires en cours." onPress={() => setTab("discipline")} />
              <ActionRow title="Autorisations parentales" description="Voir les demandes qui nécessitent un traitement." onPress={() => setTab("authorizations")} />
            </Section>

            <Section title="ÉLÈVES">
              <ActionRow
                title="Rechercher un élève"
                description="Accéder à la fiche vie scolaire complète d'un élève."
                onPress={() => router.push("/(app)/students")}
              />
            </Section>
          </>
        ) : null}

        {tab === "exits" ? (
          <>
            <View style={styles.exitToolbar}>
              <View style={styles.exitToolbarCopy}>
                <Text style={styles.exitToolbarTitle}>Gestion des sorties</Text>
                <Text style={styles.exitToolbarText}>Enregistrer un départ et clôturer le retour de l'élève.</Text>
              </View>
              <Pressable style={styles.primaryButton} onPress={openCreateExit}>
                <Text style={styles.primaryButtonText}>+ Nouvelle sortie</Text>
              </Pressable>
            </View>
            <Section title="SORTIES DU JOUR">
            {exits.length === 0 ? <Empty text="Aucune sortie enregistrée aujourd'hui." /> : exits.map((item) => (
              <ItemCard key={item.id}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                  <Badge text={item.status === "OPEN" ? "EN SORTIE" : item.status} />
                </View>
                <Text style={styles.itemMeta}>{item.student.studentNumber} · {item.type === "TEMPORARY" ? "Temporaire" : "Définitive"}</Text>
                <Text style={styles.itemText}>{item.reason}</Text>
                <Text style={styles.itemMeta}>Départ {dateTime(item.exitAt)} · Retour {dateTime(item.returnAt)}</Text>
                <Text style={styles.itemMeta}>Personne autorisée : {item.authorizedPersonName}{item.authorizedPersonPhone ? ` · ${item.authorizedPersonPhone}` : ""}</Text>
                {item.status === "OPEN" ? (
                  <Pressable
                    style={styles.completeButton}
                    onPress={() => void completeExit(item)}
                    disabled={exitActionId === item.id}
                  >
                    <Text style={styles.completeButtonText}>
                      {exitActionId === item.id ? "Enregistrement…" : "Enregistrer le retour"}
                    </Text>
                  </Pressable>
                ) : null}
              </ItemCard>
            ))}</Section>
          </>
        ) : null}

        {tab === "movements" ? (
          <>
            <View style={styles.exitToolbar}>
              <View style={styles.exitToolbarCopy}>
                <Text style={styles.exitToolbarTitle}>Registre des mouvements</Text>
                <Text style={styles.exitToolbarText}>Enregistrer les entrées et sorties d'élèves de l'établissement.</Text>
              </View>
              <Pressable style={styles.primaryButton} onPress={openCreateMovement}>
                <Text style={styles.primaryButtonText}>+ Nouveau mouvement</Text>
              </Pressable>
            </View>

            <Section title="MOUVEMENTS DU JOUR">
              {movements.length === 0 ? <Empty text="Aucun mouvement enregistré aujourd'hui." /> : movements.map((item) => (
                <ItemCard key={item.id}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                    <Badge text={item.type === "ENTRY" ? "ENTRÉE" : "SORTIE"} />
                  </View>
                  <Text style={styles.itemMeta}>{item.student.studentNumber} · {dateTime(item.occurredAt)}</Text>
                  <Text style={styles.itemText}>{item.reason || "Aucun motif renseigné."}</Text>
                </ItemCard>
              ))}
            </Section>
          </>
        ) : null}

        {tab === "incidents" ? (
          <>
            <View style={styles.exitToolbar}>
              <View style={styles.exitToolbarCopy}>
                <Text style={styles.exitToolbarTitle}>Registre des incidents</Text>
                <Text style={styles.exitToolbarText}>Déclarer, qualifier et mettre à jour les incidents des élèves.</Text>
              </View>
              <Pressable style={styles.primaryButton} onPress={openCreateIncident}>
                <Text style={styles.primaryButtonText}>+ Nouvel incident</Text>
              </Pressable>
            </View>

            <Section title="INCIDENTS">
              {incidents.length === 0 ? <Empty text="Aucun incident enregistré." /> : incidents.slice(0, 50).map((item) => (
                <ItemCard key={item.id}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                    <Badge text={item.severity} />
                  </View>
                  <Text style={styles.itemMeta}>{item.type} · {dateTime(item.occurredAt)}</Text>
                  <Text style={styles.itemText}>{item.description}</Text>
                  <View style={styles.incidentActions}>
                    <Pressable style={styles.completeButton} onPress={() => openEditIncident(item)}>
                      <Text style={styles.completeButtonText}>Modifier / suivre</Text>
                    </Pressable>
                    {discipline.some((action) => action.incidentId === item.id) ? (
                      <View style={styles.linkedDisciplineBadge}>
                        <Text style={styles.linkedDisciplineText}>Mesure disciplinaire créée</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.disciplineActionButton}
                        onPress={() => void openCreateDisciplineFromIncident(item)}
                      >
                        <Text style={styles.disciplineActionButtonText}>Créer une mesure disciplinaire</Text>
                      </Pressable>
                    )}
                  </View>
                </ItemCard>
              ))}
            </Section>
          </>
        ) : null}

        {tab === "discipline" ? (
          <>
          <View style={styles.exitToolbar}>
            <View style={styles.exitToolbarCopy}>
              <Text style={styles.exitToolbarTitle}>Suivi disciplinaire</Text>
              <Text style={styles.exitToolbarText}>Le surveillant propose et suit une mesure. La validation définitive appartient au School Admin.</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={openCreateDiscipline}>
              <Text style={styles.primaryButtonText}>+ Nouvelle mesure</Text>
            </Pressable>
          </View>
          <Section title="MESURES DISCIPLINAIRES">
            {discipline.length === 0 ? <Empty text="Aucune mesure disciplinaire enregistrée." /> : discipline.slice(0, 50).map((item) => (
              <ItemCard key={item.id}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                  <Badge text={item.approvalStatus === "PENDING" ? "À VALIDER" : item.approvalStatus} />
                </View>
                <Text style={styles.itemMeta}>{item.type} · {dateTime(item.actionAt)}</Text>
                <Text style={styles.itemText}>{item.description}</Text>
                <Text style={styles.itemMeta}>Statut : {item.status} · Validation : {item.approvalStatus}</Text>
                <Pressable
                  style={styles.completeButton}
                  onPress={() => openEditDiscipline(item)}
                  disabled={item.approvalStatus === "APPROVED"}
                >
                  <Text style={styles.completeButtonText}>
                    {item.approvalStatus === "APPROVED" ? "Mesure validée" : "Modifier / suivre"}
                  </Text>
                </Pressable>
              </ItemCard>
            ))}</Section>
          </>
        ) : null}

        {tab === "authorizations" ? (
          <Section title="AUTORISATIONS PARENTALES">
            {authorizations.length === 0 ? <Empty text="Aucune autorisation enregistrée." /> : authorizations.slice(0, 50).map((item) => (
              <ItemCard key={item.id}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                  <Badge text={item.status} />
                </View>
                <Text style={styles.itemMeta}>{item.type} · demandée {dateTime(item.requestedAt)}</Text>
                <Text style={styles.itemText}>{item.reason || "Aucun motif renseigné."}</Text>
              </ItemCard>
            ))}</Section>
        ) : null}
      </ScrollView>
            <Modal
        visible={showExitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>NOUVELLE SORTIE</Text>
                <Text style={styles.modalTitle}>Enregistrer un départ</Text>
              </View>
              <Pressable onPress={() => setShowExitModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>ÉLÈVE</Text>
              {selectedStudent ? (
                <View style={styles.selectedStudent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>{studentName(selectedStudent)}</Text>
                    <Text style={styles.selectedStudentMeta}>
                      {selectedStudent.studentNumber} · {selectedStudent.enrollments[0]?.class.name ?? "Sans classe"}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelectedStudent(null)}>
                    <Text style={styles.changeText}>Changer</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    value={studentSearch}
                    onChangeText={setStudentSearch}
                    placeholder="Rechercher un élève ou matricule…"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                  {loadingStudents ? (
                    <ActivityIndicator style={styles.studentsLoader} />
                  ) : (
                    <View style={styles.studentPicker}>
                      {filteredStudents.slice(0, 12).map((student) => (
                        <Pressable
                          key={student.id}
                          style={styles.studentOption}
                          onPress={() => setSelectedStudent(student)}
                        >
                          <Text style={styles.studentOptionName}>{studentName(student)}</Text>
                          <Text style={styles.studentOptionMeta}>
                            {student.studentNumber} · {student.enrollments[0]?.class.name ?? "Sans classe"}
                          </Text>
                        </Pressable>
                      ))}
                      {filteredStudents.length === 0 ? <Text style={styles.emptyPicker}>Aucun élève trouvé.</Text> : null}
                    </View>
                  )}
                </>
              )}

              <Text style={styles.formLabel}>TYPE DE SORTIE</Text>
              <View style={styles.typeRow}>
                {(["TEMPORARY", "PERMANENT"] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.typeButton, exitType === type && styles.typeButtonActive]}
                    onPress={() => setExitType(type)}
                  >
                    <Text style={[styles.typeButtonText, exitType === type && styles.typeButtonTextActive]}>
                      {type === "TEMPORARY" ? "Temporaire" : "Définitive"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>PERSONNE AUTORISÉE</Text>
              <TextInput
                value={authorizedPersonName}
                onChangeText={setAuthorizedPersonName}
                placeholder="Nom et prénom"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.formLabel}>TÉLÉPHONE</Text>
              <TextInput
                value={authorizedPersonPhone}
                onChangeText={setAuthorizedPersonPhone}
                placeholder="Numéro de téléphone (optionnel)"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text style={styles.formLabel}>MOTIF</Text>
              <TextInput
                value={exitReason}
                onChangeText={setExitReason}
                placeholder="Motif de la sortie"
                placeholderTextColor="#94A3B8"
                multiline
                style={[styles.input, styles.textarea]}
              />

              <Pressable
                style={[styles.submitButton, savingExit && styles.buttonDisabled]}
                onPress={() => void submitExit()}
                disabled={savingExit}
              >
                <Text style={styles.submitButtonText}>
                  {savingExit ? "Enregistrement…" : "Enregistrer la sortie"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showIncidentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIncidentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>{editingIncident ? "SUIVI INCIDENT" : "NOUVEL INCIDENT"}</Text>
                <Text style={styles.modalTitle}>{editingIncident ? "Mettre à jour l'incident" : "Déclarer un incident"}</Text>
              </View>
              <Pressable onPress={() => setShowIncidentModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>ÉLÈVE</Text>
              {editingIncident ? (
                <View style={styles.selectedStudent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>{studentName(editingIncident.student)}</Text>
                    <Text style={styles.selectedStudentMeta}>{editingIncident.student.studentNumber}</Text>
                  </View>
                </View>
              ) : selectedIncidentStudent ? (
                <View style={styles.selectedStudent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>{studentName(selectedIncidentStudent)}</Text>
                    <Text style={styles.selectedStudentMeta}>
                      {selectedIncidentStudent.studentNumber} · {selectedIncidentStudent.enrollments[0]?.class.name ?? "Sans classe"}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelectedIncidentStudent(null)}>
                    <Text style={styles.changeText}>Changer</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    value={incidentStudentSearch}
                    onChangeText={setIncidentStudentSearch}
                    placeholder="Rechercher un élève ou matricule…"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                  {loadingStudents ? (
                    <ActivityIndicator style={styles.studentsLoader} />
                  ) : (
                    <View style={styles.studentPicker}>
                      {students.map((student) => (
                        <Pressable key={student.id} style={styles.studentOption} onPress={() => setSelectedIncidentStudent(student)}>
                          <Text style={styles.studentOptionName}>{studentName(student)}</Text>
                          <Text style={styles.studentOptionMeta}>
                            {student.studentNumber} · {student.enrollments[0]?.class.name ?? "Sans classe"}
                          </Text>
                        </Pressable>
                      ))}
                      {students.length === 0 ? <Text style={styles.emptyPicker}>Aucun élève trouvé.</Text> : null}
                    </View>
                  )}
                </>
              )}

              <Text style={styles.formLabel}>TYPE D'INCIDENT</Text>
              <TextInput
                value={incidentType}
                onChangeText={setIncidentType}
                placeholder="Ex. altercation, retard, comportement…"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.formLabel}>GRAVITÉ</Text>
              <View style={styles.typeRow}>
                {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((severity) => (
                  <Pressable
                    key={severity}
                    style={[styles.typeButton, incidentSeverity === severity && styles.typeButtonActive]}
                    onPress={() => setIncidentSeverity(severity)}
                  >
                    <Text style={[styles.typeButtonText, incidentSeverity === severity && styles.typeButtonTextActive]}>
                      {severity === "LOW" ? "Faible" : severity === "MEDIUM" ? "Moyenne" : severity === "HIGH" ? "Haute" : "Critique"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>DESCRIPTION</Text>
              <TextInput
                value={incidentDescription}
                onChangeText={setIncidentDescription}
                placeholder="Décrire précisément les faits constatés…"
                placeholderTextColor="#94A3B8"
                multiline
                style={[styles.input, styles.textarea]}
              />

              <Pressable
                style={[styles.submitButton, savingIncident && styles.buttonDisabled]}
                onPress={() => void submitIncident()}
                disabled={savingIncident}
              >
                <Text style={styles.submitButtonText}>
                  {savingIncident ? "Enregistrement…" : editingIncident ? "Enregistrer le suivi" : "Enregistrer l'incident"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDisciplineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDisciplineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>{editingDiscipline ? "SUIVI DISCIPLINAIRE" : "NOUVELLE MESURE"}</Text>
                <Text style={styles.modalTitle}>{editingDiscipline ? "Modifier la mesure" : "Créer une mesure"}</Text>
              </View>
              <Pressable onPress={() => setShowDisciplineModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {disciplineIncidentContext ? (
                <View style={styles.incidentContextCard}>
                  <Text style={styles.incidentContextEyebrow}>MESURE LIÉE À L'INCIDENT</Text>
                  <Text style={styles.incidentContextTitle}>
                    {disciplineIncidentContext.type} · {disciplineIncidentContext.severity}
                  </Text>
                  <Text style={styles.incidentContextText}>
                    {studentName(disciplineIncidentContext.student)} · {dateTime(disciplineIncidentContext.occurredAt)}
                  </Text>
                  <Text style={styles.incidentContextText}>{disciplineIncidentContext.description}</Text>
                </View>
              ) : null}

              <Text style={styles.formLabel}>ÉLÈVE</Text>
              {editingDiscipline ? (
                <View style={styles.selectedStudent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>{studentName(editingDiscipline.student)}</Text>
                    <Text style={styles.selectedStudentMeta}>{editingDiscipline.student.studentNumber}</Text>
                  </View>
                </View>
              ) : selectedDisciplineStudent ? (
                <View style={styles.selectedStudent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>{studentName(selectedDisciplineStudent)}</Text>
                    <Text style={styles.selectedStudentMeta}>{selectedDisciplineStudent.studentNumber}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedDisciplineStudent(null)}>
                    <Text style={styles.changeText}>Changer</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    value={disciplineStudentSearch}
                    onChangeText={setDisciplineStudentSearch}
                    placeholder="Rechercher un élève ou matricule…"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                  {loadingStudents ? (
                    <ActivityIndicator style={styles.studentsLoader} />
                  ) : (
                    <View style={styles.studentPicker}>
                      {students.map((student) => (
                        <Pressable
                          key={student.id}
                          style={styles.studentOption}
                          onPress={() => setSelectedDisciplineStudent(student)}
                        >
                          <Text style={styles.studentOptionName}>{studentName(student)}</Text>
                          <Text style={styles.studentOptionMeta}>
                            {student.studentNumber} · {student.enrollments[0]?.class.name ?? "Sans classe"}
                          </Text>
                        </Pressable>
                      ))}
                      {students.length === 0 ? <Text style={styles.emptyPicker}>Aucun élève trouvé.</Text> : null}
                    </View>
                  )}
                </>
              )}

              <Text style={styles.formLabel}>TYPE DE MESURE</Text>
              <TextInput
                value={disciplineType}
                onChangeText={setDisciplineType}
                placeholder="Ex. Avertissement, retenue, convocation parent"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.formLabel}>DESCRIPTION</Text>
              <TextInput
                value={disciplineDescription}
                onChangeText={setDisciplineDescription}
                placeholder="Décrire la mesure décidée/proposée"
                placeholderTextColor="#94A3B8"
                multiline
                style={[styles.input, styles.textarea]}
              />

              <Text style={styles.formLabel}>NOTE DE DÉCISION</Text>
              <TextInput
                value={disciplineDecisionNote}
                onChangeText={setDisciplineDecisionNote}
                placeholder="Contexte ou justification"
                placeholderTextColor="#94A3B8"
                multiline
                style={[styles.input, styles.textarea]}
              />

              <Text style={styles.formLabel}>ÉCHÉANCE (OPTIONNELLE)</Text>
              <TextInput
                value={disciplineDueAt}
                onChangeText={setDisciplineDueAt}
                placeholder="ISO 8601 — ex. 2026-10-15T16:00:00.000Z"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="none"
              />

              <View style={styles.formHint}>
                <Text style={styles.formHintText}>
                  La mesure est créée en attente de validation du School Admin. Elle ne sera visible par le parent et l'élève qu'après validation.
                </Text>
              </View>

              <Pressable
                style={[styles.submitButton, savingDiscipline && styles.buttonDisabled]}
                onPress={() => void submitDiscipline()}
                disabled={savingDiscipline}
              >
                <Text style={styles.submitButtonText}>
                  {savingDiscipline ? "Enregistrement…" : "Enregistrer la mesure"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMovementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMovementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>NOUVEAU MOUVEMENT</Text>
                <Text style={styles.modalTitle}>Enregistrer un mouvement</Text>
              </View>
              <Pressable onPress={() => setShowMovementModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>ÉLÈVE</Text>
              {selectedMovementStudent ? (
                <View style={styles.selectedStudent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>{studentName(selectedMovementStudent)}</Text>
                    <Text style={styles.selectedStudentMeta}>
                      {selectedMovementStudent.studentNumber} · {selectedMovementStudent.enrollments[0]?.class.name ?? "Sans classe"}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelectedMovementStudent(null)}>
                    <Text style={styles.changeText}>Changer</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    value={movementStudentSearch}
                    onChangeText={setMovementStudentSearch}
                    placeholder="Rechercher un élève ou matricule…"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                  {loadingStudents ? (
                    <ActivityIndicator style={styles.studentsLoader} />
                  ) : (
                    <View style={styles.studentPicker}>
                      {students.map((student) => (
                        <Pressable
                          key={student.id}
                          style={styles.studentOption}
                          onPress={() => setSelectedMovementStudent(student)}
                        >
                          <Text style={styles.studentOptionName}>{studentName(student)}</Text>
                          <Text style={styles.studentOptionMeta}>
                            {student.studentNumber} · {student.enrollments[0]?.class.name ?? "Sans classe"}
                          </Text>
                        </Pressable>
                      ))}
                      {students.length === 0 ? <Text style={styles.emptyPicker}>Aucun élève trouvé.</Text> : null}
                    </View>
                  )}
                </>
              )}

              <Text style={styles.formLabel}>TYPE DE MOUVEMENT</Text>
              <View style={styles.typeRow}>
                {(["ENTRY", "EXIT"] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.typeButton, movementType === type && styles.typeButtonActive]}
                    onPress={() => setMovementType(type)}
                  >
                    <Text style={[styles.typeButtonText, movementType === type && styles.typeButtonTextActive]}>
                      {type === "ENTRY" ? "Entrée" : "Sortie"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>MOTIF</Text>
              <TextInput
                value={movementReason}
                onChangeText={setMovementReason}
                placeholder="Motif du mouvement"
                placeholderTextColor="#94A3B8"
                multiline
                style={[styles.input, styles.textarea]}
              />

              <Pressable
                style={[styles.submitButton, savingMovement && styles.buttonDisabled]}
                onPress={() => void submitMovement()}
                disabled={savingMovement}
              >
                <Text style={styles.submitButtonText}>
                  {savingMovement ? "Enregistrement…" : "Enregistrer le mouvement"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function ItemCard({ children }: { children: ReactNode }) {
  return <View style={styles.itemCard}>{children}</View>;
}

function Badge({ text }: { text: string }) {
  const isRejected = text === "REJECTED";
  const isApproved = text === "APPROVED";
  const isPending = text === "PENDING";
  const isLow = text === "LOW";
  const isMedium = text === "MEDIUM";
  const isHigh = text === "HIGH";
  const isCritical = text === "CRITICAL";

  return (
    <View
      style={[
        styles.badge,
        isRejected && styles.badgeRejected,
        isApproved && styles.badgeApproved,
        isPending && styles.badgePending,
        isLow && styles.badgeSeverityLow,
        isMedium && styles.badgeSeverityMedium,
        isHigh && styles.badgeSeverityHigh,
        isCritical && styles.badgeSeverityCritical,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          isRejected && styles.badgeRejectedText,
          isApproved && styles.badgeApprovedText,
          isPending && styles.badgePendingText,
          isLow && styles.badgeSeverityLowText,
          isMedium && styles.badgeSeverityMediumText,
          isHigh && styles.badgeSeverityHighText,
          isCritical && styles.badgeSeverityCriticalText,
        ]}
      >
        {text.replaceAll("_", " ")}
      </Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  muted: { marginTop: 10, color: "#64748B", fontSize: 12 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  headerMain: { flex: 1 },
  headerActions: { alignItems: "flex-end", gap: 7 },
  backButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  backButtonText: { color: "#344976", fontSize: 10, fontWeight: "900" },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, color: "#64748B" },
  title: { marginTop: 3, fontSize: 26, fontWeight: "900", color: "#344976" },
  subtitle: { marginTop: 5, fontSize: 12, lineHeight: 18, color: "#64748B" },
  studentsButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, backgroundColor: "#344976" },
  studentsButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  tabs: { gap: 8, paddingBottom: 14 },
  tab: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  tabActive: { backgroundColor: "#344976", borderColor: "#344976" },
  tabText: { color: "#475569", fontSize: 11, fontWeight: "800" },
  tabTextActive: { color: "#FFFFFF" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  stat: { width: "31.8%", minWidth: 105, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  statValue: { fontSize: 21, fontWeight: "900", color: "#344976" },
  statLabel: { marginTop: 4, fontSize: 9, lineHeight: 13, color: "#64748B", fontWeight: "700" },
  section: { marginTop: 14 },
  sectionTitle: { marginBottom: 8, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  card: { overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 13, fontWeight: "900", color: "#344976" },
  actionDescription: { marginTop: 3, fontSize: 10, lineHeight: 15, color: "#64748B" },
  arrow: { marginLeft: 10, fontSize: 25, color: "#94A3B8" },
  itemCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  itemTitle: { flex: 1, fontSize: 13, fontWeight: "900", color: "#344976" },
  itemMeta: { marginTop: 4, fontSize: 10, color: "#64748B" },
  itemText: { marginTop: 7, fontSize: 11, lineHeight: 16, color: "#334155" },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "#EEF2F7" },
  badgeText: { fontSize: 8, fontWeight: "900", color: "#344976" },
  badgeRejected: { backgroundColor: "#FEE2E2" },
  badgeRejectedText: { color: "#B91C1C" },
  badgeApproved: { backgroundColor: "#DCFCE7" },
  badgeApprovedText: { color: "#15803D" },
  badgePending: { backgroundColor: "#FEF3C7" },
  badgePendingText: { color: "#B45309" },
  badgeSeverityLow: { backgroundColor: "#DCFCE7" },
  badgeSeverityLowText: { color: "#15803D" },
  badgeSeverityMedium: { backgroundColor: "#FEF3C7" },
  badgeSeverityMediumText: { color: "#B45309" },
  badgeSeverityHigh: { backgroundColor: "#FFEDD5" },
  badgeSeverityHighText: { color: "#C2410C" },
  badgeSeverityCritical: { backgroundColor: "#FEE2E2" },
  badgeSeverityCriticalText: { color: "#B91C1C" },
  empty: { padding: 18, fontSize: 11, color: "#64748B" },
  exitToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 2, marginBottom: 14, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  exitToolbarCopy: { flex: 1 },
  exitToolbarTitle: { fontSize: 13, fontWeight: "900", color: "#344976" },
  exitToolbarText: { marginTop: 3, fontSize: 10, lineHeight: 15, color: "#64748B" },
  primaryButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "#344976" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  completeButton: { marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: "#EEF2F7" },
  completeButtonText: { color: "#344976", fontSize: 10, fontWeight: "900" },
  incidentActions: { marginTop: 10, gap: 8 },
  linkedDisciplineBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: "#ECFDF5" },
  linkedDisciplineText: { color: "#047857", fontSize: 10, fontWeight: "900" },
  disciplineActionButton: { alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: "#344976" },
  disciplineActionButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  incidentContextCard: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
  incidentContextEyebrow: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  incidentContextTitle: { marginTop: 4, fontSize: 12, fontWeight: "900", color: "#344976" },
  incidentContextText: { marginTop: 4, fontSize: 10, lineHeight: 15, color: "#475569" },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  modalCard: { maxHeight: "92%", padding: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: "#FFFFFF" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1, color: "#64748B" },
  modalTitle: { marginTop: 3, fontSize: 21, fontWeight: "900", color: "#344976" },
  modalClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#F1F5F9" },
  modalCloseText: { fontSize: 25, color: "#475569", lineHeight: 28 },
  formLabel: { marginTop: 14, marginBottom: 7, fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", color: "#111827", fontSize: 12 },
  textarea: { minHeight: 84, textAlignVertical: "top" },
  selectedStudent: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 11, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
  selectedStudentName: { fontSize: 12, fontWeight: "900", color: "#344976" },
  selectedStudentMeta: { marginTop: 3, fontSize: 10, color: "#64748B" },
  changeText: { fontSize: 10, fontWeight: "900", color: "#344976" },
  studentPicker: { marginTop: 7, maxHeight: 190, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  studentOption: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  studentOptionName: { fontSize: 11, fontWeight: "800", color: "#334155" },
  studentOptionMeta: { marginTop: 2, fontSize: 9, color: "#64748B" },
  emptyPicker: { padding: 12, fontSize: 10, color: "#64748B" },
  studentsLoader: { marginTop: 12 },
  formHint: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: "#F1F5F9" },
  formHintText: { fontSize: 9, lineHeight: 14, color: "#64748B" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  typeButtonActive: { borderColor: "#344976", backgroundColor: "#344976" },
  typeButtonText: { fontSize: 10, fontWeight: "800", color: "#475569" },
  typeButtonTextActive: { color: "#FFFFFF" },
  submitButton: { marginTop: 18, marginBottom: 10, paddingVertical: 13, alignItems: "center", borderRadius: 11, backgroundColor: "#344976" },
  submitButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  buttonDisabled: { opacity: 0.55 },
  errorBox: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: "#FEE2E2" },
  errorText: { fontSize: 11, color: "#991B1B", fontWeight: "700" },
  retryText: { marginTop: 7, fontSize: 11, color: "#991B1B", fontWeight: "900" },
});
