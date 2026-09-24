import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { ArrowUp, MessageCircleQuestionMark, Square } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderLayout } from "../../layouts";
import {
  requestVehicleChat,
  type VehicleChatAnswer,
  type VehicleChatHistoryMessage,
  type VehicleChatLanguage,
} from "../../services/ai/vehicleChatRepo";
import { useTheme } from "../../ui/ThemeProvider";
import type { AppTheme } from "../../ui/theme";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleChat">;

type UserMessage = {
  id: string;
  role: "user";
  text: string;
};

type AssistantMessage = {
  id: string;
  role: "assistant";
  prompt: string;
  text: string;
  status: "loading" | "complete" | "error" | "cancelled";
  answer?: VehicleChatAnswer;
};

type ChatMessage = UserMessage | AssistantMessage;

function languageFromLocale(locale: string): VehicleChatLanguage {
  return locale.toLowerCase().startsWith("pl") ? "pl" : "en";
}

function toRequestHistory(messages: ChatMessage[]): VehicleChatHistoryMessage[] {
  const eligible: VehicleChatHistoryMessage[] = [];

  for (let index = 0; index < messages.length - 1; index += 1) {
    const userMessage = messages[index];
    const assistantMessage = messages[index + 1];

    if (
      userMessage?.role !== "user" ||
      assistantMessage?.role !== "assistant" ||
      assistantMessage.status !== "complete" ||
      !assistantMessage.answer
    ) {
      continue;
    }

    eligible.push(
      { role: "user", content: userMessage.text },
      { role: "assistant", content: assistantMessage.answer.answer },
    );
    index += 1;
  }

  const history: VehicleChatHistoryMessage[] = [];
  let totalLength = 0;

  for (let index = eligible.length - 2; index >= 0; index -= 2) {
    const userMessage = eligible[index];
    const assistantMessage = eligible[index + 1];
    if (!userMessage || !assistantMessage || history.length + 2 > 8) break;

    const exchangeLength =
      userMessage.content.length + assistantMessage.content.length;
    if (totalLength + exchangeLength > 8000) break;

    history.unshift(userMessage, assistantMessage);
    totalLength += exchangeLength;
  }

  return history;
}

