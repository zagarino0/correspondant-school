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
      type: "parent:authorization:new";
      payload: {
        id: string;
        schoolId: string;
        studentId: string;
        parentId: string;
        type: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
        reason: string;
        requestedAt: string;
        student: {
          id: string;
          firstName: string;
          lastName: string;
          studentNumber: string;
        };
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
      type: "discipline:updated";
      payload: {
        action: {
          id: string;
          studentId: string;
          incidentId: string | null;
          type: string;
          status: "ACTIVE" | "COMPLETED" | "CANCELLED";
          approvalStatus: "APPROVED";
          description: string;
          decisionNote: string | null;
          actionAt: string;
          dueAt: string | null;
          completedAt: string | null;
          approvedAt: string | null;
        };
      };
    }
  | {
      type: "error";
      payload: {
        code: string;
      };
    };

export type RealtimeEventHandler = (event: RealtimeEvent) => void;
