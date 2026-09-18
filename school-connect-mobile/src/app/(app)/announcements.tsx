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

import type { StudentAnnouncement } from "../../features/announcements/announcement.types";
import { getMyAnnouncements } from "../../features/announcements/announcement.service";

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
}: {
  announcement: StudentAnnouncement;
}) {
  return (
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
  );
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);
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

    return () => {
      isMounted = false;
    };
  }, []);

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
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
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
  classes: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },
  stateContainer: {
    flex: 1,
    padding: 24,
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
