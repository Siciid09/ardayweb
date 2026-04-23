"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; 
import { BookOpen, Sparkles, ArrowRight, AlertCircle } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();

  // Mode Toggle
  const [isLogin, setIsLogin] = useState(true);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        // ==========================================
        // LOGIN LOGIC
        // ==========================================
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/dashboard");
      } else {
        // ==========================================
        // SIGNUP LOGIC
        // ==========================================
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        // Write the exact DB fields to the 'users' collection
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName.trim(),
          phone: phone.trim(),
          role: "user",
          isPremium: false,
          createdAt: new Date(),
        });

        // Route to the demographic setup page for new users
        router.push("/onboarding");
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans selection:bg-gray-200">
      
      {/* =========================================
          LEFT PANEL: FORM
      ========================================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-24 relative z-10">
        
        {/* Mobile-only background blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100 rounded-full blur-[100px] -z-10 lg:hidden"></div>

        <div className="max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Logo & Header */}
          <div className="mb-10">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-black/10">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight mb-3">
              {isLogin ? "Welcome back." : "Join the elite."}
            </h1>
            <p className="text-gray-500 font-medium text-lg">
              {isLogin 
                ? "Enter your credentials to access your secure study vault." 
                : "Create an account to unlock your academic potential."}
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start text-red-600 animate-in fade-in">
              <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-100 border-2 border-transparent rounded-2xl text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-100 outline-none transition-all font-medium"
                    placeholder="Mubarik Osman"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5 ml-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-100 border-2 border-transparent rounded-2xl text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-100 outline-none transition-all font-medium"
                    placeholder="+252..."
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-black mb-1.5 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-gray-100 border-2 border-transparent rounded-2xl text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-100 outline-none transition-all font-medium"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-1.5 ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-100 border-2 border-transparent rounded-2xl text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-100 outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-70 disabled:scale-100 active:scale-[0.98] mt-4 flex justify-center items-center group shadow-xl shadow-black/10"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Toggle View Button */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(""); 
              }}
              className="text-gray-500 hover:text-black text-sm font-bold transition-colors"
            >
              {isLogin
                ? "New to the platform? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </div>
          
        </div>
      </div>

      {/* =========================================
          RIGHT PANEL: VISUAL
      ========================================= */}
      <div className="hidden lg:flex lg:w-1/2 p-4 relative">
        <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative shadow-2xl flex items-end p-12 group bg-gray-100 border border-gray-200">
          
          {/* Aesthetic Student Reading Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 group-hover:scale-105"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1513258496099-48166314a708?q=80&w=2000&auto=format&fit=crop')",
            }}
          ></div>
          
          {/* Subtle Dark Gradient Overlay to make text pop */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

          {/* Featured Content / Testimonial */}
          <div className="relative z-10 max-w-md animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-bold text-xs uppercase tracking-widest mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 mr-2 text-amber-300" />
              Arday Caawiye Pro
            </div>
            
            <h2 className="text-4xl font-black text-white mb-4 leading-tight">
              Focus deeply. <br/> Achieve more.
            </h2>
            
            <p className="text-gray-300 font-medium text-lg leading-relaxed">
              "The structured lessons and distraction-free digital library finally gave me the environment I needed to concentrate and pass my national exams."
            </p>
            
            {/* Minimalist user tag */}
            <div className="flex items-center mt-8">
              <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" alt="Student" />
              </div>
              <div className="ml-3">
                <p className="text-white font-bold text-sm">Khalid M.</p>
                <p className="text-gray-400 font-medium text-xs">Graduated with Honors</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}