import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 min-h-[calc(100vh-57px)]">
      {/* Left — branding panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 bg-black text-white">
        <h1 className="text-4xl font-bold leading-tight">
          Stop dreading<br />customer complaints.
        </h1>
        <p className="mt-4 text-gray-400 text-lg max-w-sm">
          Join thousands of small business owners who reply faster and stress less.
        </p>
        <ul className="mt-8 flex flex-col gap-3 text-sm text-gray-300">
          <li>✓ 3 professional replies in under 5 seconds</li>
          <li>✓ Tone control — empathetic, firm, or apologetic</li>
          <li>✓ Works for Etsy, Shopify, freelancers, and more</li>
          <li>✓ Free to start — no credit card required</li>
        </ul>
      </div>

      {/* Right — sign up form */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-sm text-gray-500 mt-1">Free to start. No credit card required.</p>
          </div>
          <SignUp
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
