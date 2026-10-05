import { useCallback, useEffect, useState } from "react";
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
import { colors } from "../../../theme";

import type { Message } from "../../../features/messages/message.types";
import {
  getConversationMessages,
  sendMessage,
} from "../../../services/messages/message.service";
import {
  createRealtimeConnection,
  type RealtimeConnection,
} from "../../../services/realtime/websocket.service";
import type { RealtimeEvent } from "../../../services/realtime/websocket.types";
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

  const loadMessages = useCallback(async () => {
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
  }, [conversationId, currentUserId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let realtime: RealtimeConnection;

    function handleRealtimeEvent(event: RealtimeEvent) {
      if (event.type === "message:new") {
        const message = event.payload;

        if (message.conversationId !== conversationId) {
          return;
        }

        setMessages((currentMessages) => {
          if (currentMessages.some((current) => current.id === message.id)) {
            return currentMessages;
          }

          return [...currentMessages, message];
        });

        if (message.senderId !== currentUserId) {
          setParticipantName(
            `${message.sender.firstName} ${message.sender.lastName}`.trim(),
          );
          realtime.markConversationRead(conversationId);
        }

        return;
      }

      if (event.type === "message:delivered") {
        if (event.payload.conversationId !== conversationId) {
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === event.payload.messageId
              ? {
                  ...message,
                  deliveredAt: event.payload.deliveredAt,
                }
              : message,
          ),
        );

        return;
      }

      if (event.type === "message:read") {
        if (event.payload.conversationId !== conversationId) {
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === event.payload.messageId
              ? {
                  ...message,
                  deliveredAt: message.deliveredAt ?? event.payload.readAt,
                  readAt: event.payload.readAt,
                }
              : message,
          ),
        );
      }
    }

    realtime = createRealtimeConnection({
      onEvent: handleRealtimeEvent,
      onConnected: () => {
        realtime.markConversationRead(conversationId);
        void loadMessages();
      },
    });

    realtime.connect();
    realtime.markConversationRead(conversationId);

    return () => {
      realtime.close();
    };
  }, [conversationId, currentUserId, loadMessages]);

  async function handleSend() {
    const trimmedContent = content.trim();

    if (!conversationId || !trimmedContent || isSending) {
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage(null);

      const response = await sendMessage(conversationId, trimmedContent);

      setMessages((currentMessages) => {
        if (currentMessages.some((message) => message.id === response.message.id)) {
          return currentMessages;
        }

        return [...currentMessages, response.message];
      });

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

                    {isOwnMessage && (
                      <Text
                        style={[
                          styles.messageStatus,
                          message.readAt
                            ? styles.messageRead
                            : styles.messageDelivered,
                        ]}
                      >
                        {message.readAt || message.deliveredAt ? "✓✓" : "✓"}
                      </Text>
                    )}
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
              placeholderTextColor="colors.textMuted"
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
                <ActivityIndicator color="colors.surface" size="small" />
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
    backgroundColor: "colors.background",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: "colors.surface",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "colors.border",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "colors.surfaceMuted",
  },

  backIcon: {
    fontSize: 32,
    lineHeight: 34,
    color: "colors.text",
  },

  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "colors.text",
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
    color: "colors.textSecondary",
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
    color: "colors.text",
  },

  errorText: {
    marginBottom: 12,
    textAlign: "center",
    fontSize: 14,
    color: "colors.danger",
  },

  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },

  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "colors.text",
  },

  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "colors.surface",
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: "colors.text",
  },

  ownMessageText: {
    color: "colors.surface",
  },

  messageStatus: {
    alignSelf: "flex-end",
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
  },

  messageDelivered: {
    color: "colors.border",
  },

  messageRead: {
    color: "#60A5FA",
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "colors.surface",
    borderTopWidth: 1,
    borderTopColor: "colors.border",
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "colors.border",
    borderRadius: 22,
    backgroundColor: "#F9FAFB",
    fontSize: 15,
    color: "colors.text",
  },

  sendButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "colors.text",
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  sendButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "colors.surface",
  },
});
