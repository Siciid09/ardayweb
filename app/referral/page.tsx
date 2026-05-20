"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs, doc, runTransaction, arrayUnion } from "firebase/firestore";
import { 
  ShieldCheck, 
  Unlock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Users,
  Loader2
} from "lucide-react";

export default function ReferralPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inputId, setInputId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push("/auth");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId.trim() || !currentUser) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      // 1. Find the friend using the customId (e.g., st-123456)
      const friendQuery = query(
        collection(db, "users"), 
        where("customId", "==", inputId.trim().toLowerCase())
      );
      const friendSnap = await getDocs(friendQuery);

      if (friendSnap.empty) {
        throw new Error("Invalid ID. Friend not found.");
      }

      const friendId = friendSnap.docs[0].id;

      if (friendId === currentUser.uid) {
        throw new Error("You cannot use your own ID!");
      }

      // 2. Perform Secure Transaction
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          throw new Error("Your user profile was not found.");
        }

        if (userSnap.data().hasUsedReferral === true) {
          throw new Error("You have already used a referral code!");
        }

        const progressRef = doc(db, "user_progress", friendId);

        // Update current user
        transaction.update(userRef, {
          hasUsedReferral: true,
          referredBy: friendId
        });

        // Add current user to friend's slot array securely
        transaction.set(progressRef, {
          slots: arrayUnion(currentUser.uid)
        }, { merge: true });
      });

      // 3. Success!
      setMessage({ text: "Success! Code applied. You now have Free Access.", type: "success" });
      setInputId("");
      
      // Optionally redirect them back to the library after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (error: any) {
      console.error(error);
      setMessage({ 
        text: error.message.replace("FirebaseError: ", "").replace("Error: ", ""), 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
        
        {/* Header Graphic */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <button 
            onClick={() => router.back()}
            className="absolute top-6 left-6 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-white/20">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Unlock Access</h1>
          <p className="text-indigo-100 font-medium mt-2 text-sm">
            Enter a friend's referral ID to unlock educational content for free.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Friend's ID Code
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. st-123456"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all uppercase placeholder:normal-case"
                />
              </div>
            </div>

            {/* Notice how we DO NOT display their own ID anywhere here! */}

            {message && (
              <div className={`p-4 rounded-xl flex items-start text-sm font-bold ${
                message.type === "success" 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {message.type === "success" 
                  ? <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> 
                  : <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                }
                <p>{message.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !inputId.trim()}
              className="w-full flex items-center justify-center py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-lg transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:hover:bg-slate-900"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Unlock className="w-5 h-5 mr-2" /> Verify & Unlock
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}