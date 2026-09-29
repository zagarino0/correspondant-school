import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { createRealtimeConnection } from "../../services/realtime/websocket.service";
import { getMySummons, updateSummonsStatus, type ParentSummons } from "../../services/parents/parent.service";

import type { StudentAnnouncement } from "../../features/announcements/announcement.types";
import {
  getMyAnnouncements,
  markAnnouncementAsRead,
} from "../../features/announcements/announcement.service";

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date indisponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function AnnouncementCard({
  announcement,
  onOpen,
}: {
  announcement: StudentAnnouncement;
  onOpen: (announcementId: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(announcement.id)}
      accessibilityRole="button"
      accessibilityLabel={"Ouvrir l'annonce " + announcement.title}
    >
      <View style={[styles.card, !announcement.isRead ? styles.unreadCard : null]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.title}>{announcement.title}</Text>
            <Text style={styles.date}>
              {formatDate(announcement.createdAt)}
            </Text>
          </View>

          {!announcement.isRead ? (
            <Text style={styles.unreadLabel}>Non lue</Text>
          ) : null}
        </View>

        <Text style={styles.content}>{announcement.content}</Text>

        <Text style={styles.creator}>
          Publiée par {announcement.creator.firstName}{" "}
          {announcement.creator.lastName}
        </Text>

        {announcement.classes.length > 0 ? (
          <Text style={styles.classes}>
            Classes : {announcement.classes.map((schoolClass) => schoolClass.name).join(", ")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);
  const [summons, setSummons] = useState<ParentSummons[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAnnouncements() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getMyAnnouncements();

        if (isMounted) {
          setAnnouncements(response.announcements);
        }

        try {
          const summonsResponse = await getMySummons();
          if (isMounted) {
            setSummons(summonsResponse.summons);
          }
        } catch {
          if (isMounted) {
            setSummons([]);
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Impossible de charger vos annonces.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAnnouncements();

    const connection = createRealtimeConnection({
      onEvent: (event) => {
        if (event.type === "parent:summons:new") {
          void loadAnnouncements();
        }
      },
    });

    connection.connect();

    const pollingTimer = setInterval(() => {
      void loadAnnouncements();
    }, 5000);

    return () => {
      isMounted = false;
      connection.close();
      clearInterval(pollingTimer);
    };
  }, []);

  async function handleOpenAnnouncement(announcementId: string) {
    const announcement = announcements.find(
      (item) => item.id === announcementId,
    );

    if (!announcement || announcement.isRead) {
      return;
    }

    setAnnouncements((currentAnnouncements) =>
      currentAnnouncements.map((item) =>
        item.id === announcementId
          ? {
              ...item,
              isRead: true,
              readAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    try {
      await markAnnouncementAsRead(announcementId);
    } catch {
      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.map((item) =>
          item.id === announcementId
            ? {
                ...item,
                isRead: false,
                readAt: null,
              }
            : item,
        ),
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Text style={styles.backButton}>‹</Text>
        </Pressable>

        <View>
          <Text style={styles.headerTitle}>Annonces</Text>
          <Text style={styles.subtitle}>Informations de votre établissement</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.stateText}>Chargement de vos annonces…</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : announcements.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Aucune annonce</Text>
          <Text style={styles.stateText}>
            Aucune annonce n'est actuellement disponible.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {summons.map((summon) => (
            <View key={summon.id} style={[styles.card, styles.summonsCard, summon.status === "PENDING" ? styles.unreadCard : null]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Text style={styles.title}>Convocation parentale</Text>
                  <Text style={styles.date}>
                    {summon.scheduledAt
                      ? `Rendez-vous : ${formatDate(summon.scheduledAt)} à ${new Date(summon.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                      : `Envoyée le ${formatDate(summon.createdAt)}`}
                  </Text>
                </View>
                {summon.status === "PENDING" ? (
                  <Text style={styles.unreadLabel}>À traiter</Text>
                ) : null}
              </View>
              <Text style={styles.summonsStudent}>
                {summon.student.firstName} {summon.student.lastName}
              </Text>
              <Text style={styles.summonsReason}>{summon.reason}</Text>
              <Text style={styles.content}>{summon.message}</Text>
              {summon.status === "PENDING" ? (
                <View style={styles.summonsActions}>
                  <Pressable
                    style={[styles.summonsButton, styles.declineButton]}
                    onPress={async () => {
                      try {
                        await updateSummonsStatus(summon.id, "DECLINED");
                        setSummons((current) => current.map((item) =>
                          item.id === summon.id ? { ...item, status: "DECLINED" } : item,
                        ));
                      } catch {}
                    }}
                  >
                    <Text style={styles.declineText}>Refuser</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.summonsButton, styles.acceptButton]}
                    onPress={async () => {
                      try {
                        await updateSummonsStatus(summon.id, "ACCEPTED");
                        setSummons((current) => current.map((item) =>
                          item.id === summon.id ? { ...item, status: "ACCEPTED" } : item,
                        ));
                      } catch {}
                    }}
                  >
                    <Text style={styles.acceptText}>Accepter</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.statusText}>
                  Statut : {summon.status === "ACCEPTED" ? "Acceptée" : summon.status === "DECLINED" ? "Refusée" : "Terminée"}
                </Text>
              )}
            </View>
          ))}

          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onOpen={handleOpenAnnouncement}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    fontSize: 36,
    lineHeight: 36,
    color: "#111827",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  unreadCard: {
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  date: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  unreadLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  content: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  creator: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  summonsCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#344976",
  },
  summonsStudent: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  summonsReason: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#344976",
  },
  summonsActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  summonsButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  declineButton: {
    backgroundColor: "#F3F4F6",
  },
  acceptButton: {
    backgroundColor: "#344976",
  },
  declineText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },
  acceptText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statusText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  classes: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },
  stateContainer: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#B91C1C",
    textAlign: "center",
  },
});
