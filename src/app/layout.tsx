import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReplyAI — Professional replies to customer complaints",
  description: "Paste a customer complaint and get 3 professional, ready-to-send replies in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
try {
  var t = localStorage.getItem("replyai-theme");
  if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme:dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
} catch(e) {}
              `.trim(),
            }}
          />
        </head>
        <body className="min-h-screen flex" suppressHydrationWarning>
          <Sidebar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
