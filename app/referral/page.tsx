"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  collection, query, where, getDocs, doc, runTransaction, 
  onSnapshot, serverTimestamp, getDoc, updateDoc
} from "firebase/firestore";
import { 
  ShieldCheck, Unlock, AlertCircle, CheckCircle2, 
  ArrowLeft, Copy, Share2, Award, Loader2, Lock
} from "lucide-react";

export default function ReferralPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myCustomId, setMyCustomId] = useState("Loading...");
  const [slots, setSlots] = useState<string[]>([]);
  
  const [inputId, setInputId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 1. Auth & Data Fetching
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Fetch my custom ID
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().customId) {
          setMyCustomId(userSnap.data().customId);
        }

        // Listen to progress real-time
        const progressRef = doc(db, "user_progress", user.uid);
        const unsubscribeProgress = onSnapshot(progressRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().slots) {
            setSlots(docSnap.data().slots);
          } else {
            setSlots([]);
          }
        });

        return () => unsubscribeProgress();
      } else {
        router.push("/auth");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // 2. Share Function
  const handleShare = async () => {
    const shareText = `Fadlan soo degso app-ka ArdayCaawiye oo isku diwaangeli.\nMarkaad gasho, isii ID-gaaga (tusaale: ${myCustomId}) si aan ugu furto casharada!\n\nHalkan kala soo deg: https://play.google.com/store/apps/details?id=com.ardaycaawiye.app`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "ArdayCaawiye", text: shareText });
      } catch (e) {
        console.error(e);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setMessage({ text: "Link copied to clipboard!", type: "success" });
    }
  };

  // 3. Verify & Claim Friend's ID (Hunter Model)
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = inputId.trim().toLowerCase();
    
    if (!cleanInput || !currentUser) return;
    if (cleanInput === myCustomId.toLowerCase()) {
      setMessage({ text: "Ma isticmaali kartid ID-gaaga!", type: "error" });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);

    try {
      // A. Check if user exists
      const friendQuery = query(collection(db, "users"), where("customId", "==", cleanInput));
      const friendSnap = await getDocs(friendQuery);

      if (friendSnap.empty) {
        throw new Error("ID-gan lama helin. Fadlan hubi.");
      }

      // B. Secure Transaction
      const resultMessage = await runTransaction(db, async (transaction) => {
        const claimedRef = doc(db, "claimed_codes", cleanInput);
        const claimedSnap = await transaction.get(claimedRef);
        
        if (claimedSnap.exists()) {
          throw new Error("Code-kan hore ayaa loo isticmaalay!");
        }

        const myProgressRef = doc(db, "user_progress", currentUser.uid);
        const myProgressSnap = await transaction.get(myProgressRef);
        
        let currentSlots: string[] = [];
        if (myProgressSnap.exists() && myProgressSnap.data().slots) {
          currentSlots = myProgressSnap.data().slots;
        }

        if (currentSlots.length >= 10) {
          throw new Error("Hore ayaad u buuxisay 10-ka boos!");
        }

        // Claim it
        transaction.set(claimedRef, { claimedBy: currentUser.uid, timestamp: serverTimestamp() });
        const newSlots = [...currentSlots, cleanInput];
        transaction.set(myProgressRef, { slots: newSlots }, { merge: true });

        if (newSlots.length === 10) {
          return "HAMBALYO! Waxaad buuxisay dhamaan boosaskii! Hadda furo Premium-ka.";
        }
        return `Waa Sax! Waxaa kuu haray ${10 - newSlots.length} boos.`;
      });

      setMessage({ text: resultMessage, type: "success" });
      setInputId("");

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

  // 4. Unlock Premium Button
  const handleClaimPremium = async () => {
    if (!currentUser) return;
    setIsClaiming(true);
    setMessage(null);

    try {
      if (slots.length < 10) {
        throw new Error("Wali maadan buuxin 10-ka boos!");
      }

      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        isPremium: true,
        premiumSource: "hunter_referral"
      });

      // Local storage cache to mimic the app
      localStorage.setItem("cached_isPremium", "true");

      setMessage({ text: "Hambalyo! Waxaad hadda tahay Premium!", type: "success" });
      
      setTimeout(() => {
        router.push("/"); // Or dashboard
      }, 2000);

    } catch (error: any) {
      setMessage({ text: error.message, type: "error" });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Background glow effects matching app */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        
        {/* Header */}
        <div className="flex items-center mb-8">
          <button onClick={() => router.back()} className="text-white/70 hover:text-white mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-3xl font-black text-white">Uruuri ID-yada</h1>
            <p className="text-white/60 text-sm mt-1">Uruuri 10 ID si aad u hesho Premium!</p>
          </div>
        </div>

        {/* 1. Share My ID Section */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl text-center">
          <p className="text-xs font-black tracking-widest text-white/50 uppercase mb-4">Waxaad u dirtaa saaxiibadaa:</p>
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Copy className="w-5 h-5 text-white/70" />
            <span className="text-3xl font-black text-white tracking-widest uppercase">{myCustomId}</span>
          </div>
          <button 
            onClick={handleShare}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center transition-colors"
          >
            <Share2 className="w-5 h-5 mr-2" /> Share Link & Instructions
          </button>
        </div>

        {/* 2. Progress Grid Section */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Heerkaaga</h2>
            <div className={`px-4 py-1.5 rounded-full border font-black text-sm ${slots.length >= 10 ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-blue-500/20 border-blue-500 text-blue-400'}`}>
              {slots.length} / 10
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-6">
            {Array.from({ length: 10 }).map((_, index) => {
              const isFilled = index < slots.length;
              return (
                <div 
                  key={index} 
                  className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${
                    isFilled 
                      ? 'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                      : 'bg-white/5 border-white/20'
                  }`}
                >
                  {isFilled ? <CheckCircle2 className="w-6 h-6 text-blue-600" /> : <Lock className="w-5 h-5 text-white/30" />}
                </div>
              );
            })}
          </div>

          {slots.length >= 10 && (
            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-green-400 font-bold mb-4">Hambalyo! Waxaad buuxisay dhamaan 10-ka boos! 🎉</p>
              <button 
                onClick={handleClaimPremium}
                disabled={isClaiming}
                className="w-full py-4 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-bold flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-colors disabled:opacity-70"
              >
                {isClaiming ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Award className="w-6 h-6 mr-2" /> Furo Premium ka</>}
              </button>
            </div>
          )}
        </div>

        {/* 3. Input Friend's ID Section */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl">
          <label className="block text-sm font-bold text-white mb-3">Halkan Gali ID-ga Saaxiibkaa:</label>
          <form onSubmit={handleVerify} className="flex gap-3">
            <div className="relative flex-1">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                required
                placeholder="ST-XXXXXX"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-black/30 border-none rounded-2xl text-white font-bold placeholder:text-white/30 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputId.trim() || slots.length >= 10}
              className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black disabled:opacity-50 transition-opacity"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Hubi"}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-4 rounded-xl flex items-start text-sm font-bold ${
              message.type === "success" 
                ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}>
              {message.type === "success" 
                ? <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> 
                : <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
              }
              <p>{message.text}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}