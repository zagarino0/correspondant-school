import { getAccessToken } from "../storage/secureStorage";
import type {
  RealtimeEvent,
  RealtimeEventHandler,
} from "./websocket.types";

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];

function getWebSocketUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }

  const websocketBaseUrl = apiUrl
    .replace(/^https:/i, "wss:")
    .replace(/^http:/i, "ws:")
    .replace(/\/+$/, "");

  return `${websocketBaseUrl}/ws`;
}

export type RealtimeConnection = {
  connect: () => void;
  close: () => void;
  markConversationRead: (conversationId: string) => void;
};

export function createRealtimeConnection(
  onEvent: RealtimeEventHandler,
): RealtimeConnection {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let isClosed = false;
  let isConnecting = false;

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (isClosed || reconnectTimer !== null) {
      return;
    }

    const delay =
      RECONNECT_DELAYS_MS[
        Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)
      ];

    reconnectAttempt += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  }

  async function connect() {
    if (isClosed || isConnecting || socket?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnecting = true;

    try {
      const accessToken = await getAccessToken();

      if (!accessToken || isClosed) {
        return;
      }

      const url = `${getWebSocketUrl()}?accessToken=${encodeURIComponent(
        accessToken,
      )}`;

      const nextSocket = new WebSocket(url);
      socket = nextSocket;

      nextSocket.onopen = () => {
        isConnecting = false;
        reconnectAttempt = 0;
      };

      nextSocket.onmessage = (event) => {
        try {
          const parsed: unknown = JSON.parse(String(event.data));

          if (
            typeof parsed !== "object" ||
            parsed === null ||
            typeof (parsed as { type?: unknown }).type !== "string" ||
            !("payload" in parsed)
          ) {
            return;
          }

          onEvent(parsed as RealtimeEvent);
        } catch {
          // Ignore malformed realtime events.
        }
      };

      nextSocket.onerror = () => {
        // onclose performs the reconnect.
      };

      nextSocket.onclose = () => {
        isConnecting = false;

        if (socket === nextSocket) {
          socket = null;
        }

        scheduleReconnect();
      };
    } catch {
      isConnecting = false;
      scheduleReconnect();
    }
  }

  function close() {
    isClosed = true;
    clearReconnectTimer();
    reconnectAttempt = 0;
    isConnecting = false;

    const currentSocket = socket;
    socket = null;

    if (currentSocket) {
      currentSocket.close(1000, "Client closed connection");
    }
  }

  function markConversationRead(conversationId: string) {
    if (
      !conversationId ||
      !socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "conversation:read",
        conversationId,
      }),
    );
  }

  return {
    connect: () => {
      isClosed = false;
      void connect();
    },
    close,
    markConversationRead,
  };
}
