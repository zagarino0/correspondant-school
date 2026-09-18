import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { Message } from "../../../features/messages/message.types";
import { getConversationMessages } from "../../../services/messages/message.service";
import { useAuthStore } from "../../../stores/authStore";

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("Conversation");

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      if (!conversationId) {
        if (isMounted) {
          setErrorMessage("Conversation introuvable.");
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getConversationMessages(conversationId);

        if (!isMounted) {
          return;
        }

        setMessages(response.messages);

        const otherMessage = response.messages.find(
          (message) => message.senderId !== currentUserId,
        );

        if (otherMessage) {
          setParticipantName(
            `${otherMessage.sender.firstName} ${otherMessage.sender.lastName}`.trim(),
          );
        }
      } catch {
        if (isMounted) {
          setErrorMessage(
            "Impossible de charger cette conversation pour le moment.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUserId]);

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

        <Text style={styles.headerTitle} numberOfLines={1}>
          {participantName}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator />
          <Text style={styles.stateText}>Chargement des messages...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{errorMessage}</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyTitle}>Aucun message</Text>
          <Text style={styles.stateText}>
            Cette conversation ne contient pas encore de message.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.messageList}>
          {messages.map((message) => {
            const isOwnMessage = message.senderId === currentUserId;

            return (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  isOwnMessage
                    ? styles.ownMessage
                    : styles.otherMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isOwnMessage && styles.ownMessageText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            );
          })}
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
    flex: 1,
    marginHorizontal: 12,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  headerSpacer: {
    width: 44,
  },

  stateContainer: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  stateText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    color: "#6B7280",
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  messageList: {
    padding: 20,
    gap: 10,
  },

  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },

  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#111827",
  },

  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#111827",
  },

  ownMessageText: {
    color: "#FFFFFF",
  },
});
