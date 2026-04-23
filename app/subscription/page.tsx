"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase"; // Adjust path to your firebase config
import { onAuthStateChanged } from "firebase/auth";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Zap, 
  BookOpen, 
  Video, 
  FileText, 
  HelpCircle, 
  Phone,
  User,
  Star,
  ShieldCheck,
  ChevronLeft
} from "lucide-react";

export default function SubscriptionPage() {
  const router = useRouter();

  // --- Auth State ---
  const [userEmail, setUserEmail] = useState<string>("Email lama hayo");
  
  // --- Payment Form State ---
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch logged-in user's email for the WhatsApp message
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Payment Logic ---
  const dialUSSD = (ussdCode: string) => {
    // Encodes the # symbol for mobile browsers so it dials correctly
    const encodedUssd = ussdCode.replace(/#/g, "%23");
    window.open(`tel:${encodedUssd}`, "_self");
  };

  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const message = `*XAQIIJINTA LACAG BIXINTA*\n\n*Emailka ardayga:* ${userEmail}\n*Magaca:* ${name}\n*Lacagta:* 43,000 SLShs ah\n*Lambarka laga soo diray:* ${phone}`;
    
    // Official WhatsApp API link strictly hardcoded to your number
    const whatsappUrl = `https://wa.me/252633227084?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, "_blank");
    
    // Reset and route back to dashboard after a short delay
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 1. Modern Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-slate-50 hover:bg-indigo-50 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Title Section */}
        <div className="text-center max-w-2xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm uppercase tracking-widest">
            <Star className="w-4 h-4 mr-2 fill-indigo-700" /> Arday Caawiye Premium
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Unlock your full <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">academic potential</span>.
          </h1>
          <p className="text-lg text-slate-600 font-medium leading-relaxed">
            Get unlimited access to video lessons, interactive quizzes, past examination papers, and our entire library of premium study materials.
          </p>
        </div>

        {/* 2. Pricing/Feature Card Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          {/* Left Column: The Features */}
          <div className="order-2 lg:order-1 space-y-8 animate-in fade-in slide-in-from-left-8 duration-700 delay-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Everything you get with Pro:</h2>
            
            <div className="space-y-6">
              <FeatureRow 
                icon={<Video className="w-6 h-6 text-blue-500" />} 
                title="Unlimited Video Lessons" 
                desc="Watch all premium tutorial videos without any restrictions." 
              />
              <FeatureRow 
                icon={<FileText className="w-6 h-6 text-emerald-500" />} 
                title="Full Past Papers Archive" 
                desc="Access years of past exams and official marking schemes/answers." 
              />
              <FeatureRow 
                icon={<HelpCircle className="w-6 h-6 text-amber-500" />} 
                title="Interactive Quiz Engine" 
                desc="Test your knowledge with chapter-by-chapter interactive challenges." 
              />
              <FeatureRow 
                icon={<BookOpen className="w-6 h-6 text-purple-500" />} 
                title="Premium Digital Library" 
                desc="Unlock exclusive study guides, summary notes, and extra reading books." 
              />
            </div>
          </div>

          {/* Right Column: The Interactive Payment Card */}
          <div className="order-1 lg:order-2 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="bg-slate-900 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
              
              {/* Background Glows */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-40 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-40 pointer-events-none"></div>

              <div className="relative z-10 text-white">
                
                {!showConfirmForm ? (
                  /* --- STATE 1: PAYMENT OPTIONS --- */
                  <div className="animate-in fade-in zoom-in-95 duration-300">
                    <div className="text-center">
                      <Zap className="w-12 h-12 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                      <h3 className="text-3xl font-black mb-2">Pro Plan</h3>
                      <p className="text-indigo-200 mb-6 font-medium">One-time payment for full curriculum access.</p>
                      
                      <div className="flex items-baseline justify-center mb-8">
                        <span className="text-5xl font-black">$4</span>
                        <span className="text-xl text-slate-400 ml-2 font-bold">/ 43,000 SLShs</span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <button 
                        onClick={() => dialUSSD("*220*0633227084*43000#")}
                        className="w-full flex items-center justify-center py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-emerald-500/20 group"
                      >
                        <Phone className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" /> Ku Bixi ZAAD
                      </button>
                      <button 
                        onClick={() => dialUSSD("*220*0653227084*43000#")}
                        className="w-full flex items-center justify-center py-4 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-amber-500/20 group"
                      >
                        <Phone className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" /> Ku Bixi E-DAHAB
                      </button>
                    </div>

                    <button 
                      onClick={() => setShowConfirmForm(true)}
                      className="w-full py-4 text-indigo-400 font-bold hover:text-white hover:bg-white/10 rounded-2xl transition-colors"
                    >
                      Waan Bixiyay Lacagta
                    </button>

                    <p className="text-xs text-slate-400 mt-6 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 mr-1" /> Secure & trusted activation process.
                    </p>
                  </div>
                ) : (
                  /* --- STATE 2: WHATSAPP CONFIRMATION FORM --- */
                  <div className="animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center mb-8">
                      <button 
                        onClick={() => setShowConfirmForm(false)} 
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                      <h3 className="text-2xl font-black ml-4">Xaqiiji Lacagta</h3>
                    </div>

                    <p className="text-indigo-200 font-medium mb-6 leading-relaxed">
                      Fadlan geli xogta saxda ah si aan ugu dirno WhatsApp-ka oo akoonkaaga loogu furo.
                    </p>

                    <form onSubmit={handleWhatsAppSubmit} className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">
                          Lambarka aad ka dirtay
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            required 
                            type="tel" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Tusaale: 063XXXXXXX"
                            className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-white placeholder:text-slate-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">
                          Magacaaga oo saddexan
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            required 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Geli magacaaga"
                            className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-white placeholder:text-slate-500 transition-all"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full mt-6 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center disabled:opacity-70"
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
          </div>

        </div>
      </main>
    </div>
  );
}

// --- Helper UI Component ---
function FeatureRow({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex items-start">
      <div className="shrink-0 mt-1">
        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="ml-5">
        <h3 className="text-xl font-bold text-slate-800 mb-1 flex items-center">
          {title}
          <CheckCircle2 className="w-5 h-5 text-indigo-600 ml-2" />
        </h3>
        <p className="text-slate-600 leading-relaxed font-medium">
          {desc}
        </p>
      </div>
    </div>
  );
}