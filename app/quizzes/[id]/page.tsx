"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; // Adjust path to your firebase config
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  RotateCcw, 
  ChevronRight,
  AlertCircle
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

  // --- State ---
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Game State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Data Fetching ---
  useEffect(() => {
    if (!quizId) return;

    const fetchQuizAndQuestions = async () => {
      try {
        setIsLoading(true);

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

        const fetchedQuestions: Question[] = questionsSnap.docs.map(doc => ({
          id: doc.id,
          questionText: doc.data().questionText || "",
          options: doc.data().options || [],
          correctAnswerIndex: doc.data().correctAnswerIndex ?? 0,
        }));

        setQuestions(fetchedQuestions);
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError("Failed to load the quiz. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizAndQuestions();
  }, [quizId]);

  // --- Handlers ---
  const handleOptionSelect = (index: number) => {
    if (isAnswered) return; // Prevent changing answer
    
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

  // --- UI Components ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading questions...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Error</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <button 
          onClick={() => router.back()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercentage = ((currentIndex + 1) / questions.length) * 100;
  
  // Calculate SVG Circle values for the progress ring
  const circleRadius = 24;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (progressPercentage / 100) * circleCircumference;

  // --- Screen 1: Quiz Finished (Results) ---
  if (isFinished) {
    const scorePercentage = Math.round((score / questions.length) * 100);
    const isPassing = scorePercentage >= 50;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-[40px] shadow-xl p-8 md:p-12 max-w-lg w-full text-center border border-slate-100">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner ${isPassing ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
            {isPassing ? "Great Job!" : "Keep Practicing!"}
          </h2>
          <p className="text-slate-500 mb-8 font-medium">You completed: {quiz.title}</p>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
            <div className="text-5xl font-black text-blue-600 mb-2">{scorePercentage}%</div>
            <p className="text-slate-600 font-bold text-lg">
              {score} out of {questions.length} correct
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleRestart}
              className="w-full flex items-center justify-center py-4 px-6 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
            >
              <RotateCcw className="w-5 h-5 mr-2" /> Play Again
            </button>
            <button 
              onClick={() => router.push(`/subjects/${quiz.subjectId}`)}
              className="w-full py-4 px-6 bg-slate-100 text-slate-700 rounded-xl font-bold text-lg hover:bg-slate-200 transition-colors"
            >
              Back to Subject
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Screen 2: Active Question ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      
      {/* Quiz Header & Progress */}
      <header className="bg-white px-4 py-4 sm:px-6 shadow-sm sticky top-0 z-10 flex items-center justify-between border-b border-slate-100">
        <button 
          onClick={() => router.push(`/subjects/${quiz.subjectId}`)}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <h1 className="font-bold text-slate-800 truncate px-4 max-w-[200px] sm:max-w-md text-center">
          {quiz.title}
        </h1>

        {/* Circular Progress Indicator */}
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg className="transform -rotate-90 w-14 h-14">
            {/* Background Circle */}
            <circle cx="28" cy="28" r={circleRadius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
            {/* Progress Circle */}
            <circle
              cx="28" cy="28" r={circleRadius}
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
              className="text-blue-600 transition-all duration-500 ease-out"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-700">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col">
        
        {/* Question Text */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 mb-8 relative">
          <div className="absolute -top-4 left-8 bg-blue-100 text-blue-700 font-black text-sm px-4 py-1 rounded-full border-2 border-white shadow-sm">
            QUESTION {currentIndex + 1}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed mt-2">
            {currentQuestion.questionText}
          </h2>
        </div>

        {/* Options List */}
        <div className="space-y-4 flex-1">
          {currentQuestion.options.map((option, index) => {
            // Determine styling based on whether an answer was selected
            let optionStyles = "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50";
            let Icon = null;

            if (isAnswered) {
              if (index === currentQuestion.correctAnswerIndex) {
                // Correct Answer (Always show green)
                optionStyles = "bg-green-50 border-green-500 text-green-800 shadow-md ring-1 ring-green-500";
                Icon = <CheckCircle2 className="w-6 h-6 text-green-600" />;
              } else if (index === selectedOption) {
                // Wrong Answer Selected (Show red)
                optionStyles = "bg-red-50 border-red-500 text-red-800 shadow-md ring-1 ring-red-500";
                Icon = <XCircle className="w-6 h-6 text-red-600" />;
              } else {
                // Unselected Wrong Answers (Fade out)
                optionStyles = "bg-white border-slate-100 text-slate-400 opacity-60";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isAnswered}
                className={`w-full text-left p-5 md:p-6 rounded-2xl border-2 transition-all duration-300 font-medium text-lg flex items-center justify-between ${optionStyles}`}
              >
                <span className="flex-1 pr-4">{option}</span>
                {Icon && <span className="shrink-0">{Icon}</span>}
              </button>
            );
          })}
        </div>

        {/* Next Button Overlay */}
        {isAnswered && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={handleNextQuestion}
              className="w-full flex items-center justify-center py-4 px-6 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-colors shadow-xl"
            >
              {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
              <ChevronRight className="w-6 h-6 ml-2" />
            </button>
          </div>
        )}
        
      </main>
    </div>
  );
}