import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// --- Global Components ---
import BottomNav from "../app/components/nav";
import GlobalSecurityGuard from "../app/components/GlobalSecurityGuard";

// --- Font Configuration ---
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- App Metadata ---
export const metadata: Metadata = {
  title: "Arday Caawiye",
  description: "The ultimate student study hub and battle arena.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500/30">
        
        {/* 1. THE SECURITY WRAPPER 
          Everything inside this tag is protected by your anti-theft, 
          anti-screenshot, and blackout protocols.
        */}
        <GlobalSecurityGuard>
          
          {/* 2. THE MAIN CONTENT AREA 
            This is where all your pages (Dashboard, Arena, Lessons) render.
            flex-1 ensures it pushes the navigation to the bottom if the page is short.
          */}
          <div className="flex-1 relative z-10 w-full">
            {children}
          </div>

          {/* 3. THE BOTTOM NAVIGATION 
            Your floating glassmorphic pill menu.
          */}
          <BottomNav />
          
        </GlobalSecurityGuard>
        
      </body>
    </html>
  );
}