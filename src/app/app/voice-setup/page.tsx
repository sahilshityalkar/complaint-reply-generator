import VoiceSetupWizard from "@/components/VoiceSetupWizard";
import Link from "next/link";

export default function VoiceSetupPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Set up your brand voice</h1>
            <p className="text-sm text-gray-500 mt-1">
              This helps ReplyAI generate replies that sound like YOUR business.
            </p>
          </div>
          <Link
            href="/app"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip for now
          </Link>
        </div>
        <VoiceSetupWizard />
      </div>
    </main>
  );
}
