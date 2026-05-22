"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  collection, query, where, getDocs, doc, runTransaction, 
  onSnapshot, serverTimestamp, getDoc, updateDoc, addDoc
} from "firebase/firestore";
import { 
  ShieldCheck, Unlock, AlertCircle, CheckCircle2, 
  ArrowLeft, Copy, Share2, Award, Loader2, Lock,
  Phone, CreditCard, Banknote
} from "lucide-react";

export default function UpgradePage() {
  const router = useRouter();

  // --- CORE STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"loading" | "free" | "paid">("loading");
  
  // Updated to strings to match your DB ("2" and "22000")
  const [price, setPrice] = useState<string>("2");
  const [slshPrice, setSlshPrice] = useState<string>("22000");

  // --- REFERRAL (FREE) STATE ---
  const [myCustomId, setMyCustomId] = useState("Loading...");
  const [slots, setSlots] = useState<string[]>([]);
  const [inputId, setInputId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [refMessage, setRefMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- PAYMENT (PAID) STATE ---
  const [paymentPhone, setPaymentPhone] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [payMessage, setPayMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ==========================================
  // 1. INITIALIZATION & DATABASE CHECK
  // ==========================================
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        let userRegion = "Somaliland";
        let userGrade = "Form 4";

        // A. Fetch User Data
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.customId) setMyCustomId(data.customId);
          if (data.region) userRegion = data.region;
          if (data.grade) userGrade = data.grade;
        }

        // B. Listen to Referral Progress (In case they are Free)
        const progressRef = doc(db, "user_progress", user.uid);
        const unsubscribeProgress = onSnapshot(progressRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().slots) {
            setSlots(docSnap.data().slots);
          } else {
            setSlots([]);
          }
        });

        // C. Check FREE vs PAID logic (Just like the app)
        let determinedMode: "free" | "paid" = "paid";
        let fetchedPrice = "2";
        let fetchedSlsh = "22000";

        try {
          // --- REAL DB FETCH: collection "payment", document "2Ht3oVzdSAv77UzmMXax" ---
          const pricingSnap = await getDoc(doc(db, "payment", "2Ht3oVzdSAv77UzmMXax"));
          
          if (pricingSnap.exists()) {
             const pData = pricingSnap.data();
             
             if (pData.dollar) fetchedPrice = pData.dollar;
             if (pData.slsh) fetchedSlsh = pData.slsh;
             
             // If you ever add a "payment_mode" field to this document to make the whole app free
             if (pData.payment_mode === "free") determinedMode = "free";
          }

          // Check Region (Overrides global if free)
          const regionQuery = query(collection(db, "regions"), where("name", "==", userRegion));
          const regionDocs = await getDocs(regionQuery);
          if (!regionDocs.empty) {
             const rData = regionDocs.docs[0].data();
             if (rData.paymentMode === "free" || rData.payment_mode === "free") determinedMode = "free";
          }

          // Check Grade (Overrides global/region if free)
          const gradeQuery = query(collection(db, "grades"), where("name", "==", userGrade));
          const gradeDocs = await getDocs(gradeQuery);
          if (!gradeDocs.empty) {
             const gData = gradeDocs.docs[0].data();
             if (gData.paymentMode === "free" || gData.payment_mode === "free") determinedMode = "free";
          }
        } catch (e) {
           console.error("Error fetching pricing details", e);
        }

        setPrice(fetchedPrice);
        setSlshPrice(fetchedSlsh);
        setMode(determinedMode);

        return () => unsubscribeProgress();
      } else {
        router.push("/auth");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);


  // ==========================================
  // 2. REFERRAL (FREE) LOGIC
  // ==========================================
  const handleShare = async () => {
    const shareText = `Fadlan soo degso app-ka ArdayCaawiye oo isku diwaangeli.\nMarkaad gasho, isii ID-gaaga (tusaale: ${myCustomId}) si aan ugu furto casharada!\n\nHalkan kala soo deg: https://play.google.com/store/apps/details?id=com.ardaycaawiye.app`;
    if (navigator.share) {
      try { await navigator.share({ title: "ArdayCaawiye", text: shareText }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(shareText);
      setRefMessage({ text: "Link copied to clipboard!", type: "success" });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = inputId.trim().toLowerCase();
    if (!cleanInput || !currentUser) return;
    
    if (cleanInput === myCustomId.toLowerCase()) {
      setRefMessage({ text: "Ma isticmaali kartid ID-gaaga!", type: "error" });
      return;
    }
    
    setIsVerifying(true);
    setRefMessage(null);

    try {
      const friendQuery = query(collection(db, "users"), where("customId", "==", cleanInput));
      const friendSnap = await getDocs(friendQuery);

      if (friendSnap.empty) throw new Error("ID-gan lama helin. Fadlan hubi.");

      const resultMessage = await runTransaction(db, async (transaction) => {
        const claimedRef = doc(db, "claimed_codes", cleanInput);
        const claimedSnap = await transaction.get(claimedRef);
        if (claimedSnap.exists()) throw new Error("Code-kan hore ayaa loo isticmaalay!");

        const myProgressRef = doc(db, "user_progress", currentUser.uid);
        const myProgressSnap = await transaction.get(myProgressRef);
        let currentSlots: string[] = [];
        if (myProgressSnap.exists() && myProgressSnap.data().slots) {
          currentSlots = myProgressSnap.data().slots;
        }

        if (currentSlots.length >= 10) throw new Error("Hore ayaad u buuxisay 10-ka boos!");

        transaction.set(claimedRef, { claimedBy: currentUser.uid, timestamp: serverTimestamp() });
        const newSlots = [...currentSlots, cleanInput];
        transaction.set(myProgressRef, { slots: newSlots }, { merge: true });

        if (newSlots.length === 10) return "HAMBALYO! Waxaad buuxisay dhamaan boosaskii! Hadda furo Premium-ka.";
        return `Waa Sax! Waxaa kuu haray ${10 - newSlots.length} boos.`;
      });

      setRefMessage({ text: resultMessage, type: "success" });
      setInputId("");
    } catch (error: any) {
      setRefMessage({ text: error.message.replace("Error: ", ""), type: "error" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClaimPremium = async () => {
    if (!currentUser) return;
    setIsClaiming(true);
    setRefMessage(null);
    try {
      if (slots.length < 10) throw new Error("Wali maadan buuxin 10-ka boos!");
      await updateDoc(doc(db, "users", currentUser.uid), { isPremium: true, premiumSource: "hunter_referral" });
      localStorage.setItem("cached_isPremium", "true");
      setRefMessage({ text: "Hambalyo! Waxaad hadda tahay Premium!", type: "success" });
      setTimeout(() => router.push("/"), 2000);
    } catch (error: any) {
      setRefMessage({ text: error.message, type: "error" });
    } finally {
      setIsClaiming(false);
    }
  };


  // ==========================================
  // 3. PAYMENT (PAID) LOGIC
  // ==========================================
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !paymentPhone.trim()) return;
    setIsSubmittingPayment(true);
    setPayMessage(null);

    try {
      await addDoc(collection(db, "payment_requests"), {
         uid: currentUser.uid,
         phone: paymentPhone,
         amount: price, // Now saves the "2" string correctly
         status: "pending",
         timestamp: serverTimestamp(),
      });
      setPayMessage({ text: "Dalabkaaga waa la diray. Dib ayaan kaaga soo xaqiijin doonaa.", type: "success" });
      setPaymentPhone("");
    } catch (error: any) {
      setPayMessage({ text: "Cillad ayaa dhacday. Fadlan isku day markale.", type: "error" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // ==========================================
  // UI RENDERERS
  // ==========================================
  if (mode === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
         <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects matching app */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        
        {/* Universal Header */}
        <div className="flex items-center mb-8">
          <button onClick={() => router.back()} className="text-white/70 hover:text-white mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-3xl font-black text-white">Premium Access</h1>
            <p className="text-white/60 text-sm mt-1">Furo dhammaan casharada iyo imtixaanada</p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PAID UI (ZAAD/SAHAL) */}
        {/* ============================================================== */}
        {mode === "paid" && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl animate-in fade-in zoom-in duration-500">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-2xl mb-4 mx-auto">
              <CreditCard className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-2">Bixi Isdiiwaangelinta</h2>
            <p className="text-white/70 text-center mb-6 text-sm">Fadlan bixi lacagta isdiiwaangelinta si aad u hesho dhammaan adeegyada.</p>
            
            <div className="bg-black/20 border border-white/5 p-4 rounded-2xl mb-6">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-white/60 font-bold">Qiimaha:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-green-400">${price}</span>
                    <span className="text-sm font-bold text-white/50 ml-2">({slshPrice} SLSH)</span>
                  </div>
               </div>
               <hr className="border-white/10 my-3" />
               <p className="text-xs text-white/50 font-bold mb-3 uppercase tracking-wider">Ku dir lacagta nambaradan:</p>
               <div className="space-y-3">
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                    <span className="text-blue-300 font-bold flex items-center"><Banknote className="w-4 h-4 mr-2"/> Zaad / Sahal:</span> 
                    {/* Placeholder numbers - you can fetch these from DB later if you add them! */}
                    <span className="font-mono font-black text-white tracking-widest">063 400 0000</span>
                 </div>
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                    <span className="text-yellow-400 font-bold flex items-center"><Banknote className="w-4 h-4 mr-2"/> EVC Plus:</span> 
                    <span className="font-mono font-black text-white tracking-widest">061 400 0000</span>
                 </div>
               </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-white mb-2">Nambarka aad lacagta ka dirtay:</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input 
                      type="text" 
                      value={paymentPhone} 
                      onChange={e=>setPaymentPhone(e.target.value)} 
                      required 
                      placeholder="Tusaale: 063XXXXXXX" 
                      className="w-full pl-11 pr-4 py-4 bg-black/30 border border-white/10 rounded-2xl text-white font-bold placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
               </div>
               <button 
                  type="submit" 
                  disabled={isSubmittingPayment || !paymentPhone.trim()} 
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg flex items-center justify-center transition-all disabled:opacity-50"
               >
                  {isSubmittingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : "Xaqiiji Bixinta"}
               </button>
            </form>

            {payMessage && (
              <div className={`mt-4 p-4 rounded-xl flex items-start text-sm font-bold ${
                payMessage.type === "success" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
              }`}>
                {payMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> : <AlertCircle className="w-5 h-5 mr-3 shrink-0" />}
                <p>{payMessage.text}</p>
              </div>
            )}
          </div>
        )}


        {/* ============================================================== */}
        {/* FREE UI (REFERRAL / HUNTER MODEL) */}
        {/* ============================================================== */}
        {mode === "free" && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            {/* Share Section */}
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

            {/* Grid Section */}
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
                        isFilled ? 'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-white/5 border-white/20'
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

            {/* Input Section */}
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
                  disabled={isVerifying || !inputId.trim() || slots.length >= 10}
                  className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black disabled:opacity-50 transition-opacity"
                >
                  {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Hubi"}
                </button>
              </form>

              {refMessage && (
                <div className={`mt-4 p-4 rounded-xl flex items-start text-sm font-bold ${
                  refMessage.type === "success" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                }`}>
                  {refMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> : <AlertCircle className="w-5 h-5 mr-3 shrink-0" />}
                  <p>{refMessage.text}</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}