"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  RotateCcw, 
  ChevronRight,
  AlertCircle,
  Lock,
  Phone,
  User,
  ChevronLeft
} from "lucide-react";

// --- Interfaces ---
interface Quiz {
  id: string;
  title: string;
  subjectId: string;
}

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export default function QuizGamePage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  // --- Auth & Security State ---
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  // --- Quiz Data State ---
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // --- Game Mechanics State ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Paywall Form State ---
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // ==========================================
  // AUTH, SECURITY, AND DATA FETCHING
  // ==========================================
  useEffect(() => {
    if (!quizId) return;

    // The function to fetch the actual quiz data
    const fetchQuizAndQuestions = async () => {
      try {
        // 1. Fetch Main Quiz Document
        const quizRef = doc(db, "quizzes", quizId);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {
          setError("Quiz not found.");
          setIsLoading(false);
          return;
        }

        setQuiz({
          id: quizSnap.id,
          title: quizSnap.data().title || "Untitled Quiz",
          subjectId: quizSnap.data().subjectId || "",
        });

        // 2. Fetch Questions Subcollection
        const questionsRef = collection(db, "quizzes", quizId, "questions");
        const questionsSnap = await getDocs(questionsRef);

        if (questionsSnap.empty) {
          setError("This quiz has no questions yet.");
          setIsLoading(false);
          return;
        }

        const fetchedQuestions: Question[] = questionsSnap.docs.map(d => ({
          id: d.id,
          questionText: d.data().questionText || "",
          options: d.data().options || [],
          correctAnswerIndex: d.data().correctAnswerIndex ?? 0,
        }));

        setQuestions(fetchedQuestions);
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError("Failed to load the quiz. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    // The Gatekeeper: Check Auth and Premium Status First
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        // Check if user is premium
        if (userDocSnap.exists() && (userDocSnap.data().isPremium || userDocSnap.data().pro)) {
          setIsPremium(true);
          await fetchQuizAndQuestions(); // Only fetch quiz if they are authorized
        } else {
          setIsPremium(false);
          setIsLoading(false); // Stop loading to immediately show paywall
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setError("Failed to verify account status.");
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [quizId, router]);

  // ==========================================
  // GAME HANDLERS
  // ==========================================
  const handleOptionSelect = (index: number) => {
    if (isAnswered) return; 
    
    setSelectedOption(index);
    setIsAnswered(true);

    if (index === questions[currentIndex].correctAnswerIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  // ==========================================
  // PAYWALL HANDLERS
  // ==========================================
  const dialUSSD = (ussdCode: string) => {
    const encodedUssd = ussdCode.replace(/#/g, "%23");
    window.open(`tel:${encodedUssd}`, "_self");
  };

  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPay(true);

    const user = auth.currentUser;
    const userEmail = user?.email || "Email lama hayo";
    const message = `*XAQIIJINTA LACAG BIXINTA*\n\n*Emailka ardayga:* ${userEmail}\n*Magaca:* ${name}\n*Lacagta:* 43,000 SLShs ah\n*Lambarka laga soo diray:* ${phone}\n*Isagoo doonaya inuu galo Quiz:* ${quizId}`;
    
    const whatsappUrl = `https://wa.me/252633227084?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    
    setTimeout(() => {
      setIsSubmittingPay(false);
      router.push("/dashboard"); 
    }, 1500);
  };


  // ==========================================
  // VIEW: LOADING
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Loading Quiz Engine...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW: ERROR STATE
  // ==========================================
  if (error || (isPremium && !quiz)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-800 mb-2">Error Loading Quiz</h2>
        <p className="text-slate-600 font-medium mb-6">{error}</p>
        <button onClick={() => router.back()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg">
          Go Back
        </button>
      </div>
    );
  }

  // ==========================================
  // VIEW: PAYWALL (If Free User)
  // ==========================================
  if (isPremium === false) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
          {!showConfirmForm ? (
            <div className="p-8">
              <button onClick={() => router.back()} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                <XCircle className="w-6 h-6 text-slate-500" />
              </button>

              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-100">
                <Lock className="w-10 h-10 text-amber-500" />
              </div>
              
              <h2 className="text-3xl font-black text-center text-slate-800 mb-2">Pro Access Required</h2>
              <p className="text-center text-slate-500 font-medium mb-8 leading-relaxed px-4">
                Si aad u gasho imtixaankan iyo agabkan kale oo dhamaystiran, fadlan bixi lacag dhan <strong className="text-slate-800">$4 (43,000 SLShs)</strong>.
              </p>

              <div className="space-y-3 mb-6">
                <button onClick={() => dialUSSD("*220*0633227084*43000#")} className="w-full flex items-center justify-center py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-emerald-500/20">
                  <Phone className="w-5 h-5 mr-2" /> Ku Bixi ZAAD
                </button>
                <button onClick={() => dialUSSD("*220*0653227084*43000#")} className="w-full flex items-center justify-center py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-amber-500/20">
                  <Phone className="w-5 h-5 mr-2" /> Ku Bixi E-DAHAB
                </button>
              </div>

              <button onClick={() => setShowConfirmForm(true)} className="w-full py-4 text-blue-600 font-bold hover:bg-blue-50 rounded-2xl transition-colors">
                Waan Bixiyay Lacagta
              </button>
            </div>
          ) : (
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => setShowConfirmForm(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h2 className="text-xl font-black text-slate-800">Xaqiiji Lacagta</h2>
                <div className="w-9"></div>
              </div>

              <p className="text-slate-500 font-medium mb-6">
                Fadlan geli xogta saxda ah si aan kuugu furno akoonkaaga isla markaana aad u gasho quizkan.
              </p>

              <form onSubmit={handleWhatsAppSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Lambarka aad ka dirtay</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tusaale: 063XXXXXXX" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Magacaaga oo saddexan</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Geli magacaaga" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmittingPay} className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center disabled:opacity-70">
                  {isSubmittingPay ? (
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

  // Calculate Progress UI variables
  const currentQuestion = questions[currentIndex];
  const progressPercentage = ((currentIndex + 1) / questions.length) * 100;
  const circleRadius = 24;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (progressPercentage / 100) * circleCircumference;

  // ==========================================
  // VIEW: QUIZ FINISHED (RESULTS)
  // ==========================================
  if (isFinished && quiz) {
    const scorePercentage = Math.round((score / questions.length) * 100);
    const isPassing = scorePercentage >= 50;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-[40px] shadow-xl p-8 md:p-12 max-w-lg w-full text-center border border-slate-100 animate-in zoom-in-95 duration-500">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner ${isPassing ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
            {isPassing ? "Great Job!" : "Keep Practicing!"}
          </h2>
          <p className="text-slate-500 mb-8 font-medium">You completed: {quiz.title}</p>
          
          <div className="bg-slate-50 rounded-3xl p-8 mb-8 border border-slate-100">
            <div className={`text-6xl font-black mb-2 tracking-tighter ${isPassing ? 'text-green-600' : 'text-red-600'}`}>{scorePercentage}%</div>
            <p className="text-slate-600 font-bold text-lg uppercase tracking-wider">
              {score} out of {questions.length} correct
            </p>
          </div>

          <div className="space-y-4">
            <button onClick={handleRestart} className="w-full flex items-center justify-center py-5 px-6 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-colors shadow-xl shadow-slate-900/20 active:scale-[0.98]">
              <RotateCcw className="w-5 h-5 mr-2" /> Play Again
            </button>
            <button onClick={() => router.push(`/subjects/${quiz.subjectId}`)} className="w-full py-5 px-6 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-lg hover:bg-slate-50 transition-colors active:scale-[0.98]">
              Back to Subject
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: ACTIVE QUESTION
  // ==========================================
  if (!quiz || !currentQuestion) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 font-sans">
      
      {/* Quiz Header & Progress */}
      <header className="bg-white px-4 py-4 sm:px-6 shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-100">
        <button onClick={() => router.push(`/subjects/${quiz.subjectId}`)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <h1 className="font-bold text-slate-800 truncate px-4 max-w-[200px] sm:max-w-md text-center">
          {quiz.title}
        </h1>

        {/* Circular Progress Indicator */}
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0 bg-slate-50 rounded-full shadow-inner border border-slate-100">
          <svg className="transform -rotate-90 w-14 h-14">
            <circle cx="28" cy="28" r={circleRadius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-200" />
            <circle
              cx="28" cy="28" r={circleRadius}
              stroke="currentColor" strokeWidth="4" fill="transparent"
              strokeDasharray={circleCircumference} strokeDashoffset={strokeDashoffset}
              className="text-blue-600 transition-all duration-700 ease-out"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-700">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col animate-in slide-in-from-right-8 duration-500">
        
        {/* Question Box */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-slate-200 mb-8 relative">
          <div className="absolute -top-4 left-8 bg-blue-600 text-white font-black text-xs uppercase tracking-widest px-4 py-1.5 rounded-full border-4 border-slate-50 shadow-sm">
            Question {currentIndex + 1}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-snug mt-2">
            {currentQuestion.questionText}
          </h2>
        </div>

        {/* Options List */}
        <div className="space-y-4 flex-1">
          {currentQuestion.options.map((option, index) => {
            let optionStyles = "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md";
            let Icon = null;

            if (isAnswered) {
              if (index === currentQuestion.correctAnswerIndex) {
                // Correct Answer
                optionStyles = "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md ring-1 ring-emerald-500 scale-[1.02] z-10";
                Icon = <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
              } else if (index === selectedOption) {
                // Wrong Answer
                optionStyles = "bg-red-50 border-red-500 text-red-800 shadow-md ring-1 ring-red-500";
                Icon = <XCircle className="w-6 h-6 text-red-600" />;
              } else {
                // Unselected 
                optionStyles = "bg-white border-slate-100 text-slate-400 opacity-50 scale-[0.98]";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isAnswered}
                className={`w-full text-left p-5 md:p-6 rounded-[24px] border-2 transition-all duration-300 font-bold text-lg flex items-center justify-between group ${optionStyles}`}
              >
                <div className="flex items-center flex-1 pr-4">
                  {/* Option Letter Indicator */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm mr-4 transition-colors shrink-0 ${isAnswered ? 'opacity-0 hidden' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span>{option}</span>
                </div>
                {Icon && <span className="shrink-0 animate-in zoom-in">{Icon}</span>}
              </button>
            );
          })}
        </div>

        {/* Next Button Overlay */}
        {isAnswered && (
          <div className="mt-8 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 sticky bottom-6 z-40">
            <button
              onClick={handleNextQuestion}
              className="w-full flex items-center justify-center py-5 px-6 bg-slate-900 text-white rounded-[20px] font-black text-xl hover:bg-black hover:-translate-y-1 transition-all shadow-2xl shadow-slate-900/30 active:scale-[0.98]"
            >
              {currentIndex < questions.length - 1 ? "Next Question" : "See Final Results"}
              <ChevronRight className="w-6 h-6 ml-2" />
            </button>
          </div>
        )}
        
      </main>
    </div>
  );
}