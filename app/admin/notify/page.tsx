// app/admin/notify/page.jsx
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../../lib/firebase"; // Make sure this points to your client config
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ShieldCheck, ShieldAlert, Send, ArrowLeft } from "lucide-react";

export default function AdminNotifyPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // =======================================================================
  // SECURITY & ACCESS CONTROL
  // =======================================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setHasAccess(false);
        setIsLoadingAccess(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.data()?.role?.toLowerCase() || "user";

        // STRICT CHECK: Only sadmin, admin, or badmin
        if (["sadmin", "admin", "badmin"].includes(role)) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Error verifying access:", error);
        setHasAccess(false);
      } finally {
        setIsLoadingAccess(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // =======================================================================
  // SEND NOTIFICATION LOGIC
  // =======================================================================
  const sendNotification = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      alert("Fadlan buuxi Title-ka iyo Description-ka!");
      return;
    }

    setIsSending(true);

    try {
      // Calls our custom Next.js API route instead of a Cloud Function
      const response = await fetch('/api/admin/notify', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          messageBody: body.trim(),
          topic: "all_users",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Alert-ka si guul ah ayaa loo diray!");
        setTitle("");
        setBody("");
      } else {
        throw new Error(data.error || "Failed to send notification");
      }
    } catch (error) {
      alert(`Cillad ayaa dhacday: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSending(false);
    }
  };

  // =======================================================================
  // UI BUILDERS
  // =======================================================================
  if (isLoadingAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0164E5] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-gray-900 dark:bg-[#0A0A0A] dark:text-white pb-20">
      {/* Premium Header */}
      <header className="flex h-20 items-center justify-between px-6 pt-4">
        <button
          onClick={() => window.history.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-black tracking-[0.2em] text-[#0164E5]">
          ADMIN TERMINAL
        </h1>
        <div className="w-10" /> {/* Spacer for perfect centering */}
      </header>

      <main className="mx-auto mt-4 max-w-2xl px-6">
        {!hasAccess ? (
          // =======================================================================
          // ACCESS DENIED UI
          // =======================================================================
          <div className="mt-8 rounded-[30px] border border-red-500/30 bg-white p-8 text-center shadow-[0_15px_30px_-15px_rgba(239,68,68,0.2)] dark:bg-white/5 dark:shadow-none">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-500/15">
              <ShieldAlert className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="mt-6 text-2xl font-black">Access Denied</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              You do not have the required administrative clearance to access
              the broadcast terminal. Only sadmin, admin, and badmin roles are
              authorized.
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-8 w-full rounded-2xl bg-red-500/10 py-4 font-bold text-red-500 transition hover:bg-red-500/20"
            >
              Return to Safety
            </button>
          </div>
        ) : (
          // =======================================================================
          // ADMIN TERMINAL UI
          // =======================================================================
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Header */}
            <div className="mb-8 flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Secure Connection Active</h3>
                <p className="text-xs text-gray-500">
                  Authorized Broadcast Terminal
                </p>
              </div>
            </div>

            {/* Glass Form Container */}
            <form
              onSubmit={sendNotification}
              className="rounded-[24px] border border-black/5 bg-white p-6 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
            >
              <label className="mb-2 block text-sm font-semibold">
                Notification Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Imtixaankii Waa Soo Dhawyahay! ⏰"
                className="mb-6 w-full rounded-2xl bg-gray-100 p-4 font-bold outline-none ring-2 ring-transparent transition focus:ring-[#0164E5] dark:bg-black/25 placeholder:font-normal"
                required
              />

              <label className="mb-2 block text-sm font-semibold">
                Message Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type the full notification description here..."
                rows={4}
                className="mb-8 w-full resize-none rounded-2xl bg-gray-100 p-4 outline-none ring-2 ring-transparent transition focus:ring-[#0164E5] dark:bg-black/25"
                required
              />

              {/* Broadcast Button */}
              <button
                type="submit"
                disabled={isSending}
                className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#0164E5] to-[#00C6FF] py-[18px] font-bold text-white shadow-[0_8px_15px_-3px_rgba(1,100,229,0.4)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none"
              >
                {isSending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <div className="flex items-center space-x-2.5">
                    <Send className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    <span>Broadcast Alert</span>
                  </div>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}