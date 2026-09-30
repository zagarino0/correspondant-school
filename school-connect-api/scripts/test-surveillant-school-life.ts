const BASE_URL = process.env.TEST_API_URL ?? "http://localhost:4000";
const WS_URL = process.env.TEST_WS_URL ?? BASE_URL.replace(/^http/, "ws") + "/ws";
const EMAIL = process.env.TEST_SURVEILLANT_EMAIL ?? "staff@school-connect.local";
const PASSWORD = process.env.TEST_SURVEILLANT_PASSWORD ?? "Password123!";

type Json = Record<string, any>;

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`[1/8] Login Surveillant: ${EMAIL}`);
  const auth = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  assert(auth.accessToken, "accessToken manquant");
  assert(auth.user?.role === "STAFF", "Le compte de test n'est pas STAFF");
  assert(auth.user?.staffFunction === "SURVEILLANT", "Le compte de test n'est pas SURVEILLANT");
  assert(auth.user?.schoolId, "schoolId manquant");

  const token = auth.accessToken;
  const authHeaders = { authorization: `Bearer ${token}` };

  console.log("[2/8] Recherche de l'élève B001");
  const students = await request("/api/v1/students?search=B001&page=1&pageSize=10", {
    headers: authHeaders,
  });
  const student = students.students?.find((item: Json) => item.studentNumber === "B001") ?? students.items?.find((item: Json) => item.studentNumber === "B001");
  assert(student?.id, "Élève B001 introuvable");
  const studentId = student.id;
  console.log(`       Élève: ${student.firstName} ${student.lastName} (${studentId})`);

  const now = new Date();
  const future = new Date(now.getTime() + 60 * 60 * 1000);
  const marker = `integration-${Date.now()}`;

  console.log("[3/8] Sortie: création -> lecture -> modification");
  const exit = await request(`/api/v1/surveillant/school-life/students/${studentId}/exits`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      type: "TEMPORARY",
      authorizedPersonName: "Test Integration",
      authorizedPersonPhone: "0370000000",
      reason: marker,
      exitAt: now.toISOString(),
    }),
  });
  assert(exit.item?.id, "Sortie non créée");
  assert(exit.item.status === "OPEN", "Une sortie temporaire sans retour doit être OPEN");

  const exits = await request(`/api/v1/surveillant/school-life/exits?studentId=${studentId}`, {
    headers: authHeaders,
  });
  assert(exits.items?.some((item: Json) => item.id === exit.item.id), "Sortie absente de la lecture");

  const updatedExit = await request(`/api/v1/surveillant/school-life/students/${studentId}/exits/${exit.item.id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "COMPLETED", returnAt: future.toISOString() }),
  });
  assert(updatedExit.item.status === "COMPLETED", "Sortie non modifiée");

  console.log("[4/8] Mouvement: création -> lecture -> modification");
  const movement = await request(`/api/v1/surveillant/school-life/students/${studentId}/movements`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      type: "EXIT",
      reason: marker,
      occurredAt: now.toISOString(),
    }),
  });
  assert(movement.item?.id, "Mouvement non créé");

  const movements = await request(`/api/v1/surveillant/school-life/movements?studentId=${studentId}`, {
    headers: authHeaders,
  });
  assert(movements.items?.some((item: Json) => item.id === movement.item.id), "Mouvement absent de la lecture");

  const updatedMovement = await request(`/api/v1/surveillant/school-life/students/${studentId}/movements/${movement.item.id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ type: "ENTRY", reason: `${marker}-updated` }),
  });
  assert(updatedMovement.item.type === "ENTRY", "Mouvement non modifié");

  console.log("[5/8] Incident: création -> lecture -> modification");
  const incident = await request(`/api/v1/surveillant/school-life/students/${studentId}/incidents`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      type: "TEST_INTEGRATION",
      severity: "MEDIUM",
      description: marker,
      occurredAt: now.toISOString(),
    }),
  });
  assert(incident.item?.id, "Incident non créé");

  const incidents = await request(`/api/v1/surveillant/school-life/incidents?studentId=${studentId}`, {
    headers: authHeaders,
  });
  assert(incidents.items?.some((item: Json) => item.id === incident.item.id), "Incident absent de la lecture");

  const updatedIncident = await request(`/api/v1/surveillant/school-life/students/${studentId}/incidents/${incident.item.id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ severity: "HIGH", description: `${marker}-updated` }),
  });
  assert(updatedIncident.item.severity === "HIGH", "Incident non modifié");

  console.log("[6/8] Fiche vie scolaire complète");
  const profile = await request(`/api/v1/surveillant/school-life/students/${studentId}/life-profile`, {
    headers: authHeaders,
  });
  assert(profile.student?.id === studentId, "Fiche élève incorrecte");
  assert(Array.isArray(profile.student?.studentExits), "studentExits absent");
  assert(Array.isArray(profile.student?.studentMovements), "studentMovements absent");
  assert(Array.isArray(profile.student?.incidents), "incidents absent");
  assert(Array.isArray(profile.student?.disciplinaryActions), "disciplinaryActions absent");
  assert(Array.isArray(profile.student?.schoolLifeObservations), "schoolLifeObservations absent");
  assert(Array.isArray(profile.student?.parentAuthorizations), "parentAuthorizations absent");
  assert(Array.isArray(profile.student?.parentSummons), "parentSummons absent");

  console.log("[7/8] Alerte realtime: WebSocket -> POST alert -> réception");
  const ws = new WebSocket(`${WS_URL}?accessToken=${encodeURIComponent(token)}`);
  const realtime = await new Promise<Json>((resolve, reject) => {
    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error("Timeout WebSocket: aucune alerte reçue sous 5 secondes"));
    }, 5000);

    ws.addEventListener("open", async () => {
      try {
        const alert = await request("/api/v1/surveillant/school-life/alerts", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            recipientId: auth.user.id,
            studentId,
            severity: "IMPORTANT",
            title: "Test realtime",
            message: marker,
          }),
        });
        assert(alert.item?.id, "Alerte non créée");
      } catch (error) {
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        reject(error);
      }
    });

    ws.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(String(event.data));
        if (payload?.type !== "school-life:alert") return;
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        resolve(payload);
      } catch (error) {
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        reject(error);
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      reject(new Error("WebSocket connection error"));
    });
  });

  assert(realtime.type === "school-life:alert", "Événement realtime incorrect");
  assert(realtime.payload?.message === marker, "Payload realtime incorrect");

  console.log("[8/8] Contrôle final des alertes");
  const alerts = await request("/api/v1/surveillant/school-life/alerts", {
    headers: authHeaders,
  });
  assert(alerts.items?.some((item: Json) => item.message === marker), "Alerte absente de la lecture");

  console.log("\n✓ Surveillant school-life integration OK");
  console.log(`  Student: ${studentId}`);
  console.log(`  Exit: ${exit.item.id}`);
  console.log(`  Movement: ${movement.item.id}`);
  console.log(`  Incident: ${incident.item.id}`);
  console.log(`  Realtime: ${realtime.type}`);
}

main().catch((error) => {
  console.error("\n✗ Surveillant school-life integration FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
