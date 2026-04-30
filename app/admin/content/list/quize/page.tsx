"use client";

import { useState, Suspense } from "react";
import { PenTool, FileJson, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import QuizManual from "../../../../components/quizemanual";
import QuizAuto from "../../../../components//quizeauto";
export interface SharedQuizData {
  title: string;
  subjectId: string;
  grade: string;
  region: string;
  questions: any[];
}

// ------------------------------------------------------------------
// INNER COMPONENT: Handles all the logic and URL reading
// ------------------------------------------------------------------
function QuizEngineInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id"); // Safely detects if we are editing an old quiz

  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [sharedData, setSharedData] = useState<SharedQuizData | null>(null);

  // When Auto JSON finishes, it sends data here to be reviewed in Manual Mode
  const handleAutoParseComplete = (data: SharedQuizData) => {
    setSharedData(data);
    setMode("manual");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white px-6 py-8 shadow-sm border-b border-slate-100 mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-800">
                {editId ? "Edit Quiz" : "Quiz Creator Engine"}
              </h1>
              <p className="text-slate-500 font-bold tracking-wide">Build, edit, or import assessments.</p>
            </div>
          </div>

          {/* Mode Switcher (Hide if we are editing an existing quiz) */}
          {!editId && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setMode("manual")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  mode === "manual" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <PenTool className="w-5 h-5" /> Manual Builder
              </button>
              <button
                onClick={() => setMode("auto")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  mode === "auto" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <FileJson className="w-5 h-5" /> Smart JSON Upload
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Render Selected Mode */}
      <main className="max-w-5xl mx-auto px-6">
        {mode === "manual" ? (
          <QuizManual initialData={sharedData} editId={editId} />
        ) : (
          <QuizAuto onParseComplete={handleAutoParseComplete} />
        )}
      </main>
    </div>
  );
}

// ------------------------------------------------------------------
// OUTER COMPONENT: The Bulletproof Next.js Suspense Wrapper
// ------------------------------------------------------------------
export default function QuizManagerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center font-bold text-slate-500 animate-pulse">Loading Engine...</div>
      </div>
    }>
      <QuizEngineInner />
    </Suspense>
  );
}