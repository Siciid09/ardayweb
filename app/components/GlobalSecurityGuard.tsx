"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const EXEMPT_ROLES = ["admin", "sadmin", "badmin"];

export default function GlobalSecurityGuard({ children }: { children: React.ReactNode }) {
  const [isBlackout, setIsBlackout] = useState(false);
  const [isExempt, setIsExempt] = useState(false);

  // 1. Check User Role Status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const role = userDoc.data()?.role || "user";
          
          if (EXEMPT_ROLES.includes(role)) {
            setIsExempt(true);
          } else {
            setIsExempt(false);
          }
        } catch (error) {
          console.error("Error fetching user role for security guard:", error);
          setIsExempt(false);
        }
      } else {
        setIsExempt(false); // Not logged in = not exempt
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Apply Security Listeners (Only if NOT exempt)
  useEffect(() => {
    // Bail out completely if the user has an exempt role
    if (isExempt) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

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

      if (e.key === "F12") {
        e.preventDefault();
      }
    };

    const handleBlur = () => {
      setIsBlackout(true);
    };

    const handleFocus = () => {
      setIsBlackout(false);
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      navigator.clipboard.writeText("");
    };

    // Attach Listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("copy", handleCopyCut);
    document.addEventListener("cut", handleCopyCut);

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("copy", handleCopyCut);
      document.removeEventListener("cut", handleCopyCut);
    };
  }, [isExempt]); // Re-run this effect if exemption status changes

  const triggerBlackout = () => {
    setIsBlackout(true);
    setTimeout(() => setIsBlackout(false), 3000); 
  };

  // 3. Render Output
  return (
    <>
      {/* Only inject the restrictive CSS if the user is NOT exempt */}
      {!isExempt && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            html, body { 
              display: none !important; 
              background-color: black !important;
            }
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

      {/* The Blackout Screen Overlay */}
      {isBlackout && !isExempt && (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center text-center p-6">
          <ShieldAlert className="w-24 h-24 text-red-600 mb-6 animate-pulse" />
          <h1 className="text-3xl font-black text-red-600 mb-2">SECURITY PROTOCOL ACTIVATED</h1>
          <p className="text-red-500 font-bold max-w-md">
            Background capture, snipping tools, and unauthorized copying are strictly prohibited to protect premium assets. Please return focus to this window.
          </p>
        </div>
      )}

      {/* Standard App Content */}
      {/* Hide children only if a blackout is actively triggered and the user is NOT exempt */}
      {(!isBlackout || isExempt) && children}
    </>
  );
}
