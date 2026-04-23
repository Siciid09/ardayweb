"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, getDoc, collection, getDocs, query, where, 
  setDoc, deleteDoc, onSnapshot, serverTimestamp 
} from "firebase/firestore";
import { 
  Brain, Shield, Lock, Star, Swords, ChevronRight, 
  Search, X, Trophy, Clock, AlertCircle, Gamepad2, ArrowLeft,
  GraduationCap, MapPin, Settings2
} from "lucide-react";

// --- Interfaces ---
interface UserData {
  uid: string;
  name: string;
  isPremium: boolean;
  activeChallengeId?: string;
  grade: string;
  region: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Quiz {
  id: string;
  title: string;
  questionCount: number;
}

// Fallback arrays in case the database is empty
const GRADE_LEVELS = ['Form 4', 'Form 3', 'Form 2', 'Form 1', 'Grade 8', 'Grade 7', 'Grade 6'];
const REGIONS = ['Somaliland', 'Somalia', 'Puntland', 'Ethiopia', 'Banaadir'];

export default function TheArenaPage() {
  const router = useRouter();

  // --- Core State ---
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"solo" | "challenge">("solo");

  // --- Global Battle Filters ---
  const [battleGrade, setBattleGrade] = useState("");
  const [battleRegion, setBattleRegion] = useState("");

  // --- Auth & Profile Check ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        router.push("/auth");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", authUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            uid: authUser.uid,
            name: data.displayName?.split(" ")[0] || "Challenger",
            isPremium: data.isPremium || data.pro || false,
            activeChallengeId: data.activeChallengeId,
            grade: data.grade || "Form 4",
            region: data.region || "Somaliland",
          });
          
          // Auto-set the filters to the user's profile settings
          setBattleGrade(data.grade || "Form 4");
          setBattleRegion(data.region || "Somaliland");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
          <div className="w-16 h-16 bg-slate-900 border-2 border-indigo-500/50 rounded-2xl flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <Swords className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
        <p className="text-indigo-400 font-bold tracking-widest uppercase text-sm animate-pulse mt-4">Entering The Arena...</p>
      </div>
    );
  }

  if (!user?.isPremium) {
    return <PremiumLockedView router={router} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] opacity-20 transition-colors duration-1000 ${activeTab === 'solo' ? 'bg-indigo-600' : 'bg-rose-600'}`}></div>
      </div>

      {/* Header & Tabs */}
      <header className="relative z-10 pt-10 pb-6 px-4 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1"></div>
            <h1 className="text-4xl font-black text-white text-center tracking-tighter mx-6 shadow-black drop-shadow-md">
              THE ARENA
            </h1>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1"></div>
          </div>
          
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("solo")}
              className={`flex-1 flex items-center justify-center py-3.5 px-4 rounded-xl font-bold transition-all duration-300 ${
                activeTab === "solo" 
                  ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-500/50" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
            >
              <Brain className="w-5 h-5 mr-2" /> Solo Mission
            </button>
            <button
              onClick={() => setActiveTab("challenge")}
              className={`flex-1 flex items-center justify-center py-3.5 px-4 rounded-xl font-bold transition-all duration-300 ${
                activeTab === "challenge" 
                  ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-500/50" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
            >
              <Swords className="w-5 h-5 mr-2" /> Head-to-Head
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 mt-4 relative z-10">
        {activeTab === "solo" ? (
          <SoloMissionFlow 
            router={router} 
            battleGrade={battleGrade} setBattleGrade={setBattleGrade}
            battleRegion={battleRegion} setBattleRegion={setBattleRegion}
          />
        ) : (
          <ChallengeFlow 
            user={user} router={router} 
            battleGrade={battleGrade} setBattleGrade={setBattleGrade}
            battleRegion={battleRegion} setBattleRegion={setBattleRegion}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// 1. PREMIUM LOCKED VIEW (Gatekeeper)
// ============================================================================
function PremiumLockedView({ router }: { router: any }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5 shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)]">
          <Lock className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Arena Locked</h2>
        <p className="text-slate-400 font-medium leading-relaxed mb-8">
          Upgrade to <strong className="text-indigo-400">Pro</strong> to challenge other students in real-time battles and unlock unlimited solo missions.
        </p>
        <button 
          onClick={() => router.push("/subscription")}
          className="w-full py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-2xl font-black text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center active:scale-[0.98]"
        >
          <Star className="w-5 h-5 mr-2 fill-slate-900" /> Unlock The Arena
        </button>
        <button 
          onClick={() => router.back()}
          className="w-full mt-4 py-3 text-slate-500 font-bold hover:text-white transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 2. SOLO MISSION FLOW
// ============================================================================
function SoloMissionFlow({ router, battleGrade, setBattleGrade, battleRegion, setBattleRegion }: any) {
  const [step, setStep] = useState<"lobby" | "subjects" | "quizzes">("lobby");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSubjects = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "subjects"), where("grade", "==", battleGrade), where("region", "==", battleRegion));
      const snap = await getDocs(q);
      setSubjects(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
      setStep("subjects");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuizzes = async (subject: Subject) => {
    setIsLoading(true);
    setSelectedSubject(subject);
    try {
      const q = query(collection(db, "quizzes"), where("subjectId", "==", subject.id));
      const snap = await getDocs(q);
      setQuizzes(snap.docs.map(d => ({ id: d.id, title: d.data().title, questionCount: d.data().questionCount || 10 })));
      setStep("quizzes");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center py-32 text-indigo-400 font-bold tracking-widest uppercase animate-pulse">Initializing Data...</div>;

  if (step === "lobby") {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
        
        {/* Battle Config Card */}
        <div className="w-full bg-slate-900/50 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl mb-8">
          <div className="flex items-center justify-center mb-6">
            <Settings2 className="w-5 h-5 text-indigo-400 mr-2" />
            <h3 className="text-lg font-black text-white tracking-widest uppercase">Battle Parameters</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative group">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 group-focus-within:text-indigo-300 transition-colors" />
              <select 
                value={battleGrade} onChange={(e) => setBattleGrade(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-white appearance-none cursor-pointer hover:border-indigo-500/50 transition-all"
              >
                {GRADE_LEVELS.map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
              </select>
            </div>
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 group-focus-within:text-indigo-300 transition-colors" />
              <select 
                value={battleRegion} onChange={(e) => setBattleRegion(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-white appearance-none cursor-pointer hover:border-indigo-500/50 transition-all"
              >
                {REGIONS.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        <Brain className="w-20 h-20 text-indigo-500 mx-auto mb-6 opacity-80 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Sharpen Your Mind</h2>
        <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium text-center">
          Test your knowledge and master every subject at your own pace without the pressure of an opponent.
        </p>
        <button 
          onClick={loadSubjects}
          className="w-full max-w-sm mx-auto py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all active:scale-[0.98]"
        >
          Initialize Mission
        </button>
      </div>
    );
  }

  if (step === "subjects") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
        <button onClick={() => setStep("lobby")} className="mb-6 flex items-center text-slate-400 hover:text-white font-bold transition-colors px-4 py-2 bg-slate-900/50 rounded-xl border border-white/5 w-max">
          <ArrowLeft className="w-4 h-4 mr-2"/> Change Parameters
        </button>
        <h2 className="text-2xl font-black text-white mb-6 flex items-center">
          <div className="w-2 h-8 bg-indigo-500 rounded-full mr-3"></div> Select Subject
        </h2>
        {subjects.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-[2rem] border border-white/5">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">No subjects found for {battleGrade} in {battleRegion}.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {subjects.map(s => (
              <button key={s.id} onClick={() => loadQuizzes(s)} className="bg-slate-900/80 backdrop-blur-md border border-white/5 p-6 rounded-[1.5rem] flex items-center justify-between hover:bg-slate-800 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all group text-left">
                <span className="font-bold text-xl text-slate-300 group-hover:text-white transition-colors">{s.name}</span>
                <div className="w-10 h-10 bg-slate-950 rounded-full flex items-center justify-center border border-white/5 group-hover:border-indigo-500/50 transition-colors">
                  <ChevronRight className="text-slate-500 group-hover:text-indigo-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "quizzes") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
        <button onClick={() => setStep("subjects")} className="mb-6 flex items-center text-slate-400 hover:text-white font-bold transition-colors px-4 py-2 bg-slate-900/50 rounded-xl border border-white/5 w-max">
          <ArrowLeft className="w-4 h-4 mr-2"/> Back to Subjects
        </button>
        <h2 className="text-2xl font-black text-white mb-6 flex items-center">
          <div className="w-2 h-8 bg-indigo-500 rounded-full mr-3"></div> {selectedSubject?.name} Missions
        </h2>
        {quizzes.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-[2rem] border border-white/5">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">No missions available for this subject yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map(q => (
              <button 
                key={q.id} onClick={() => router.push(`/quizzes/${q.id}`)} 
                className="bg-slate-900/80 backdrop-blur-md border border-white/5 p-5 md:p-6 rounded-[1.5rem] flex items-center hover:bg-slate-800 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all group text-left"
              >
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mr-5 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:border-indigo-400 transition-colors shrink-0">
                  <Gamepad2 className="w-7 h-7 text-indigo-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-200 text-lg md:text-xl truncate group-hover:text-white transition-colors mb-1">{q.title}</h3>
                  <p className="text-sm text-indigo-400 font-bold tracking-widest uppercase">{q.questionCount} Questions</p>
                </div>
                <div className="w-10 h-10 bg-slate-950 rounded-full flex items-center justify-center border border-white/5 group-hover:border-indigo-500/50 transition-colors ml-4 shrink-0">
                  <ChevronRight className="text-slate-500 group-hover:text-indigo-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ============================================================================
// 3. HEAD-TO-HEAD FLOW
// ============================================================================
function ChallengeFlow({ user, router, battleGrade, setBattleGrade, battleRegion, setBattleRegion }: any) {
  const [step, setStep] = useState<"lobby" | "subjects" | "searching" | "timeout">("lobby");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const startMatchmakingFlow = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "subjects"), where("grade", "==", battleGrade), where("region", "==", battleRegion));
      const snap = await getDocs(q);
      setSubjects(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
      setStep("subjects");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const enterMatchmakingPool = async (subjectId: string) => {
    setStep("searching");
    try {
      await setDoc(doc(db, "matchmaking_pool", user.uid), {
        subjectId,
        grade: battleGrade,
        region: battleRegion,
        userName: user.name,
        timestamp: serverTimestamp(),
      });

      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const activeChallengeId = docSnap.data().activeChallengeId;
          if (activeChallengeId) {
            unsubscribe();
            router.push(`/arena/match/${activeChallengeId}`);
          }
        }
      });

      setTimeout(async () => {
        unsubscribe();
        setStep("timeout");
        await deleteDoc(doc(db, "matchmaking_pool", user.uid)).catch(()=>{});
      }, 60000);

    } catch (e) {
      console.error("Matchmaking error:", e);
      setStep("lobby");
    }
  };

  const cancelSearch = async () => {
    setStep("lobby");
    await deleteDoc(doc(db, "matchmaking_pool", user.uid)).catch(()=>{});
  };

  if (isLoading) return <div className="text-center py-32 text-rose-400 font-bold tracking-widest uppercase animate-pulse">Initializing Data...</div>;

  if (step === "lobby") {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
        
        {/* Battle Config Card */}
        <div className="w-full bg-slate-900/50 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl mb-8">
          <div className="flex items-center justify-center mb-6">
            <Settings2 className="w-5 h-5 text-rose-400 mr-2" />
            <h3 className="text-lg font-black text-white tracking-widest uppercase">Matchmaking Rules</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative group">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500 group-focus-within:text-rose-300 transition-colors" />
              <select 
                value={battleGrade} onChange={(e) => setBattleGrade(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-white appearance-none cursor-pointer hover:border-rose-500/50 transition-all"
              >
                {GRADE_LEVELS.map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
              </select>
            </div>
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500 group-focus-within:text-rose-300 transition-colors" />
              <select 
                value={battleRegion} onChange={(e) => setBattleRegion(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-white appearance-none cursor-pointer hover:border-rose-500/50 transition-all"
              >
                {REGIONS.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        <Swords className="w-20 h-20 text-rose-500 mx-auto mb-6 opacity-80 drop-shadow-[0_0_15px_rgba(225,29,72,0.5)]" />
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Challenge a Rival</h2>
        <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium text-center">
          Go head-to-head with another student in a real-time battle of wits and speed.
        </p>
        <button 
          onClick={startMatchmakingFlow}
          className="w-full max-w-sm mx-auto py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all active:scale-[0.98]"
        >
          Find Opponent
        </button>
      </div>
    );
  }

  if (step === "subjects") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
        <button onClick={() => setStep("lobby")} className="mb-6 flex items-center text-slate-400 hover:text-white font-bold transition-colors px-4 py-2 bg-slate-900/50 rounded-xl border border-white/5 w-max">
          <ArrowLeft className="w-4 h-4 mr-2"/> Change Rules
        </button>
        <h2 className="text-2xl font-black text-white mb-6 flex items-center">
          <div className="w-2 h-8 bg-rose-500 rounded-full mr-3"></div> Select Arena
        </h2>
        {subjects.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-[2rem] border border-white/5">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">No subjects found for {battleGrade} in {battleRegion}.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <button 
              onClick={() => enterMatchmakingPool("any")}
              className="bg-gradient-to-r from-rose-600 to-orange-600 p-6 md:p-8 rounded-[1.5rem] flex items-center justify-between hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(225,29,72,0.3)] text-left group border border-rose-400/50"
            >
              <div>
                <span className="font-black text-2xl text-white block mb-1">Surprise Me!</span>
                <span className="text-rose-200 font-bold text-sm uppercase tracking-widest">Any Subject Match</span>
              </div>
              <Swords className="w-8 h-8 text-white opacity-80 group-hover:rotate-12 transition-transform" />
            </button>

            {subjects.map(s => (
              <button key={s.id} onClick={() => enterMatchmakingPool(s.id)} className="bg-slate-900/80 backdrop-blur-md border border-white/5 p-6 rounded-[1.5rem] flex items-center justify-between hover:bg-slate-800 hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(225,29,72,0.15)] transition-all group text-left">
                <span className="font-bold text-xl text-slate-300 group-hover:text-white transition-colors">{s.name}</span>
                <div className="w-10 h-10 bg-slate-950 rounded-full flex items-center justify-center border border-white/5 group-hover:border-rose-500/50 transition-colors">
                  <ChevronRight className="text-slate-500 group-hover:text-rose-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "searching") {
    return (
      <div className="text-center py-20 animate-in fade-in zoom-in-95 duration-700">
        <div className="relative w-40 h-40 mx-auto mb-12">
          <div className="absolute inset-0 bg-rose-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30"></div>
          <div className="absolute inset-4 bg-rose-600 rounded-full animate-pulse opacity-50"></div>
          <div className="absolute inset-8 bg-slate-900 border-2 border-rose-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.6)]">
            <Search className="w-10 h-10 text-rose-400 animate-pulse" />
          </div>
        </div>
        
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Locating Challenger</h2>
        <p className="text-slate-400 font-medium mb-12 max-w-xs mx-auto">Scanning the network for an opponent in {battleGrade}.</p>
        
        <button 
          onClick={cancelSearch}
          className="px-10 py-4 bg-slate-900 text-slate-300 rounded-2xl font-bold text-lg hover:bg-slate-800 hover:text-white transition-colors border border-white/5 shadow-xl"
        >
          Cancel Search
        </button>
      </div>
    );
  }

  if (step === "timeout") {
    return (
      <div className="text-center py-20 animate-in fade-in zoom-in-95 duration-500 bg-slate-900/50 rounded-[2.5rem] border border-white/5 backdrop-blur-md px-6">
        <div className="w-24 h-24 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Clock className="w-10 h-10 text-slate-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Arena is Empty</h2>
        <p className="text-slate-400 font-medium mb-10 max-w-sm mx-auto leading-relaxed">
          No challengers found for {battleGrade} right now. Try a different grade or complete a Solo Mission while you wait.
        </p>
        <div className="space-y-4 max-w-xs mx-auto">
          <button onClick={() => setStep("subjects")} className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-lg shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all">Scan Again</button>
          <button onClick={() => setStep("lobby")} className="w-full py-4 bg-slate-900 text-slate-300 rounded-2xl font-bold border border-white/5 hover:bg-slate-800 hover:text-white transition-all">Change Parameters</button>
        </div>
      </div>
    );
  }

  return null;
}