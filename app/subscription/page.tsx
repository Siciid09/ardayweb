"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; // Adjust path to your firebase config
import { doc, getDoc } from "firebase/firestore";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Zap, 
  BookOpen, 
  Video, 
  FileText, 
  HelpCircle, 
  MessageCircle, 
  Send,
  ShieldCheck,
  Star
} from "lucide-react";

// --- Interfaces ---
interface ContactLinks {
  whatsapp: string;
  telegram: string;
}

export default function SubscriptionPage() {
  const router = useRouter();

  // --- State ---
  const [links, setLinks] = useState<ContactLinks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Data Fetching ---
  useEffect(() => {
    const fetchContactLinks = async () => {
      try {
        setIsLoading(true);
        // Fetch the 'links' document from the 'links' collection
        const linksRef = doc(db, "links", "links"); 
        const linksSnap = await getDoc(linksRef);

        if (linksSnap.exists()) {
          const data = linksSnap.data();
          setLinks({
            whatsapp: data.whatsapp || data.WhatsApp || "https://wa.me/252633227084", // Fallback to your hardcoded one just in case
            telegram: data.telegram || data.Telegram || "https://t.me/yourusername",
          });
        } else {
          // Fallbacks if doc doesn't exist
          setLinks({
            whatsapp: "https://wa.me/252633227084",
            telegram: "https://t.me/yourusername",
          });
        }
      } catch (err) {
        console.error("Error fetching links:", err);
        setError("Failed to load contact methods. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContactLinks();
  }, []);

  // --- Helpers ---
  const handleContact = (url: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // --- UI Components ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading Pro plans...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 1. Modern Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-slate-50 hover:bg-indigo-50 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Title Section */}
        <div className="text-center max-w-2xl mx-auto mb-16 animate-in slide-in-from-bottom-4 duration-700">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: The Features */}
          <div className="order-2 lg:order-1 space-y-8">
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
                title="Premium General Library" 
                desc="Unlock exclusive study guides, summary notes, and extra reading books." 
              />
            </div>
          </div>

          {/* Right Column: The "Upgrade" Action Card */}
          <div className="order-1 lg:order-2">
            <div className="bg-slate-900 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden transform transition-all hover:scale-[1.02] duration-300">
              {/* Background Glows */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-40"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-40"></div>

              <div className="relative z-10 text-center text-white">
                <Zap className="w-12 h-12 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                <h3 className="text-3xl font-bold mb-2">Pro Plan</h3>
                <p className="text-indigo-200 mb-8 font-medium">One-time payment for full curriculum access.</p>
                
                {/* The Activation Instructions */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8 text-left">
                  <h4 className="font-bold text-lg mb-4 flex items-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 mr-2" />
                    How to activate:
                  </h4>
                  <ol className="list-decimal list-inside space-y-3 text-indigo-100 font-medium text-sm">
                    <li>Message our support team using the buttons below.</li>
                    <li>Provide your registered Account Email or Custom ID.</li>
                    <li>Make your payment via Zaad, eDahab, or direct transfer.</li>
                    <li>Your account will be upgraded instantly!</li>
                  </ol>
                </div>

                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                {/* Contact Buttons */}
                <div className="space-y-4">
                  <button 
                    onClick={() => handleContact(links?.whatsapp || "")}
                    className="w-full flex items-center justify-center py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-emerald-500/30 group"
                  >
                    <MessageCircle className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" /> 
                    Contact via WhatsApp
                  </button>
                  
                  <button 
                    onClick={() => handleContact(links?.telegram || "")}
                    className="w-full flex items-center justify-center py-4 px-6 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/30 group"
                  >
                    <Send className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" /> 
                    Contact via Telegram
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-6 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Secure & trusted activation process.
                </p>
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