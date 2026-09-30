import { hasStaffPermission } from "../src/authorization/staff-permissions.js";

const BASE_URL = process.env.TEST_API_URL ?? "http://localhost:4000";
const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL ?? "teacher@school-connect.local";
const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD ?? "Password123!";
const SURVEILLANT_EMAIL = process.env.TEST_SURVEILLANT_EMAIL ?? "staff@school-connect.local";
const SURVEILLANT_PASSWORD = process.env.TEST_SURVEILLANT_PASSWORD ?? "Password123!";

type Json = Record<string, any>;

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });

  const text = await response.text();
  let body: any = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function login(email: string, password: string) {
  const result = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  assert(
    result.response.ok,
    `Login ${email} -> ${result.response.status}: ${JSON.stringify(result.body)}`,
  );
  assert(result.body?.accessToken, `accessToken manquant pour ${email}`);

  return result.body;
}

function getSchedules(dashboard: Json): Json[] {
  return dashboard.body?.today?.schedules
    ?? dashboard.body?.schedules
    ?? [];
}

async function main() {
  // Static RBAC contract checks.
  assert(
    hasStaffPermission("SURVEILLANT", "attendance-late.create"),
    "SURVEILLANT doit pouvoir créer un retard",
  );
  assert(
    hasStaffPermission("SURVEILLANT", "attendance-late.update"),
    "SURVEILLANT doit pouvoir modifier un retard",
  );
  assert(
    !hasStaffPermission("SURVEILLANT", "attendance.create"),
    "SURVEILLANT ne doit pas pouvoir créer P/A",
  );
  assert(
    !hasStaffPermission("SURVEILLANT", "attendance.update"),
    "SURVEILLANT ne doit pas pouvoir modifier P/A",
  );

  const date = new Date().toISOString().slice(0, 10);

  console.log(`[1/6] Login Teacher: ${TEACHER_EMAIL}`);
  const teacher = await login(TEACHER_EMAIL, TEACHER_PASSWORD);
  assert(teacher.user?.role === "TEACHER", "Le compte Teacher est invalide");
  const teacherHeaders = {
    authorization: `Bearer ${teacher.accessToken}`,
  };

  console.log("[2/6] Sélection d’un créneau avec au moins un élève actif");

  // Ne pas prendre arbitrairement le premier créneau du dashboard :
  // il peut appartenir à une classe vide. On utilise d'abord /me/classes,
  // qui expose studentCount, puis on choisit un créneau du dashboard
  // appartenant à une classe ayant réellement des élèves actifs.
  const classesResult = await request("/api/v1/teachers/me/classes", {
    headers: teacherHeaders,
  });

  assert(
    classesResult.response.ok,
    `Classes Teacher -> ${classesResult.response.status}: ${JSON.stringify(classesResult.body)}`,
  );

  const teacherClasses: Json[] = classesResult.body?.classes ?? [];
  const classesWithStudents = teacherClasses.filter(
    (item) => item?.id && Number(item.studentCount ?? 0) > 0,
  );

  assert(
    classesWithStudents.length > 0,
    "Aucune classe Teacher ne possède d’élève actif.",
  );

  const dashboard = await request(
    `/api/v1/teachers/me/dashboard?date=${date}`,
    { headers: teacherHeaders },
  );

  assert(
    dashboard.response.ok,
    `Dashboard Teacher -> ${dashboard.response.status}: ${JSON.stringify(dashboard.body)}`,
  );

  const schedules = getSchedules(dashboard);
  const eligibleClassIds = new Set(
    classesWithStudents.map((item) => item.id),
  );

  const schedule = schedules.find(
    (item) =>
      item?.id &&
      item?.classId &&
      eligibleClassIds.has(item.classId),
  );

  assert(
    schedule?.id && schedule?.classId,
    "Aucun créneau Teacher du jour ne correspond à une classe avec des élèves actifs.",
  );

  console.log(
    `       scheduleId=${schedule.id} classId=${schedule.classId}`,
  );

  const details = await request(
    `/api/v1/teachers/me/classes/${schedule.classId}`,
    { headers: teacherHeaders },
  );

  assert(
    details.response.ok,
    `Classe Teacher -> ${details.response.status}: ${JSON.stringify(details.body)}`,
  );

  const students: Json[] = details.body?.students ?? [];
  // /me/classes/:classId returns the enrollment primary key as `id`.
  // Normalize it to the `enrollmentId` name used by the attendance POST body.
  const student = students
    .map((item) => ({
      ...item,
      enrollmentId: item.enrollmentId ?? item.id,
    }))
    .find((item) => item?.student?.id && item?.enrollmentId);

  assert(
    student?.student?.id && student?.enrollmentId,
    `Aucun élève actif disponible dans la classe ${schedule.classId}. Réponse: ${JSON.stringify(details.body)}`,
  );

  console.log(
    `       studentId=${student.student.id} enrollmentId=${student.enrollmentId}`,
  );

  // 3A — Teacher PRESENT.
  console.log("[3/6] Teacher P — PRESENT");
  const present = await request(
    `/api/v1/teachers/me/classes/${schedule.classId}/attendance`,
    {
      method: "POST",
      headers: teacherHeaders,
      body: JSON.stringify({
        enrollmentId: student.enrollmentId,
        scheduleId: schedule.id,
        date,
        status: "PRESENT",
      }),
    },
  );

  assert(
    present.response.ok,
    `Teacher PRESENT -> ${present.response.status}: ${JSON.stringify(present.body)}`,
  );
  assert(
    present.body?.attendance?.status === "PRESENT",
    "Le pointage Teacher PRESENT n’a pas été enregistré.",
  );
  assert(
    present.body?.attendance?.scheduleId === schedule.id,
    "Attendance PRESENT sans scheduleId correct.",
  );

  // 3B — Teacher ABSENT.
  console.log("[3/6] Teacher A — ABSENT");
  const absent = await request(
    `/api/v1/teachers/me/classes/${schedule.classId}/attendance`,
    {
      method: "POST",
      headers: teacherHeaders,
      body: JSON.stringify({
        enrollmentId: student.enrollmentId,
        scheduleId: schedule.id,
        date,
        status: "ABSENT",
      }),
    },
  );

  assert(
    absent.response.ok,
    `Teacher ABSENT -> ${absent.response.status}: ${JSON.stringify(absent.body)}`,
  );
  assert(
    absent.body?.attendance?.status === "ABSENT",
    "Le pointage Teacher ABSENT n’a pas été enregistré.",
  );
  assert(
    absent.body?.attendance?.scheduleId === schedule.id,
    "Attendance ABSENT sans scheduleId correct.",
  );

  // 4 — Teacher LATE must be rejected by the Teacher endpoint contract.
  console.log("[4/6] Teacher ne peut pas créer LATE");
  const teacherLate = await request(
    `/api/v1/teachers/me/classes/${schedule.classId}/attendance`,
    {
      method: "POST",
      headers: teacherHeaders,
      body: JSON.stringify({
        enrollmentId: student.enrollmentId,
        scheduleId: schedule.id,
        date,
        status: "LATE",
      }),
    },
  );

  assert(
    teacherLate.response.status === 400,
    `Teacher LATE doit être refusé en 400, reçu ${teacherLate.response.status}: ${JSON.stringify(teacherLate.body)}`,
  );
  assert(
    teacherLate.body?.error?.code === "INVALID_ATTENDANCE_STATUS",
    `Code Teacher LATE incorrect: ${JSON.stringify(teacherLate.body)}`,
  );

  // Login is deliberately checked separately from staffFunction because the
  // JWT/login response does not necessarily expose staffFunction. The actual
  // SURVEILLANT authorization is verified by the protected endpoint below.
  console.log(`[5/6] Surveillant R sur le même scheduleId: ${SURVEILLANT_EMAIL}`);
  const surveillant = await login(
    SURVEILLANT_EMAIL,
    SURVEILLANT_PASSWORD,
  );
  assert(
    surveillant.user?.role === "STAFF",
    "Le compte Surveillant doit utiliser le rôle STAFF.",
  );

  const surveillantHeaders = {
    authorization: `Bearer ${surveillant.accessToken}`,
  };

  const late = await request(
    "/api/v1/surveillant/school-life/attendance/session/late",
    {
      method: "POST",
      headers: surveillantHeaders,
      body: JSON.stringify({
        scheduleId: schedule.id,
        date,
        studentId: student.student.id,
        arrivalTime: `${date}T15:52:00.000Z`,
        reason: "integration-test",
        note: "teacher-first",
      }),
    },
  );

  assert(
    late.response.ok,
    `Surveillant R -> ${late.response.status}: ${JSON.stringify(late.body)}`,
  );
  assert(
    late.body?.item?.status === "LATE",
    "Attendance non passé à LATE.",
  );
  assert(
    late.body?.item?.scheduleId === schedule.id,
    "Retard enregistré sur le mauvais scheduleId.",
  );
  assert(
    late.body?.item?.studentId === student.student.id,
    "Retard enregistré pour le mauvais élève.",
  );

  // 6 — A different schedule of the same class must not reuse the teacher
  // attendance from the selected schedule.
  console.log("[6/6] Contrôle d’un schedule différent de la même classe");

  // Le dashboard Teacher ne contient que les créneaux du teacher connecté.
  // Pour tester l'isolation par schedule, on consulte donc les créneaux de
  // la même classe et du même jour, quel que soit le teacher affecté.
  const classSchedules = await request(
    `/api/v1/schedules?classId=${encodeURIComponent(schedule.classId)}`,
    { headers: teacherHeaders },
  );

  assert(
    classSchedules.response.ok,
    `Schedules de la classe -> ${classSchedules.response.status}: ${JSON.stringify(classSchedules.body)}`,
  );

  const otherSchedule = (classSchedules.body?.schedules ?? []).find(
    (item: Json) =>
      item?.id &&
      item.id !== schedule.id &&
      item.classId === schedule.classId &&
      item.dayOfWeek === schedule.dayOfWeek,
  );

  assert(
    otherSchedule?.id,
    `Impossible de tester le schedule différent : aucun deuxième créneau de la classe ${schedule.classId} le ${schedule.dayOfWeek} n'est configuré.`,
  );

  const wrong = await request(
    "/api/v1/surveillant/school-life/attendance/session/late",
    {
      method: "POST",
      headers: surveillantHeaders,
      body: JSON.stringify({
        scheduleId: otherSchedule.id,
        date,
        studentId: student.student.id,
        arrivalTime: `${date}T15:53:00.000Z`,
        reason: "wrong-schedule",
        note: "must-fail",
      }),
    },
  );

  assert(
    wrong.response.status === 409,
    `Un schedule différent doit refuser le retard en 409, reçu ${wrong.response.status}: ${JSON.stringify(wrong.body)}`,
  );
  assert(
    wrong.body?.error?.code === "TEACHER_ATTENDANCE_REQUIRED",
    `Code wrong schedule incorrect: ${JSON.stringify(wrong.body)}`,
  );

  console.log("       ✓ schedule différent refusé");

  console.log("\n✓ 6 scénarios Teacher/Surveillant attendance validés");
}

main().catch((error) => {
  console.error("\n✗ Teacher/Surveillant attendance integration FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
