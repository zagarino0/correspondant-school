# Règles métier — Dashboard Secrétariat

## 1. Rôle

Le Secrétariat gère les opérations administratives courantes de l'établissement. Il agit dans le périmètre de son établissement et ne dispose d'aucun pouvoir métier réservé à l'administration, aux enseignants ou au surveillant.

Le dashboard ne crée aucune permission. Il expose uniquement les fonctionnalités correspondant aux permissions déjà calculées par le backend.

**Autorité finale : le backend** via les middlewares d'authentification et d'autorisation.

## 2. Périmètre fonctionnel

### Dossiers scolaires
- **Élèves** : rechercher, consulter et mettre à jour les informations administratives ; création autorisée.
- **Classes** : consultation de la structure et des effectifs.
- **Personnel** : consultation de l'annuaire uniquement ; pas de gestion des comptes.
- **Présences** : consultation des présences, absences et retards.
- **Emploi du temps** : consultation uniquement.

### Communication
- **Annonces** : consultation des communications diffusées par l'établissement ; aucune création/modification depuis le périmètre Secrétariat.
- **Messages** : lecture et envoi de messages dans le cadre administratif.

### Administration
- **Autorisations parentales** : consulter, créer et modifier une demande tant qu'elle est PENDING. Le Secrétariat ne décide jamais : aucune permission authorization.decide.
- **Documents** : consulter et préparer/créer des documents administratifs.
- **Rendez-vous** : consulter, créer et modifier les rendez-vous.
- **Paiements** : consulter et enregistrer les paiements autorisés. Pas de modification ni d'annulation.
- **Demandes internes** : créer, consulter et suivre les tickets ; mise à jour selon le périmètre prévu par la route.

## 3. Règles de sécurité

1. Le périmètre de données est limité au schoolId de l'utilisateur.
2. Une permission absente doit masquer la fonctionnalité dans le mobile et être refusée par l'API.
3. Le mobile ne doit jamais être considéré comme une autorité de sécurité.
4. Une autorisation parentale décidée (APPROVED ou REJECTED) ne peut plus être modifiée par le Secrétariat.
5. Le Secrétariat ne possède pas authorization.decide.
6. Le Secrétariat ne possède pas payment.update et ne peut donc pas modifier un paiement enregistré.
7. La gestion des comptes utilisateurs (user.create, user.update) reste hors du périmètre du Secrétariat.
8. Les ressources sensibles restent soumises aux contrôles de ressource et au contexte établissement.

## 4. Matrice des permissions

| Domaine | READ | CREATE | UPDATE | DECIDE |
|---|---|---|---|---|
| Élèves | oui | oui | oui | — |
| Classes | oui | non | non | — |
| Personnel | oui | non | non | — |
| Présences | oui | non | non | — |
| Emploi du temps | oui | non | non | — |
| Annonces | oui | non | non | — |
| Messages | oui | envoi | — | — |
| Documents | oui | oui | — | — |
| Rendez-vous | oui | oui | oui | — |
| Autorisations | oui | oui | oui, si PENDING | **non** |
| Paiements | oui | oui | **non** | — |
| Demandes internes | oui | oui | oui | — |
| Comptes utilisateurs | **oui annuaire** | **non** | **non** | — |

## 5. Règle d'affichage du dashboard

Une carte est visible uniquement si l'utilisateur possède la permission correspondante.

Une section vide est masquée.

Le dashboard ne doit pas afficher une action que l'utilisateur ne peut pas exécuter.

Cette règle doit rester alignée avec staffPermissions.SECRETARIAT côté API.

## 6. Règle d'évolution

Toute nouvelle fonctionnalité du Secrétariat doit être ajoutée dans cet ordre :

1. définir la règle métier ;
2. définir la permission minimale ;
3. appliquer l'autorisation backend ;
4. appliquer le filtrage du dashboard ;
5. appliquer le contrôle dans l'écran mobile ;
6. ajouter les tests d'autorisation.