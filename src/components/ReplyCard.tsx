"use client";

import toast from "react-hot-toast";

interface Reply {
  label: string;
  tone: string;
  text: string;
}

export default function ReplyCard({ reply }: { reply: Reply }) {
  async function handleCopy() {
    await navigator.clipboard.writeText(reply.text);
    toast.success("Reply copied!");
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{reply.label}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
        >
          Copy
        </button>
      </div>
      <p className="text-gray-800 text-sm leading-relaxed">{reply.text}</p>
    </div>
  );
}
