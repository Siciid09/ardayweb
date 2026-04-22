"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export default function GlobalSecurityGuard({ children }: { children: React.ReactNode }) {
  const [isBlackout, setIsBlackout] = useState(false);

  useEffect(() => {
    // 1. Disable Right-Click Globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Keyboard Shortcuts (Copy, Save, Print, Inspect)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen Key
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText(""); // Wipe clipboard
        triggerBlackout();
      }

      // Block Ctrl/Cmd + C, S, P, U, I (Copy, Save, Print, View Source, Inspect)
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "s", "p", "u", "i"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }

      // Block F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
      }
    };

    // 3. Blur Detection (Catches Snipping Tool and OS-level overlays)
    // When the browser loses focus, we black out the screen immediately.
    const handleBlur = () => {
      setIsBlackout(true);
    };

    const handleFocus = () => {
      setIsBlackout(false);
    };

    // 4. Wipe Clipboard on Copy/Cut attempts
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
  }, []);

  const triggerBlackout = () => {
    setIsBlackout(true);
    setTimeout(() => setIsBlackout(false), 3000); // Blackout for 3 seconds
  };

  return (
    <>
      {/* Aggressive CSS Injection to block printing and text selection globally */}
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
          -webkit-touch-callout: none !important; /* Disables long-press on iOS */
        }
      `}} />

      {/* The Blackout Screen Overlay */}
      {isBlackout && (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center text-center p-6">
          <ShieldAlert className="w-24 h-24 text-red-600 mb-6 animate-pulse" />
          <h1 className="text-3xl font-black text-red-600 mb-2">SECURITY PROTOCOL ACTIVATED</h1>
          <p className="text-red-500 font-bold max-w-md">
            Background capture, snipping tools, and unauthorized copying are strictly prohibited to protect premium assets. Please return focus to this window.
          </p>
        </div>
      )}

      {/* Standard App Content */}
      {/* We hide the children entirely if blacked out to prevent DOM inspection while blurred */}
      {!isBlackout && children}
    </>
  );
}