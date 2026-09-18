import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { Message } from "../../../features/messages/message.types";
import {
  getConversationMessages,
  sendMessage,
} from "../../../services/messages/message.service";
import { useAuthStore } from "../../../stores/authStore";

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("Conversation");

  async function loadMessages() {
    if (!conversationId) {
      setErrorMessage("Conversation introuvable.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await getConversationMessages(conversationId);
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
      setErrorMessage(
        "Impossible de charger cette conversation pour le moment.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
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

    void load();

    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUserId]);

  async function handleSend() {
    const trimmedContent = content.trim();

    if (!conversationId || !trimmedContent || isSending) {
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage(null);

      const response = await sendMessage(conversationId, trimmedContent);

      setMessages((currentMessages) => [...currentMessages, response.message]);
      setContent("");
    } catch {
      setErrorMessage("Impossible d’envoyer le message.");
    } finally {
      setIsSending(false);
    }
  }

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
      ) : (
        <>
          <ScrollView
            style={styles.messageScroll}
            contentContainerStyle={
              messages.length > 0
                ? styles.messageList
                : styles.emptyMessageList
            }
          >
            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Aucun message</Text>
                <Text style={styles.stateText}>
                  Commencez la conversation en envoyant un message.
                </Text>
              </View>
            ) : (
              messages.map((message) => {
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
              })
            )}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={content}
              onChangeText={setContent}
              placeholder="Écrire un message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={5000}
              editable={!isSending}
              accessibilityLabel="Message"
            />

            <Pressable
              style={[
                styles.sendButton,
                (!content.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={() => void handleSend()}
              disabled={!content.trim() || isSending}
              accessibilityRole="button"
              accessibilityLabel="Envoyer le message"
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Envoyer</Text>
              )}
            </Pressable>
          </View>
        </>
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

  messageScroll: {
    flex: 1,
  },

  messageList: {
    padding: 20,
    gap: 10,
  },

  emptyMessageList: {
    flexGrow: 1,
    padding: 20,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  errorText: {
    marginBottom: 12,
    textAlign: "center",
    fontSize: 14,
    color: "#B91C1C",
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

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 22,
    backgroundColor: "#F9FAFB",
    fontSize: 15,
    color: "#111827",
  },

  sendButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  sendButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
