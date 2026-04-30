"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, writeBatch, getDocs } from "firebase/firestore";
import { PlusCircle, Trash2, Save, CheckCircle2, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { SharedQuizData } from "../admin/content/list/quize/page";

const GRADE_LEVELS = ['Form 4', 'Form 3', 'Form 2', 'Form 1', 'Grade 8', 'Grade 7', 'Grade 6'];
const REGIONS = ['Somaliland', 'Somalia', 'Puntland', 'Ethiopia', 'Banaadir'];

interface ManualQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

interface QuizManualProps {
  initialData?: SharedQuizData | null;
}

export default function QuizManual({ initialData }: QuizManualProps) {
  const router = useRouter();
  
  // Form State
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("");
  const [region, setRegion] = useState("");
  const [subjectsList, setSubjectsList] = useState<{id: string, name: string}[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState<ManualQuestion[]>([
    { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 }
  ]);

  // Fetch Subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      const snap = await getDocs(collection(db, "subjects"));
      setSubjectsList(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchSubjects();
  }, []);

  // Pre-fill data if it came from the Auto JSON parser
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setSubjectId(initialData.subjectId);
      setGrade(initialData.grade);
      setRegion(initialData.region);
      if (initialData.questions && initialData.questions.length > 0) {
        setQuestions(initialData.questions);
      }
    }
  }, [initialData]);

  // --- Question Handlers ---
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

  // --- Dynamic Options Handlers ---
  const handleAddOption = (qIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].options.push(""); // Add blank option
    setQuestions(newQs);
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].options.splice(optIndex, 1);
    
    // Safety check: Ensure the correct answer index doesn't go out of bounds
    if (newQs[qIndex].correctAnswerIndex === optIndex) {
      newQs[qIndex].correctAnswerIndex = 0; // Reset to first if they deleted the correct answer
    } else if (newQs[qIndex].correctAnswerIndex > optIndex) {
      newQs[qIndex].correctAnswerIndex -= 1; // Shift index down if they deleted an earlier option
    }
    
    setQuestions(newQs);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const newQs = [...questions];
    newQs[qIndex].options[optIndex] = value;
    setQuestions(newQs);
  };

  // --- Database Save ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId || !grade || !region || questions.length === 0) {
      return alert("Fill all fields and add at least 1 question.");
    }
    
    setIsSaving(true);
    try {
      // 1. Create Parent Quiz Document with all demographics
      const quizRef = await addDoc(collection(db, "quizzes"), {
        title,
        subjectId,
        grade,
        region,
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
      alert("Quiz successfully created and saved!");
      router.push(`/admin/content/list?type=quiz`); // Routes back to the main list
    } catch (err) {
      console.error(err);
      alert("Failed to save quiz.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Target Audience & Meta Data */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between">
          <span>Quiz Details</span>
          {initialData && <span className="bg-emerald-100 text-emerald-700 text-sm px-3 py-1 rounded-full flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Auto-filled from JSON</span>}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Quiz Title</label>
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midterm Mathematics" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Subject</label>
            <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800">
              <option value="" disabled>Select Subject</option>
              {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Grade Level</label>
            <select required value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800">
              <option value="" disabled>Select Grade</option>
              {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Region</label>
            <select required value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800">
              <option value="" disabled>Select Region</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
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

            {/* DYNAMIC OPTIONS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className={`flex items-center p-2 rounded-2xl border-2 transition-all ${q.correctAnswerIndex === optIndex ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                  
                  {/* Select Correct Answer Radio */}
                  <div className="px-3" title="Mark as Correct Answer">
                    <input type="radio" name={`correct-${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex)} className="w-5 h-5 text-emerald-500 cursor-pointer" />
                  </div>
                  
                  <input required type="text" value={opt} onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + optIndex)}`} className="w-full py-3 pr-2 bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-300" />
                  
                  {/* Remove Option Button */}
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(qIndex, optIndex)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Option Button & Helper Text */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Select the radio button next to the correct answer.</p>
              <button type="button" onClick={() => handleAddOption(qIndex)} className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors flex items-center">
                <Plus className="w-4 h-4 mr-1" /> Add Option
              </button>
            </div>

          </div>
        ))}
      </div>

      <button type="button" onClick={handleAddQuestion} className="w-full py-5 border-4 border-dashed border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-[32px] font-black text-lg transition-all flex items-center justify-center gap-2">
        <PlusCircle className="w-6 h-6" /> Add Another Question
      </button>

      <button type="submit" disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center disabled:opacity-70">
        {isSaving ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Save className="w-6 h-6 mr-2" />}
        {isSaving ? "Saving to Database..." : "Save Final Quiz to Database"}
      </button>
    </form>
  );
}

// Simple X icon helper
const X = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);