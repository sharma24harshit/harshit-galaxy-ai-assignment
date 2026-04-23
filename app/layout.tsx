import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nextflow",
  description: "Krea-style workflow builder for LLM pipelines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/workflow"
      signUpFallbackRedirectUrl="/workflow"
    >
      <html
        lang="en"
        className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
      >
        <body className={`${inter.className} min-h-full flex flex-col`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
