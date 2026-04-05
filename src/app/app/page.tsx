import ReplyGenerator from "@/components/ReplyGenerator";

export default function AppPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">ReplyAI</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Paste a customer complaint. Get 3 professional replies in seconds.
          </p>
        </div>
        <ReplyGenerator />
      </div>
    </main>
  );
}
