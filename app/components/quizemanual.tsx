"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, writeBatch } from "firebase/firestore";
import { PlusCircle, Trash2, Save, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ManualQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export default function QuizManual() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState<ManualQuestion[]>([
    { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 }
  ]);

  const handleAddQuestion = () => {
    setQuestions([...questions, { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 }]);
  };

  const handleRemoveQuestion = (index: number) => {
    const newQs = [...questions];
    newQs.splice(index, 1);
    setQuestions(newQs);
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQs = [...questions];
    (newQs[index] as any)[field] = value;
    setQuestions(newQs);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const newQs = [...questions];
    newQs[qIndex].options[optIndex] = value;
    setQuestions(newQs);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId || questions.length === 0) return alert("Fill all fields and add at least 1 question.");
    
    setIsSaving(true);
    try {
      // 1. Create Parent Quiz Document
      const quizRef = await addDoc(collection(db, "quizzes"), {
        title,
        subjectId,
        createdAt: new Date(),
      });

      // 2. Batch write all questions into the subcollection
      const batch = writeBatch(db);
      questions.forEach((q) => {
        const qRef = doc(collection(db, "quizzes", quizRef.id, "questions"));
        batch.set(qRef, {
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
        });
      });

      await batch.commit();
      alert("Quiz successfully created!");
      router.push(`/admin/content/list/quize`);
    } catch (err) {
      console.error(err);
      alert("Failed to save quiz.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Meta Data */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 mb-6">Quiz Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Quiz Title</label>
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midterm Mathematics" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Subject ID</label>
            <input required type="text" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="e.g. math-101" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
          </div>
        </div>
      </div>

      {/* Dynamic Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 relative">
            
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h3 className="font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">Question {qIndex + 1}</h3>
              {questions.length > 1 && (
                <button type="button" onClick={() => handleRemoveQuestion(qIndex)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <textarea required rows={2} value={q.questionText} onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)} placeholder="Type your question here..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className={`flex items-center p-2 rounded-2xl border-2 transition-all ${q.correctAnswerIndex === optIndex ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                  
                  {/* Select Correct Answer Radio */}
                  <div className="px-3">
                    <input type="radio" name={`correct-${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex)} className="w-5 h-5 text-emerald-500 cursor-pointer" />
                  </div>
                  
                  <input required type="text" value={opt} onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + optIndex)}`} className="w-full py-3 pr-4 bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-300" />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Select the radio button next to the correct answer.</p>
          </div>
        ))}
      </div>

      <button type="button" onClick={handleAddQuestion} className="w-full py-5 border-4 border-dashed border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-[32px] font-black text-lg transition-all flex items-center justify-center gap-2">
        <PlusCircle className="w-6 h-6" /> Add Another Question
      </button>

      <button type="submit" disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center disabled:opacity-70">
        {isSaving ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Save className="w-6 h-6 mr-2" />}
        {isSaving ? "Saving to Database..." : "Save Manual Quiz"}
      </button>
    </form>
  );
}