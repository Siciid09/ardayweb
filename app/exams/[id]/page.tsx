"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { 
  ArrowLeft, FileText, AlertCircle, ShieldAlert, 
  Lock, Phone, User, CheckCircle2, ChevronLeft
} from "lucide-react";

// --- Interface ---
interface ExamDetails {
  id: string;
  title: string;
  year: number;
  pdfUrl: string;
  subjectName: string;
  isAnswer: boolean;
}

export default function SecureExamViewerPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  // --- Core State ---
  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // --- Security & Paywall State ---
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);
  
  // --- Payment Form State ---
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================================================
  // 1. AUTH & PREMIUM GATEKEEPER
  // ==========================================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        // Check if user is premium
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists() && (userDocSnap.data().isPremium || userDocSnap.data().pro)) {
          setIsPremium(true);
          fetchExamDetails(); // ONLY fetch the exam if they are premium!
        } else {
          setIsPremium(false);
          setIsLoading(false); // Stop loading, show the paywall
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setError("Failed to verify account status.");
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // ==========================================================================
  // 2. DATA FETCHING (Only runs if Premium)
  // ==========================================================================
  const fetchExamDetails = async () => {
    try {
      const examRef = doc(db, "exams", examId);
      const examSnap = await getDoc(examRef);

      if (!examSnap.exists()) {
        setError("Exam paper not found.");
        return;
      }

      const data = examSnap.data();
      let subjectName = "Unknown Subject";
      
      if (data.subjectId) {
        const subjectSnap = await getDoc(doc(db, "subjects", data.subjectId));
        if (subjectSnap.exists()) subjectName = subjectSnap.data().name;
      }

      setExam({
        id: examSnap.id,
        title: data.title || "Untitled Paper",
        year: data.year || new Date().getFullYear(),
        pdfUrl: data.pdfUrl || "",
        subjectName,
        isAnswer: data.isAnswer || false,
      });

    } catch (err) {
      console.error("Error fetching exam:", err);
      setError("Failed to load the document.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // 3. AGGRESSIVE ANTI-PIRACY ENGINE
  // ==========================================================================
  useEffect(() => {
    if (!isPremium) return; // Don't run security engine if they are just looking at the paywall

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText(""); 
        triggerBlackout();
      }
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "x", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    const triggerBlackout = () => {
      setIsSecurityTriggered(true);
      setTimeout(() => setIsSecurityTriggered(false), 3000);
    };

    const handleBlur = () => setIsSecurityTriggered(true);
    const handleFocus = () => setIsSecurityTriggered(false);
    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); navigator.clipboard.writeText(""); };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCopy);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCopy);
    };
  }, [isPremium]);


  // ==========================================================================
  // PAYMENT LOGIC (From Dart App)
  // ==========================================================================
  const dialUSSD = (ussdCode: string) => {
    // Encodes the # symbol for mobile browsers
    const encodedUssd = ussdCode.replace(/#/g, "%23");
    window.open(`tel:${encodedUssd}`, "_self");
  };

  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const user = auth.currentUser;
    const userEmail = user?.email || "Email lama hayo";

    const message = `*XAQIIJINTA LACAG BIXINTA*\n\n*Emailka ardayga:* ${userEmail}\n*Magaca:* ${name}\n*Lacagta:* 43,000 SLShs ah\n*Lambarka laga soo diray:* ${phone}`;
    
    // Official WhatsApp API link
    const whatsappUrl = `https://wa.me/252633227084?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
    
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/dashboard"); // Kick them back to dashboard while waiting for admin approval
    }, 1500);
  };


  // ==========================================================================
  // RENDER VIEWS
  // ==========================================================================

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Decrypting Document...</p>
      </div>
    );
  }

  // 2. Paywall State (If NOT Premium)
  if (isPremium === false) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* Background Blur Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none"></div>

        {/* The Glass Paywall Modal */}
        <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
          
          {!showConfirmForm ? (
            /* --- STEP 1: PAYMENT OPTIONS --- */
            <div className="p-8">
              <button onClick={() => router.back()} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>

              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-100">
                <Lock className="w-10 h-10 text-amber-500" />
              </div>
              
              <h2 className="text-3xl font-black text-center text-slate-800 mb-2">Go Premium</h2>
              <p className="text-center text-slate-500 font-medium mb-8 leading-relaxed px-4">
                Si aad u hesho casharadan iyo agabkan kale oo dhamaystiran, fadlan bixi lacag dhan <strong className="text-slate-800">$4 (43,000 SLShs)</strong>.
              </p>

              <div className="space-y-3 mb-6">
                <button 
                  onClick={() => dialUSSD("*220*0633227084*43000#")}
                  className="w-full flex items-center justify-center py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Phone className="w-5 h-5 mr-2" /> Ku Bixi ZAAD
                </button>
                <button 
                  onClick={() => dialUSSD("*220*0653227084*43000#")}
                  className="w-full flex items-center justify-center py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-amber-500/20"
                >
                  <Phone className="w-5 h-5 mr-2" /> Ku Bixi E-DAHAB
                </button>
              </div>

              <button 
                onClick={() => setShowConfirmForm(true)}
                className="w-full py-4 text-indigo-600 font-bold hover:bg-indigo-50 rounded-2xl transition-colors"
              >
                Waan Bixiyay Lacagta
              </button>
            </div>
          ) : (
            /* --- STEP 2: CONFIRMATION FORM --- */
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => setShowConfirmForm(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h2 className="text-xl font-black text-slate-800">Xaqiiji Lacagta</h2>
                <div className="w-9"></div> {/* Spacer for centering */}
              </div>

              <p className="text-slate-500 font-medium mb-6">
                Fadlan geli xogta saxda ah si aan kuugu furno akoonkaaga.
              </p>

              <form onSubmit={handleWhatsAppSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Lambarka aad ka dirtay</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="Tusaale: 063XXXXXXX"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Magacaaga oo saddexan</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Geli magacaaga"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                    />
                  </div>
                </div>

                <button 
                  type="submit" disabled={isSubmitting}
                  className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>Xaqiiji & Dir WhatsApp</>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Blackout State (Security Triggered)
  if (isSecurityTriggered) {
    return (
      <div className="fixed inset-0 z-[9999] h-screen w-screen bg-black flex flex-col items-center justify-center select-none">
        <ShieldAlert className="w-24 h-24 text-red-600 mb-6 animate-pulse" />
        <h1 className="text-3xl font-black text-red-600 mb-2">SECURITY VIOLATION</h1>
        <p className="text-red-500 font-bold max-w-md text-center">
          Screenshots, screen recording, and background capture are strictly prohibited for premium assets.
        </p>
      </div>
    );
  }

  // 4. Secure Document Render (If Premium & Fetched)
  if (error || !exam) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button onClick={() => router.back()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden select-none">
      
      {/* Anti-Print CSS Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print { body { display: none !important; } }
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      `}} />

      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 shadow-md z-10">
        <div className="flex items-center space-x-4 min-w-0">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 min-w-0">
            <div className="hidden sm:flex px-2 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md text-xs font-black uppercase tracking-wider shrink-0">
              {exam.year}
            </div>
            <h1 className="text-white font-bold truncate text-sm sm:text-base flex items-center">
              {exam.subjectName} - {exam.isAnswer ? `${exam.title} (Answers)` : exam.title}
            </h1>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg shrink-0">
          <ShieldAlert className="w-4 h-4 text-red-500 mr-2" />
          <span className="text-xs font-bold text-red-500 hidden sm:inline">Protected View</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative bg-slate-950 flex items-center justify-center">
        {exam.pdfUrl ? (
          <div className="relative w-full h-full">
            <object
              data={`${exam.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
              type="application/pdf"
              className="absolute inset-0 w-full h-full"
            >
              <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900">
                <FileText className="w-20 h-20 text-slate-600 mb-6" />
                <h2 className="text-xl font-bold text-white mb-2">Browser Cannot Securely Display PDF</h2>
                <p className="text-slate-400 mb-6 max-w-md">Your current browser configuration does not support our secure inline PDF viewer.</p>
                <button onClick={() => router.back()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Return</button>
              </div>
            </object>

            {/* Invisible Glass Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none bg-transparent"></div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-slate-500 font-medium text-lg">No PDF file attached to this record.</p>
          </div>
        )}
      </main>
    </div>
  );
}