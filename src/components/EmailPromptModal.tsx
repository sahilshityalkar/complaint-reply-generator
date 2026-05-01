"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface EmailPromptModalProps {
  onClose: () => void;
  onSend: (email: string, subject: string) => Promise<void>;
  defaultSubject?: string;
}

export default function EmailPromptModal({ onClose, onSend, defaultSubject }: EmailPromptModalProps) {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [sending, setSending] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSend = email.trim().length > 0 && subject.trim().length >= 3 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(email.trim(), subject.trim());
      toast.success("Reply sent! ✉️");
      onClose();
    } catch {
      toast.error("Failed to send. Try again.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl p-6 shadow-lg max-w-md w-full mx-4 flex flex-col gap-4">
        <h3 className="font-semibold text-gray-900">Send this reply via email</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="angrycustomer@gmail.com"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-black/10 ${
              email && !isValidEmail ? "border-red-300 bg-red-50" : "border-gray-200"
            }`}
          />
          {email && !isValidEmail && (
            <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Re: Your recent order"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-1 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Send ✉️"}
          </button>
        </div>
      </div>
    </div>
  );
}
