/**
 * WhatsApp Business API Client (WATI)
 *
 * WATI is an Indian BSP (Business Solution Provider) for WhatsApp.
 * Each business owner connects their own WhatsApp number via WATI.
 * ReplyAI sends/receives messages through WATI's REST API.
 *
 * WATI API docs: https://docs.wati.io
 * Base URL: https://live-mt-server.wati.io/api/v1
 * Auth: Bearer {api_key}
 */

const WATI_BASE = "https://live-mt-server.wati.io/api/v1";

export interface WhatsAppConfig {
  provider: "wati";
  api_key: string;
  phone_number: string;
  connected: boolean;
  connected_at?: string;
}

export interface WhatsAppMessage {
  from: string; // customer's WhatsApp number (+919811234567)
  to: string; // business owner's WhatsApp number
  text: string;
  timestamp: string;
  messageId?: string;
  customerName?: string;
}

export interface SendWhatsAppParams {
  apiKey: string;
  businessNumber: string; // "{countryCode}{whatsappNumber}" e.g. "919876543210"
  customerNumber: string; // countryCode + mobile
  message: string;
}

/**
 * Test connection to WATI by fetching account info.
 */
export async function verifyWatiConnection(
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(`${WATI_BASE}/getAccountInfo`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { success: false, error: body.substring(0, 200) };
    }

    const data = await resp.json();
    // WATI returns account info if key is valid
    if (data?.accountInfo || data?.phoneNumber) {
      return { success: true };
    }

    return { success: false, error: "Invalid response from WATI" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

/**
 * Send a WhatsApp text message via WATI.
 *
 * WATI expects { countryCode, whatsappNumber } for the business number
 * or a single parameter { templateMessage, mobile }.
 *
 * Using the simpler sendMessage endpoint with text.
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { apiKey, businessNumber, customerNumber, message } = params;

  // WATI sendMessage API expects:
  // POST /sendMessage
  // { "whatsappNumber": "919876543210", "mobile": "919811234567", "templateMessage": null, "textMessage": { "message": "Hello" } }

  // The whatsappNumber should be just the digits (no + prefix)
  const cleanBusiness = businessNumber.replace(/^\+/, "");
  const cleanCustomer = customerNumber.replace(/^\+/, "");

  try {
    const resp = await fetch(`${WATI_BASE}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        whatsappNumber: cleanBusiness,
        mobile: cleanCustomer,
        templateMessage: null,
        textMessage: {
          message: message,
        },
        sendTo: cleanCustomer,
      }),
    });

    const body = await resp.text();
    let data: any;
    try {
      data = JSON.parse(body);
    } catch {
      data = { raw: body };
    }

    if (!resp.ok) {
      return {
        success: false,
        error: data?.message || data?.error || body || "Failed to send message",
      };
    }

    return {
      success: true,
      messageId: data?.result || data?.messageId || undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