export function VehicleChatScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(
    null,
  );
  const activeRequest = useRef<{
    assistantId: string;
    controller: AbortController;
  } | null>(null);
  const nextMessageId = useRef(0);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const isRequestActive = activeAssistantId !== null;

  useEffect(() => {
    return () => {
      activeRequest.current?.controller.abort();
      activeRequest.current = null;
    };
  }, []);

  function createMessageId(role: ChatMessage["role"]): string {
    nextMessageId.current += 1;
    return `${role}-${nextMessageId.current}`;
  }

  async function requestAnswer(
    assistantId: string,
    prompt: string,
    history: VehicleChatHistoryMessage[],
  ) {
    const controller = new AbortController();
    activeRequest.current = { assistantId, controller };
    setActiveAssistantId(assistantId);

    try {
      const answer = await requestVehicleChat({
        message: prompt,
        language: languageFromLocale(i18n.resolvedLanguage ?? i18n.language),
        history,
        signal: controller.signal,
      });

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId && message.role === "assistant"
            ? {
                ...message,
                text: answer.answer,
                answer,
                status: "complete",
              }
            : message,
        ),
      );
    } catch {
      if (!controller.signal.aborted) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId && message.role === "assistant"
              ? { ...message, status: "error" }
              : message,
          ),
        );
      }
    } finally {
      if (activeRequest.current?.controller === controller) {
        activeRequest.current = null;
        setActiveAssistantId(null);
      }
    }
  }

  function sendPrompt(value: string) {
    const prompt = value.trim();
    if (!prompt || activeRequest.current) return;

    const userMessage: UserMessage = {
      id: createMessageId("user"),
      role: "user",
      text: prompt,
    };
    const assistantMessage: AssistantMessage = {
      id: createMessageId("assistant"),
      role: "assistant",
      prompt,
      text: "",
      status: "loading",
    };

    setInput("");
    setShowSuggestions(false);
    setMessages((current) => [...current, userMessage, assistantMessage]);
    void requestAnswer(
      assistantMessage.id,
      prompt,
      toRequestHistory(messages),
    );
  }

  function sendMessage() {
    sendPrompt(input);
  }

  function cancelRequest() {
    const request = activeRequest.current;
    if (!request) return;

    request.controller.abort();
    activeRequest.current = null;
    setActiveAssistantId(null);
    setMessages((current) =>
      current.map((message) =>
        message.id === request.assistantId && message.role === "assistant"
          ? { ...message, status: "cancelled" }
          : message,
      ),
    );
  }

  function retryMessage(message: AssistantMessage) {
    if (activeRequest.current) return;

    const messageIndex = messages.findIndex((item) => item.id === message.id);
    const messagesBeforePrompt = messages.slice(0, Math.max(0, messageIndex));

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id && item.role === "assistant"
          ? {
              ...item,
              text: "",
              answer: undefined,
              status: "loading",
            }
          : item,
      ),
    );
    void requestAnswer(
      message.id,
      message.prompt,
      toRequestHistory(messagesBeforePrompt),
    );
  }

  const composer = (
    <View style={styles.composer}>
      <TextInput
        accessibilityLabel={t("vehicleChat.inputLabel")}
        editable={!isRequestActive}
        maxLength={2000}
        multiline
        onChangeText={setInput}
        onSubmitEditing={sendMessage}
        placeholder={t("vehicleChat.inputPlaceholder")}
        placeholderTextColor={theme.colors.muted}
        returnKeyType="send"
        style={styles.input}
        value={input}
      />
      {messages.length > 0 ? (
        <Pressable
          accessibilityLabel={
            showSuggestions
              ? t("vehicleChat.hideSuggestionsAccessibilityLabel")
              : t("vehicleChat.showSuggestionsAccessibilityLabel")
          }
          accessibilityRole="button"
          accessibilityState={{ expanded: showSuggestions }}
          hitSlop={8}
          onPress={() => setShowSuggestions((current) => !current)}
          style={({ pressed }) => [
            styles.suggestionsButton,
            showSuggestions ? styles.suggestionsButtonExpanded : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <MessageCircleQuestionMark
            color={showSuggestions ? "#000000" : theme.colors.muted}
            size={22}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel={
          isRequestActive
            ? t("vehicleChat.cancelAccessibilityLabel")
            : t("vehicleChat.sendAccessibilityLabel")
        }
        accessibilityRole="button"
        disabled={!isRequestActive && input.trim().length === 0}
        hitSlop={8}
        onPress={isRequestActive ? cancelRequest : sendMessage}
        style={({ pressed }) => [
          styles.composerButton,
          !isRequestActive && input.trim().length === 0
            ? styles.composerButtonDisabled
            : null,
          pressed ? styles.pressed : null,
        ]}
      >
        {isRequestActive ? (
          <Square color="#000000" fill="#000000" size={18} />
        ) : (
          <ArrowUp color="#000000" size={22} strokeWidth={2.5} />
        )}
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <HeaderLayout onBack={() => navigation.goBack()} footer={composer}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onRetry={retryMessage}
              retryDisabled={isRequestActive}
              styles={styles}
              theme={theme}
              t={t}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.messageList,
            {
              paddingTop:
                headerHeight + (Platform.OS === "android" ? theme.spacing.md : 0),
            },
          ]}
          ListHeaderComponent={
            <View style={styles.header}>
              <ContentHeader
                title={t("vehicleChat.title")}
                subtitle={t("vehicleChat.subtitle")}
              />
            </View>
          }
          ListEmptyComponent={
            <ChatSuggestions
              disabled={isRequestActive}
              empty
              onSelect={sendPrompt}
              styles={styles}
              t={t}
            />
          }
          ListFooterComponent={
            messages.length > 0 && showSuggestions ? (
              <ChatSuggestions
                disabled={isRequestActive}
                onSelect={sendPrompt}
                styles={styles}
                t={t}
              />
            ) : null
          }
        />
      </HeaderLayout>
    </KeyboardAvoidingView>
  );
}

type ChatSuggestionsProps = {
  disabled: boolean;
  empty?: boolean;
  onSelect: (prompt: string) => void;
  styles: ReturnType<typeof makeStyles>;
  t: ReturnType<typeof useTranslation>["t"];
};

function ChatSuggestions({
  disabled,
  empty = false,
  onSelect,
  styles,
  t,
}: ChatSuggestionsProps) {
  const prompts = [
    t("vehicleChat.suggestions.inspection"),
    t("vehicleChat.suggestions.fuelCosts"),
    t("vehicleChat.suggestions.roadTrip"),
    t("vehicleChat.suggestions.warningLight"),
    t("vehicleChat.suggestions.oilChange"),
    t("vehicleChat.suggestions.usedCar"),
  ];

  return (
    <View style={empty ? styles.emptyState : styles.suggestionsPanel}>
      <View style={styles.suggestions}>
        {prompts.map((prompt) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onSelect(prompt)}
            style={({ pressed }) => [
              styles.suggestionButton,
              disabled ? styles.composerButtonDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.suggestionText}>{prompt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  onRetry: (message: AssistantMessage) => void;
  retryDisabled: boolean;
  styles: ReturnType<typeof makeStyles>;
  theme: AppTheme;
  t: ReturnType<typeof useTranslation>["t"];
};

function MessageBubble({
  message,
  onRetry,
  retryDisabled,
  styles,
  theme,
  t,
}: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <Text style={styles.userText}>{message.text}</Text>
      </View>
    );
  }

  const showRetry =
    message.status === "error" || message.status === "cancelled";
  const statusText =
    message.status === "error"
      ? t("vehicleChat.error")
      : t("vehicleChat.cancelled");

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.bubble, styles.assistantBubble]}
    >
      {message.status === "loading" ? (
        <ActivityIndicator color={theme.colors.accent} size="small" />
      ) : null}
      {message.text.length > 0 ? (
        <Text style={styles.assistantText}>{message.text}</Text>
      ) : null}
      {showRetry ? (
        <View style={styles.errorBlock}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {statusText}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={retryDisabled}
            onPress={() => onRetry(message)}
            style={({ pressed }) => [
              styles.retryButton,
              retryDisabled ? styles.composerButtonDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.retryText}>{t("vehicleChat.retry")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    header: {
      marginBottom: theme.spacing.lg,
    },
    messageList: {
      flexGrow: 1,
      paddingBottom: theme.spacing.lg,
    },
    emptyState: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      paddingBottom: theme.spacing.xl,
    },
    suggestions: {
      alignItems: "center",
      alignSelf: "stretch",
      gap: theme.spacing.xs,
    },
    suggestionsPanel: {
      alignItems: "center",
      paddingTop: theme.spacing.sm,
    },
    suggestionButton: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      justifyContent: "center",
      maxWidth: "100%",
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    suggestionText: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      lineHeight: 19,
      textAlign: "center",
    },
    bubble: {
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.sm,
      maxWidth: "88%",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    userBubble: {
      alignSelf: "flex-end",
      backgroundColor: theme.colors.accent,
    },
    assistantBubble: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.card,
      minWidth: 48,
    },
    userText: {
      color: "#000000",
      fontSize: theme.typography.body,
      lineHeight: 23,
    },
    assistantText: {
      color: theme.colors.fg,
      fontSize: theme.typography.body,
      lineHeight: 23,
    },
    errorBlock: {
      gap: theme.spacing.sm,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.small,
      lineHeight: 19,
    },
    retryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
    },
    retryText: {
      color: theme.colors.fg,
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    composer: {
      alignItems: "flex-end",
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      color: theme.colors.fg,
      flex: 1,
      fontSize: theme.typography.body,
      lineHeight: 22,
      maxHeight: 120,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      textAlignVertical: "top",
    },
    composerButton: {
      alignItems: "center",
      backgroundColor: theme.colors.accent,
      borderRadius: 24,
      height: 48,
      justifyContent: "center",
      padding: 0,
      width: 48,
    },
    suggestionsButton: {
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: 24,
      borderWidth: 1,
      height: 48,
      justifyContent: "center",
      width: 48,
    },
    suggestionsButtonExpanded: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    composerButtonDisabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.7,
    },
  });
