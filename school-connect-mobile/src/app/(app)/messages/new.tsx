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
import { useRouter } from "expo-router";

import type { MessageRecipient } from "../../../features/messages/message.types";
import {
  createConversation,
  getMessageRecipients,
  sendMessage,
} from "../../../services/messages/message.service";

function getRecipientRoleLabel(recipient: MessageRecipient): string {
  if (recipient.role === "TEACHER") {
    return "Enseignant";
  }

  if (recipient.role === "SCHOOL_ADMIN") {
    return "Administration";
  }

  if (recipient.role === "STAFF") {
    switch (recipient.staffFunction) {
      case "SECRETARIAT":
        return "Secrétariat";
      case "SURVEILLANT":
        return "Surveillant";
      case "COMPTABILITE":
        return "Comptabilité";
      case "INFIRMIER":
        return "Infirmerie";
      case "ADMINISTRATION":
        return "Administration";
      default:
        return "Staff administratif";
    }
  }

  return "Établissement";
}

export default function NewMessageScreen() {
  const router = useRouter();

  const [recipients, setRecipients] = useState<MessageRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null,
  );
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipients() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getMessageRecipients();

        if (isMounted) {
          setRecipients(response.recipients);
        }
      } catch {
        if (isMounted) {
          setErrorMessage(
            "Impossible de charger les destinataires pour le moment.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipients();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedRecipient = recipients.find(
    (recipient) => recipient.id === selectedRecipientId,
  );

  async function handleSend() {
    const trimmedContent = content.trim();

    if (!selectedRecipientId || !trimmedContent || isSending) {
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage(null);

      const response = await createConversation(selectedRecipientId);

      const messageResponse = await sendMessage(
        response.conversation.id,
        trimmedContent,
      );

      setContent("");

      router.replace({
        pathname: "/(app)/messages/[conversationId]",
        params: {
          conversationId: response.conversation.id,
        },
      });

      void messageResponse;
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

        <Text style={styles.headerTitle}>Nouveau message</Text>

        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator />
          <Text style={styles.stateText}>Chargement des destinataires...</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>Destinataire</Text>

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            {recipients.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  Aucun destinataire disponible
                </Text>
                <Text style={styles.stateText}>
                  Aucun enseignant ou membre de l’administration ne peut être
                  contacté avec votre compte.
                </Text>
              </View>
            ) : (
              <View style={styles.recipientList}>
                {recipients.map((recipient) => {
                  const isSelected = recipient.id === selectedRecipientId;
                  const fullName =
                    `${recipient.firstName} ${recipient.lastName}`.trim();

                  return (
                    <Pressable
                      key={recipient.id}
                      style={[
                        styles.recipientCard,
                        isSelected && styles.recipientCardSelected,
                      ]}
                      onPress={() => setSelectedRecipientId(recipient.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Sélectionner ${fullName}`}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {recipient.firstName.charAt(0)}
                        </Text>
                      </View>

                      <View style={styles.recipientContent}>
                        <Text style={styles.recipientName}>{fullName}</Text>
                        <Text style={styles.recipientRole}>
                          {getRecipientRoleLabel(recipient)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radio,
                          isSelected && styles.radioSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>Message</Text>

            {selectedRecipient && (
              <Text style={styles.selectedText}>
                À : {selectedRecipient.firstName} {selectedRecipient.lastName}
              </Text>
            )}

            <TextInput
              style={styles.input}
              value={content}
              onChangeText={setContent}
              placeholder="Écrire votre message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={5000}
              editable={!isSending}
              accessibilityLabel="Nouveau message"
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.sendButton,
                (!selectedRecipientId || !content.trim() || isSending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={() => void handleSend()}
              disabled={!selectedRecipientId || !content.trim() || isSending}
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

  content: {
    flex: 1,
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 28,
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  recipientList: {
    gap: 10,
  },

  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },

  recipientCardSelected: {
    borderColor: "#111827",
    backgroundColor: "#F3F4F6",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },

  avatarText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
  },

  recipientContent: {
    flex: 1,
    marginLeft: 12,
  },

  recipientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  recipientRole: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#111827",
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#111827",
  },

  selectedText: {
    marginTop: -4,
    marginBottom: 10,
    fontSize: 13,
    color: "#6B7280",
  },

  input: {
    minHeight: 120,
    maxHeight: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
    color: "#111827",
    textAlignVertical: "top",
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  sendButton: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  sendButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  errorText: {
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#B91C1C",
  },

  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  stateText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },

  emptyContainer: {
    marginBottom: 24,
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
});
