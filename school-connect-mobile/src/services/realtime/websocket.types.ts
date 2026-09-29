import type { Message } from "../../features/messages/message.types";

export type RealtimeEvent =
  | {
      type: "message:new";
      payload: Message;
    }
  | {
      type: "message:delivered";
      payload: {
        messageId: string;
        conversationId: string;
        deliveredAt: string;
      };
    }
  | {
      type: "message:read";
      payload: {
        messageId: string;
        conversationId: string;
        readAt: string;
      };
    }
  | {
      type: "attendance:event";
      payload: {
        event: {
          id: string;
          attendanceId: string;
          studentId: string;
          type: "LATE_AUTHORIZED" | "LATE_NOT_AUTHORIZED" | "ABSENCE_JUSTIFIED" | "ABSENCE_UNJUSTIFIED";
          note: string | null;
          createdBy: string;
          createdAt: string;
        };
        attendance: {
          id: string;
          studentId: string;
          status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
          arrivalTime: string | null;
          reason: string | null;
          note: string | null;
        };
      };
    }
  | {
      type: "parent:summons:new";
      payload: {
        id: string;
        studentId: string;
        parentId?: string;
        reason: string;
        message: string;
        status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
        scheduledAt?: string | null;
        createdAt: string;
      };
    } 
  | {
      type: "parent:summons:updated";
      payload: {
        id: string;
        studentId: string;
        student: { firstName: string; lastName: string };
        reason: string;
        message: string;
        status: "ACCEPTED" | "DECLINED" | "COMPLETED";
        scheduledAt?: string | null;
        createdAt: string;
        updatedAt: string;
      };
    }
  | {
      type: "error";
      payload: {
        code: string;
      };
    };

export type RealtimeEventHandler = (event: RealtimeEvent) => void;
