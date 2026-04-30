"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { auth, db } from "@/lib/firebase"; // Ensure these paths match your config
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const BYPASS_ROLES = ["admin", "sadmin", "badmin"];

export default function GlobalSecurityGuard({ children }: { children: React.ReactNode }) {
  const [isBlackout, setIsBlackout] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch User Role
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userRole = userDoc.data()?.role || "user";
          setRole(userRole);
        } catch (error) {
          console.error("Security Role Check Failed:", error);
          setRole("user");
        }
      } else {
        setRole("guest");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // 2. STOP if user is Admin - Do not attach any listeners
    if (loading || (role && BYPASS_ROLES.includes(role))) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("");
        triggerBlackout();
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "s", "p", "u", "i"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }

      if (e.key === "F12") e.preventDefault();
    };

    const handleBlur = () => setIsBlackout(true);
    const handleFocus = () => setIsBlackout(false);

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      navigator.clipboard.writeText("");
    };

    // Attach Listeners ONLY for non-admins
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("copy", handleCopyCut);
    document.addEventListener("cut", handleCopyCut);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("copy", handleCopyCut);
      document.removeEventListener("cut", handleCopyCut);
    };
  }, [role, loading]);

  const triggerBlackout = () => {
    setIsBlackout(true);
    setTimeout(() => setIsBlackout(false), 3000);
  };

  // Determine if we should show the "Selection Disabled" CSS
  const isBypassed = role && BYPASS_ROLES.includes(role);

  return (
    <>
      {/* Conditionally inject CSS: Admins can select text and print */}
      {!isBypassed && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            html, body { display: none !important; }
          }
          * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
          }
        `}} />
      )}

      {/* Admin Visual Feedback (Optional: Shows a tiny badge so they know they are in safe mode) */}
      {isBypassed && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-emerald-500 text-white p-2 rounded-full shadow-lg opacity-50 hover:opacity-100 transition-opacity">
          <ShieldCheck className="w-5 h-5" />
        </div>
      )}

      {isBlackout && !isBypassed && (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center text-center p-6">
          <ShieldAlert className="w-24 h-24 text-red-600 mb-6 animate-pulse" />
          <h1 className="text-3xl font-black text-red-600 mb-2">SECURITY PROTOCOL ACTIVATED</h1>
          <p className="text-red-500 font-bold max-w-md">
            Background capture and unauthorized copying are restricted. Please return focus to this window.
          </p>
        </div>
      )}

      {/* During initial load, we show a blank screen or spinner to prevent data leak before role check */}
      {loading ? (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        children
      )}
    </>
  );
}