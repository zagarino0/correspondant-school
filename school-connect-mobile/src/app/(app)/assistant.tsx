import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { aiChatSchema } from "../../features/ai/ai.schema";
import type { AIChatMessage } from "../../features/ai/ai.types";
import { sendAIMessage } from "../../services/ai/ai.service";

const initialMessages: AIChatMessage[] = [
  {
    role: "assistant",
    content:
      "Bonjour ! Je suis l’assistant School Connect. Comment puis-je vous aider ?",
  },
];

export default function AssistantScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<AIChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (isLoading) {
      return;
    }

    const validation = aiChatSchema.safeParse({
      message: input,
      conversationId,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Message invalide.");
      return;
    }

    const userMessage: AIChatMessage = {
      role: "user",
      content: validation.data.message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await sendAIMessage(validation.data);

      setConversationId(response.conversationId);
      setMessages((current) => [...current, response.message]);
    } catch {
      setError(
        "Impossible d’envoyer votre message. Veuillez réessayer.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Assistant</Text>

        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(_, index) => `${index}`}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.role === "user"
                ? styles.userBubble
                : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.role === "user"
                  ? styles.userMessageText
                  : styles.assistantMessageText,
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          isLoading ? (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={(value) => {
            setInput(value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Écrivez votre message..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={2000}
          editable={!isLoading}
          accessibilityLabel="Message à envoyer"
        />

        <Pressable
          style={[
            styles.sendButton,
            (!input.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
        >
          <Text style={styles.sendButtonText}>›</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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

  headerSpacer: {
    width: 44,
  },

  messagesContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "flex-end",
  },

  messageBubble: {
    maxWidth: "82%",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },

  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#111827",
  },

  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  userMessageText: {
    color: "#FFFFFF",
  },

  assistantMessageText: {
    color: "#111827",
  },

  errorText: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 13,
    color: "#B91C1C",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    color: "#111827",
    fontSize: 15,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },

  sendButtonText: {
    marginTop: -2,
    fontSize: 28,
    color: "#FFFFFF",
  },
});
