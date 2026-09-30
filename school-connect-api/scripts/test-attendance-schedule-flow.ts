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
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function login(email: string, password: string) {
  const result = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert(result.response.ok, `Login ${email} -> ${result.response.status}: ${JSON.stringify(result.body)}`);
  assert(result.body?.accessToken, `accessToken manquant pour ${email}`);
  return result.body;
}

async function main() {
  assert(hasStaffPermission("SURVEILLANT", "attendance-late.create"), "SURVEILLANT doit pouvoir créer un retard");
  assert(!hasStaffPermission("SURVEILLANT", "attendance.update"), "SURVEILLANT ne doit pas pouvoir modifier P/A");

  const date = new Date().toISOString().slice(0, 10);
  console.log(`[1/6] Login Teacher: ${TEACHER_EMAIL}`);
  const teacher = await login(TEACHER_EMAIL, TEACHER_PASSWORD);
  assert(teacher.user?.role === "TEACHER", "Le compte Teacher est invalide");
  const teacherHeaders = { authorization: `Bearer ${teacher.accessToken}` };

  console.log("[2/6] Récupération du créneau Teacher");
  const dashboard = await request(`/api/v1/teachers/me/dashboard?date=${date}`, { headers: teacherHeaders });
  assert(dashboard.response.ok, `Dashboard Teacher -> ${dashboard.response.status}: ${JSON.stringify(dashboard.body)}`);
  const schedule = dashboard.body?.today?.schedules?.[0];
  assert(schedule?.id && schedule?.classId, "Aucun créneau Teacher disponible pour le test");
  console.log(`       scheduleId=${schedule.id} classId=${schedule.classId}`);

  const details = await request(`/api/v1/teachers/me/classes/${schedule.classId}`, { headers: teacherHeaders });
  assert(details.response.ok, `Classe Teacher -> ${details.response.status}`);
  const student = details.body?.students?.[0];
  assert(student?.student?.id && student?.enrollmentId, "Aucun élève actif disponible");

  console.log("[3/6] Teacher P/A sur le scheduleId sélectionné");
  const saved = await request(`/api/v1/teachers/me/classes/${schedule.classId}/attendance`, {
    method: "POST", headers: teacherHeaders,
    body: JSON.stringify({ enrollmentId: student.enrollmentId, scheduleId: schedule.id, date, status: "PRESENT" }),
  });
  assert(saved.response.ok, `Teacher P/A -> ${saved.response.status}: ${JSON.stringify(saved.body)}`);
  assert(saved.body?.attendance?.scheduleId === schedule.id, "Attendance Teacher sans scheduleId correct");

  console.log("[4/6] Teacher ne peut pas créer LATE");
  const teacherLate = await request(`/api/v1/teachers/me/classes/${schedule.classId}/attendance`, {
    method: "POST", headers: teacherHeaders,
    body: JSON.stringify({ enrollmentId: student.enrollmentId, scheduleId: schedule.id, date, status: "LATE" }),
  });
  assert(teacherLate.response.status === 403, `Teacher LATE doit être refusé, reçu ${teacherLate.response.status}`);
  assert(teacherLate.body?.error?.code === "TEACHER_LATE_FORBIDDEN", "Code Teacher LATE incorrect");

  console.log(`[5/6] Surveillant R sur le même scheduleId: ${SURVEILLANT_EMAIL}`);
  const surveillant = await login(SURVEILLANT_EMAIL, SURVEILLANT_PASSWORD);
  assert(surveillant.user?.staffFunction === "SURVEILLANT", "Le compte Surveillant est invalide");
  const surveillantHeaders = { authorization: `Bearer ${surveillant.accessToken}` };
  const late = await request("/api/v1/surveillant/school-life/attendance/session/late", {
    method: "POST", headers: surveillantHeaders,
    body: JSON.stringify({
      scheduleId: schedule.id, date, studentId: student.student.id,
      arrivalTime: `${date}T15:52:00.000Z`, reason: "integration-test", note: "teacher-first",
    }),
  });
  assert(late.response.ok, `Surveillant R -> ${late.response.status}: ${JSON.stringify(late.body)}`);
  assert(late.body?.item?.status === "LATE", "Attendance non passé à LATE");
  assert(late.body?.item?.scheduleId === schedule.id, "Retard enregistré sur le mauvais scheduleId");

  console.log("[6/6] Contrôle d’un schedule différent");
  const otherSchedule = dashboard.body?.today?.schedules?.find((item: Json) => item.id !== schedule.id && item.classId === schedule.classId);
  if (otherSchedule?.id) {
    const wrong = await request("/api/v1/surveillant/school-life/attendance/session/late", {
      method: "POST", headers: surveillantHeaders,
      body: JSON.stringify({
        scheduleId: otherSchedule.id, date, studentId: student.student.id,
        arrivalTime: `${date}T15:53:00.000Z`, reason: "wrong-schedule", note: "must-fail",
      }),
    });
    assert(wrong.response.status === 409, `Un schedule différent doit refuser le retard, reçu ${wrong.response.status}`);
    assert(wrong.body?.error?.code === "TEACHER_ATTENDANCE_REQUIRED", "Code wrong schedule incorrect");
    console.log("       ✓ schedule différent refusé");
  } else {
    console.log("       ! Aucun deuxième schedule de la même classe: contrôle ignoré");
  }

  console.log("\n✓ Teacher P/A + Surveillant R scheduleId integration OK");
}

main().catch((error) => {
  console.error("\n✗ Teacher/Surveillant attendance integration FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});