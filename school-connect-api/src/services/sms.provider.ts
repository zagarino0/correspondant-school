import { env } from "../config/env.js";

export type SmsSendInput = {
  to: string;
  message: string;
};

export type SmsSendResult = {
  providerMessageId?: string;
};

export interface SmsProvider {
  readonly name: string;
  send(input: SmsSendInput): Promise<SmsSendResult>;
}

class StubSmsProvider implements SmsProvider {
  readonly name = "stub";

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    console.info(`[SMS:stub] to=${input.to} message=${input.message}`);
    return {
      providerMessageId: `stub-${Date.now()}`,
    };
  }
}

class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const apiKey = env.TWILIO_API_KEY;
    const apiSecret = env.TWILIO_API_SECRET;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const from = env.TWILIO_FROM;
    const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid) {
      throw new Error("TWILIO_ACCOUNT_SID is required.");
    }

    if (!((apiKey && apiSecret) || authToken)) {
      throw new Error(
        "Twilio credentials are incomplete. Configure API key/secret or Auth Token.",
      );
    }

    if (!from && !messagingServiceSid) {
      throw new Error(
        "Configure TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID.",
      );
    }

    const credentials = apiKey && apiSecret
      ? `${apiKey}:${apiSecret}`
      : `${accountSid}:${authToken}`;

    const body = new URLSearchParams({
      To: input.to,
      Body: input.message,
    });

    if (messagingServiceSid) {
      body.set("MessagingServiceSid", messagingServiceSid);
    } else {
      body.set("From", from!);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const raw = await response.text();

    let payload: { sid?: string; message?: string; code?: number } = {};
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      // Keep the raw response below when Twilio returns a non-JSON error.
    }

    if (!response.ok) {
      throw new Error(
        payload.message
          ? `Twilio ${payload.code ?? response.status}: ${payload.message}`
          : `Twilio HTTP ${response.status}: ${raw.slice(0, 500)}`,
      );
    }

    return payload.sid
      ? { providerMessageId: payload.sid }
      : {};
  }
}

export function createSmsProvider(): SmsProvider {
  return env.SMS_PROVIDER === "twilio"
    ? new TwilioSmsProvider()
    : new StubSmsProvider();
}
