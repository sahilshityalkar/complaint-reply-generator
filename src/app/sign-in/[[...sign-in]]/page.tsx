import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex flex-1 min-h-[calc(100vh-57px)]">
      {/* Left — branding panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 bg-black text-white">
        <h1 className="text-4xl font-bold leading-tight">
          Turn angry customers<br />into loyal ones.
        </h1>
        <p className="mt-4 text-gray-400 text-lg max-w-sm">
          Paste a complaint. Get 3 professional replies in seconds. No thinking required.
        </p>
      </div>

      {/* Right — sign in form */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to your ReplyAI account</p>
          </div>
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0 bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
