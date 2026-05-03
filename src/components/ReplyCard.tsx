"use client";

import toast from "react-hot-toast";

interface Reply {
  label: string;
  tone: string;
  text: string;
}

interface ReplyCardProps {
  reply: Reply;
  onSendClick?: () => void;
  onSaveTemplate?: () => void;
  sent?: boolean;
  sending?: boolean;
}

export default function ReplyCard({ reply, onSendClick, onSaveTemplate, sent = false, sending = false }: ReplyCardProps) {
  async function handleCopy() {
    await navigator.clipboard.writeText(reply.text);
    toast.success("Reply copied!");
  }

  return (
    <div
      className={`border rounded-xl p-5 bg-white dark:bg-gray-900 shadow-sm flex flex-col gap-3 transition-all ${
        sent ? "border-green-300 bg-green-50/40 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{reply.label}</span>
        <div className="flex items-center gap-2">
          {onSaveTemplate && (
            <button
              onClick={onSaveTemplate}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
              title="Save as template"
            >
              ★ Save
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          >
            Copy
          </button>
          {onSendClick && (
            <button
              onClick={onSendClick}
              disabled={sending || sent}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                sent
                  ? "bg-green-50 text-green-600 border border-green-200 cursor-default"
                  : sending
                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-wait"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {sent ? "Sent ✓" : sending ? "Sending..." : "Send via Email ✉️"}
            </button>
          )}
        </div>
      </div>
      <p className="text-gray-800 text-sm leading-relaxed">{reply.text}</p>
    </div>
  );
}
