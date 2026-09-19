import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import type { Conversation } from "../../features/messages/message.types";
import { getMyConversations } from "../../services/messages/message.service";
import { useAuthStore } from "../../stores/authStore";

function getOtherParticipant(
  conversation: Conversation,
  currentUserId?: string,
) {
  return conversation.participants.find(
    (participant) => participant.userId !== currentUserId,
  )?.user;
}

export default function MessagesScreen() {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getMyConversations();

        if (isMounted) {
          setConversations(response.conversations);
        }
      } catch {
        if (isMounted) {
          setErrorMessage(
            "Impossible de charger vos conversations pour le moment.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadConversations();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Messages</Text>

        <Pressable
          style={styles.newButton}
          onPress={() => router.push("/(app)/messages/new")}
          accessibilityRole="button"
          accessibilityLabel="Nouveau message"
        >
          <Text style={styles.newButtonText}>Nouveau</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator />
            <Text style={styles.stateText}>Chargement des conversations...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.stateContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>✉</Text>
            </View>

            <Text style={styles.title}>Messages</Text>

            <Text style={styles.subtitle}>
              Vous n’avez aucune conversation pour le moment.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {conversations.map((conversation) => {
              const participant = getOtherParticipant(
                conversation,
                currentUserId,
              );

              const participantName = participant
                ? `${participant.firstName} ${participant.lastName}`.trim()
                : "Conversation";

              const lastMessage = conversation.messages?.[0]?.content;

              return (
                <Pressable
                  key={conversation.id}
                  style={styles.conversationCard}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/messages/[conversationId]",
                      params: { conversationId: conversation.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir la conversation avec ${participantName}`}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {participant?.firstName?.charAt(0) ?? "?"}
                    </Text>
                  </View>

                  <View style={styles.conversationContent}>
                    <Text style={styles.participantName}>
                      {participantName}
                    </Text>

                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {lastMessage ?? "Aucun message"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  backIcon: {
    fontSize: 32,
    lineHeight: 34,
    color: "#111827",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  newButton: {
    minWidth: 82,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },

  newButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  content: {
    flex: 1,
    padding: 24,
  },

  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stateText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    color: "#6B7280",
  },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },

  icon: {
    fontSize: 30,
    color: "#374151",
  },

  title: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 15,
    color: "#6B7280",
  },

  list: {
    gap: 12,
  },

  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
  },

  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },

  participantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  lastMessage: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
});
