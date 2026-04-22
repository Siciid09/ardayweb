"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, getDoc, collection, getDocs, query, where, 
  setDoc, deleteDoc, onSnapshot, serverTimestamp, updateDoc 
} from "firebase/firestore";
import { 
  Brain, Shield, Lock, Star, Swords, ChevronRight, 
  Search, X, Trophy, Clock, AlertCircle, Gamepad2, ArrowLeft
} from "lucide-react";

// --- Interfaces ---
interface UserData {
  uid: string;
  name: string;
  isPremium: boolean;
  activeChallengeId?: string;
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

export default function TheArenaPage() {
  const router = useRouter();

  // --- Core State ---
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"solo" | "challenge">("solo");

  // --- Auth & Premium Check ---
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
          });
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
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-indigo-400 font-bold animate-pulse">Entering The Arena...</p>
      </div>
    );
  }

  if (!user?.isPremium) {
    return <PremiumLockedView router={router} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-indigo-500">
      
      {/* Header & Tabs */}
      <header className="bg-slate-900 border-b border-slate-800 pt-10 pb-6 px-4 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black text-white text-center mb-6 tracking-tight">
            THE ARENA
          </h1>
          
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab("solo")}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl font-bold transition-all ${
                activeTab === "solo" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Brain className="w-5 h-5 mr-2" /> Solo Mission
            </button>
            <button
              onClick={() => setActiveTab("challenge")}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl font-bold transition-all ${
                activeTab === "challenge" 
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Swords className="w-5 h-5 mr-2" /> Head-to-Head
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 mt-4">
        {activeTab === "solo" ? (
          <SoloMissionFlow router={router} />
        ) : (
          <ChallengeFlow user={user} router={router} />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// 1. PREMIUM LOCKED VIEW
// ============================================================================
function PremiumLockedView({ router }: { router: any }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 md:p-12 max-w-md w-full relative z-10 shadow-2xl">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-inner">
          <Lock className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3">Premium Access</h2>
        <p className="text-slate-400 font-medium leading-relaxed mb-8">
          Upgrade to Pro to challenge other students in real-time battles and unlock unlimited solo missions.
        </p>
        <button 
          onClick={() => router.push("/subscription")}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center"
        >
          <Star className="w-5 h-5 mr-2 fill-white" /> Upgrade to Pro
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
// 2. SOLO MISSION FLOW (Lobby -> Subject -> Quizzes)
// ============================================================================
function SoloMissionFlow({ router }: { router: any }) {
  const [step, setStep] = useState<"lobby" | "subjects" | "quizzes">("lobby");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSubjects = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "subjects"));
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
      setQuizzes(snap.docs.map(d => ({ 
        id: d.id, 
        title: d.data().title, 
        questionCount: d.data().questionCount || 10 
      })));
      setStep("quizzes");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center py-20 text-indigo-400 font-bold animate-pulse">Loading data...</div>;

  if (step === "lobby") {
    return (
      <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
        <Brain className="w-24 h-24 text-indigo-500 mx-auto mb-6 opacity-90" />
        <h2 className="text-3xl font-black text-white mb-4">Sharpen Your Mind</h2>
        <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium">
          Test your knowledge and master every subject at your own pace without the pressure of an opponent.
        </p>
        <button 
          onClick={loadSubjects}
          className="w-full max-w-xs mx-auto py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/20 transition-all"
        >
          Start a Quiz
        </button>
      </div>
    );
  }

  if (step === "subjects") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <button onClick={() => setStep("lobby")} className="mb-6 flex items-center text-slate-400 hover:text-white font-bold"><ArrowLeft className="w-4 h-4 mr-2"/> Back</button>
        <h2 className="text-xl font-bold text-white mb-6">Select a Subject</h2>
        <div className="grid gap-4">
          {subjects.map(s => (
            <button key={s.id} onClick={() => loadQuizzes(s)} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between hover:bg-slate-800 hover:border-indigo-500/50 transition-all group text-left">
              <span className="font-bold text-lg text-slate-200 group-hover:text-white">{s.name}</span>
              <ChevronRight className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "quizzes") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <button onClick={() => setStep("subjects")} className="mb-6 flex items-center text-slate-400 hover:text-white font-bold"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Subjects</button>
        <h2 className="text-xl font-bold text-white mb-6">{selectedSubject?.name} Quizzes</h2>
        {quizzes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">No quizzes available for this subject yet.</div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map(q => (
              <button 
                key={q.id} 
                onClick={() => router.push(`/quizzes/${q.id}`)} // Routes to the game engine we built earlier!
                className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center hover:bg-slate-800 hover:border-indigo-500/50 transition-all group text-left"
              >
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mr-4">
                  <Gamepad2 className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg">{q.title}</h3>
                  <p className="text-sm text-slate-500 font-medium">{q.questionCount} Questions</p>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
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
// 3. HEAD-TO-HEAD FLOW (Matchmaking Engine)
// ============================================================================
function ChallengeFlow({ user, router }: { user: UserData, router: any }) {
  const [step, setStep] = useState<"lobby" | "subjects" | "searching" | "timeout">("lobby");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load Subjects for Matchmaking
  const startMatchmakingFlow = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "subjects"));
      setSubjects(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
      setStep("subjects");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // The Magic Matchmaking Logic
  const enterMatchmakingPool = async (subjectId: string) => {
    setStep("searching");
    try {
      // 1. Put user in the pool
      await setDoc(doc(db, "matchmaking_pool", user.uid), {
        subjectId,
        userName: user.name,
        timestamp: serverTimestamp(),
      });

      // 2. Listen to their user document for an opponent to accept them
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const activeChallengeId = docSnap.data().activeChallengeId;
          if (activeChallengeId) {
            // Found a match! Clean up and redirect to the actual battle view
            unsubscribe();
            router.push(`/arena/match/${activeChallengeId}`);
          }
        }
      });

      // 3. Timeout after 60 seconds (for web UX, 6 minutes is too long to wait staring at a screen)
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

  if (isLoading) return <div className="text-center py-20 text-rose-400 font-bold animate-pulse">Loading Arena...</div>;

  if (step === "lobby") {
    return (
      <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
        <Swords className="w-24 h-24 text-rose-500 mx-auto mb-6 opacity-90" />
        <h2 className="text-3xl font-black text-white mb-4">Challenge a Rival</h2>
        <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium">
          Go head-to-head with another student in a real-time battle of wits and speed.
        </p>
        <button 
          onClick={startMatchmakingFlow}
          className="w-full max-w-xs mx-auto py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-rose-600/20 transition-all"
        >
          Find an Opponent
        </button>
      </div>
    );
  }

  if (step === "subjects") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <button onClick={() => setStep("lobby")} className="mb-6 flex items-center text-slate-400 hover:text-white font-bold"><ArrowLeft className="w-4 h-4 mr-2"/> Back</button>
        <h2 className="text-xl font-bold text-white mb-6">Select Battle Subject</h2>
        <div className="grid gap-4">
          <button 
            onClick={() => enterMatchmakingPool("any")}
            className="bg-gradient-to-r from-rose-600 to-orange-600 p-5 rounded-2xl flex items-center justify-between hover:scale-[1.02] transition-transform shadow-lg shadow-rose-600/20 text-left"
          >
            <span className="font-black text-xl text-white">Surprise Me! (Any Subject)</span>
          </button>

          {subjects.map(s => (
            <button key={s.id} onClick={() => enterMatchmakingPool(s.id)} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between hover:bg-slate-800 hover:border-rose-500/50 transition-all group text-left">
              <span className="font-bold text-lg text-slate-200 group-hover:text-white">{s.name}</span>
              <ChevronRight className="text-slate-600 group-hover:text-rose-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "searching") {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <div className="relative w-32 h-32 mx-auto mb-10">
          <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-2 bg-rose-500 rounded-full animate-pulse opacity-40"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-12 h-12 text-rose-500" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Awaiting Challenger...</h2>
        <p className="text-slate-500 font-medium mb-10">Matching you with a worthy opponent.</p>
        
        <button 
          onClick={cancelSearch}
          className="px-8 py-3 bg-slate-900 text-slate-300 rounded-xl font-bold hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
        >
          Cancel Search
        </button>
      </div>
    );
  }

  if (step === "timeout") {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <Clock className="w-20 h-20 text-slate-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">No Opponents Found</h2>
        <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto">
          We couldn't find a match for you right now. The arena is quiet.
        </p>
        <div className="space-y-3 max-w-xs mx-auto">
          <button onClick={() => setStep("subjects")} className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold">Try Again</button>
          <button onClick={() => setStep("lobby")} className="w-full py-3 bg-slate-900 text-slate-300 rounded-xl font-bold border border-slate-800">Exit Matchmaking</button>
        </div>
      </div>
    );
  }

  return null;
}