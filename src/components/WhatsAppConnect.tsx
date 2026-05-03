"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface WhatsAppConfig {
  provider: string;
  phone_number: string;
  connected: boolean;
  connected_at?: string;
}

interface WhatsAppConnectProps {
  config: WhatsAppConfig | null;
  onConnected: (config: WhatsAppConfig) => void;
  onDisconnected: () => void;
}

export default function WhatsAppConnect({
  config,
  onConnected,
  onDisconnected,
}: WhatsAppConnectProps) {
  const [apiKey, setApiKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    const key = apiKey.trim();
    const phone = phoneNumber.trim();

    if (!key || key.length < 10) {
      toast.error("Enter a valid WATI API key");
      return;
    }
    if (!phone || phone.length < 10) {
      toast.error("Enter your WhatsApp number (with country code)");
      return;
    }

    setConnecting(true);
    try {
      // Test WATI connection
      const resp = await fetch("/api/user/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "whatsapp",
          action: "connect",
          value: {
            api_key: key,
            phone_number: phone,
          },
        }),
      });

      const data = await resp.json();
      if (data.success) {
        toast.success("WhatsApp connected!");
        onConnected({
          provider: "wati",
          phone_number: phone,
          connected: true,
          connected_at: new Date().toISOString(),
        });
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch {
      toast.error("Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      const resp = await fetch("/api/user/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "whatsapp",
          action: "disconnect",
          value: {},
        }),
      });
      const data = await resp.json();
      if (data.success) {
        toast("WhatsApp disconnected");
        onDisconnected();
        setApiKey("");
        setPhoneNumber("");
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  // Connected state
  if (config?.connected) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-500 text-sm">✓</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              WhatsApp connected
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Disconnect
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">📱</span>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {config.phone_number}
            </p>
            {config.connected_at && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Connected{" "}
                {new Date(config.connected_at).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Setup wizard
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Connect WhatsApp
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          Reply to customers on WhatsApp using YOUR phone number. You need a{" "}
          <a
            href="https://www.wati.io"
            target="_blank"
            className="underline hover:text-gray-600"
            rel="noreferrer"
          >
            WATI account
          </a>{" "}
          (₹2,499/mo, 2-min setup). Get your API key from WATI dashboard and
          paste it below.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="WATI API key"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
        />
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Phone number (+91 98765 43210)"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
        />
      </div>

      <button
        onClick={handleConnect}
        disabled={connecting}
        className="w-full py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        {connecting ? "Connecting..." : "Connect WhatsApp"}
      </button>

      <p className="text-[10px] text-gray-400 text-center">
        Don&apos;t have WATI?{" "}
        <a
          href="https://www.wati.io/pricing"
          target="_blank"
          className="underline"
          rel="noreferrer"
        >
          Sign up here
        </a>{" "}
        (free trial available)
      </p>
    </div>
  );
}
