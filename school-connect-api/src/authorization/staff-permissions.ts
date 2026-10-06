import type { Permission } from "./permissions.js";
import type { StaffFunction } from "@prisma/client";

const staffPermissions: Record<StaffFunction, readonly Permission[]> = {
  ADMINISTRATION: [
    "student.read",
    "student.create",
    "student.update",
    "student.delete",

    "grade.read",
    "grade.create",
    "grade.update",

    "attendance.read",
    "attendance.create",
    "attendance.update",
    "attendance-late.create",
    "attendance-late.update",

    "assignment.read",
    "assignment.create",
    "assignment.update",

    "schedule.read",
    "schedule.create",
    "schedule.update",

    "message.read",
    "message.send",

    "announcement.read",
    "announcement.create",
    "announcement.update",

    "document.read",
    "document.create",

    "meeting.read",
    "meeting.create",
    "meeting.update",

    "authorization.read",
    "authorization.create",
    "authorization.update",
    "authorization.decide",

    "payment.read",
    "payment.create",
    "payment.update",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
    "school.update",

    "user.read",
    "user.create",
    "user.update",
  ],

  /*
   * SURVEILLANT
   *
   * Vie scolaire opérationnelle :
   * - consultation et recherche des élèves de son établissement
   * - présence, absences et retards
   * - sorties temporaires et définitives
   * - mouvements des élèves pendant les heures scolaires
   * - incidents et suivi disciplinaire
   * - observations de vie scolaire non pédagogiques
   * - vérification des autorisations parentales
   * - suivi des convocations et communication
   * - alertes importantes et rapport quotidien
   *
   * Les permissions sont volontairement limitées :
   * le surveillant ne gère ni les élèves, ni les classes, ni les
   * emplois du temps, ni les notes, ni les paiements, ni les dossiers
   * médicaux ou les paramètres de l'établissement.
   *
   * Les ressources de vie scolaire sont journalisées et ne disposent
   * pas de permission de suppression afin de préserver l'historique.
   */
  SURVEILLANT: [
    // Recherche / fiche vie scolaire
    "student.read",

    // Consultation du pointage du teacher + gestion des retards uniquement
    "attendance.read",
    "attendance-late.create",
    "attendance-late.update",

    "attendance-event.read",
    "attendance-event.create",

    // Sorties temporaires / définitives
    "student-exit.read",
    "student-exit.create",
    "student-exit.update",

    // Mouvements des élèves
    "student-movement.read",
    "student-movement.create",
    "student-movement.update",

    // Incidents disciplinaires / suivi disciplinaire
    "incident.read",
    "incident.create",
    "incident.update",

    "disciplinary-action.read",
    "disciplinary-action.create",
    "disciplinary-action.update",

    // Observations de vie scolaire
    "observation.read",
    "observation.create",

    // Autorisations parentales
    "authorization.read",
    "authorization.decide",

    // Convocations des parents
    "parent-summons.read",
    "parent-summons.create",

    // Emploi du temps nécessaire au contrôle de la vie scolaire
    "schedule.read",

    // Communication
    "message.read",
    "message.send",

    "announcement.read",
    "announcement.create",

    // Alertes importantes
    "alert.read",
    "alert.create",

    // Rapport quotidien de vie scolaire
    "daily-report.read",
    "daily-report.create",

    // Tickets / signalements internes
    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
  ],

  SECRETARIAT: [
    // Dossiers scolaires administratifs
    "student.read",
    "student.create",
    "student.update",

    // Structure de l'établissement et annuaire du personnel
    "school.read",
    "user.read",

    // Consultation des présences et de l'emploi du temps
    "attendance.read",
    "schedule.read",

    // Communication administrative
    "message.read",
    "message.send",
    "announcement.read",

    // Documents et rendez-vous
    "document.read",
    "document.create",
    "meeting.read",
    "meeting.create",
    "meeting.update",

    // Suivi des demandes : jamais de décision d'autorisation
    "authorization.read",
    "authorization.create",
    "authorization.update",

    // Encaissement / enregistrement des paiements
    "payment.read",
    "payment.create",

    // Demandes internes
    "ticket.read",
    "ticket.create",
    "ticket.update",

    // Annuaire du personnel : consultation uniquement.
    // La création/modification des comptes reste réservée à l'administration.
  ],

  COMPTABILITE: [
    "student.read",

    "document.read",

    "payment.read",
    "payment.create",
    "payment.update",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
  ],

  INFIRMIER: [
    "student.read",

    "document.read",

    "message.read",
    "message.send",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
  ],
};

export function hasStaffPermission(
  staffFunction: StaffFunction,
  permission: Permission
): boolean {
  return staffPermissions[staffFunction].includes(permission);
}

export function getStaffPermissions(
  staffFunction: StaffFunction
): readonly Permission[] {
  return staffPermissions[staffFunction];
}
