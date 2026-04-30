"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, writeBatch, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { PlusCircle, Trash2, Save, CheckCircle2, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
//import { SharedQuizData } from "./page";
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
  editId?: string | null; // Passed securely from the parent container
}

export default function QuizManual({ initialData, editId }: QuizManualProps) {
  const router = useRouter();
  
  // Form State
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("");
  const [region, setRegion] = useState("");
  const [subjectsList, setSubjectsList] = useState<{id: string, name: string}[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingEdit, setIsFetchingEdit] = useState(false);
  const [questions, setQuestions] = useState<ManualQuestion[]>([
    { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 }
  ]);

  // 1. Fetch Subjects list
  useEffect(() => {
    const fetchSubjects = async () => {
      const snap = await getDocs(collection(db, "subjects"));
      setSubjectsList(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchSubjects();
  }, []);

  // 2. Handle Auto-JSON prefill
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setSubjectId(initialData.subjectId);
      setGrade(initialData.grade);
      setRegion(initialData.region);
      if (initialData.questions.length > 0) setQuestions(initialData.questions);
    }
  }, [initialData]);

  // 3. Handle EDIT MODE (Fetch from Firebase)
  useEffect(() => {
    if (editId && !initialData) {
      const fetchExistingQuiz = async () => {
        setIsFetchingEdit(true);
        try {
          const quizSnap = await getDoc(doc(db, "quizzes", editId));
          if (quizSnap.exists()) {
            const data = quizSnap.data();
            setTitle(data.title || "");
            setSubjectId(data.subjectId || "");
            setGrade(data.grade || "");
            setRegion(data.region || "");
          }
          
          const qSnap = await getDocs(collection(db, "quizzes", editId, "questions"));
          if (!qSnap.empty) {
            setQuestions(qSnap.docs.map(d => ({
              questionText: d.data().questionText || "",
              options: d.data().options || [],
              correctAnswerIndex: d.data().correctAnswerIndex ?? 0
            })));
          }
        } catch (err) {
          console.error("Failed to fetch quiz for editing", err);
        } finally {
          setIsFetchingEdit(false);
        }
      };
      fetchExistingQuiz();
    }
  }, [editId, initialData]);

  // --- Dynamic Question Logic ---
  const handleAddQuestion = () => setQuestions([...questions, { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 }]);
  const handleRemoveQuestion = (index: number) => { const newQs = [...questions]; newQs.splice(index, 1); setQuestions(newQs); };
  const handleQuestionChange = (index: number, field: string, value: any) => { const newQs = [...questions]; (newQs[index] as any)[field] = value; setQuestions(newQs); };

  // --- Dynamic Options Logic ---
  const handleAddOption = (qIndex: number) => { const newQs = [...questions]; newQs[qIndex].options.push(""); setQuestions(newQs); };
  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => { const newQs = [...questions]; newQs[qIndex].options[optIndex] = value; setQuestions(newQs); };
  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].options.splice(optIndex, 1);
    if (newQs[qIndex].correctAnswerIndex === optIndex) newQs[qIndex].correctAnswerIndex = 0; 
    else if (newQs[qIndex].correctAnswerIndex > optIndex) newQs[qIndex].correctAnswerIndex -= 1;
    setQuestions(newQs);
  };

  // --- Database Save Logic ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId || !grade || !region || questions.length === 0) return alert("Fill all fields and add at least 1 question.");
    
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      let quizDocId = editId;

      if (editId) {
        // UPDATE MODE
        await updateDoc(doc(db, "quizzes", editId), { title, subjectId, grade, region, updatedAt: new Date() });
        
        // Wipe old questions to prevent orphaned data
        const oldQs = await getDocs(collection(db, "quizzes", editId, "questions"));
        oldQs.forEach(doc => batch.delete(doc.ref));
      } else {
        // CREATE NEW MODE
        const newQuizRef = await addDoc(collection(db, "quizzes"), { title, subjectId, grade, region, createdAt: new Date() });
        quizDocId = newQuizRef.id;
      }

      // Add all questions to subcollection
      questions.forEach((q) => {
        const qRef = doc(collection(db, "quizzes", quizDocId as string, "questions"));
        batch.set(qRef, { questionText: q.questionText, options: q.options, correctAnswerIndex: q.correctAnswerIndex });
      });

      await batch.commit();
      alert(`Quiz successfully ${editId ? 'updated' : 'created'}!`);
      router.push(`/admin/content/list?type=quiz`); 
    } catch (err) {
      console.error(err);
      alert("Failed to save quiz.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetchingEdit) return <div className="text-center p-20 font-bold text-slate-500 animate-pulse">Loading Quiz Data...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-500">
      {/* Target Audience & Meta Data */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between">
          <span>{editId ? "Editing Quiz" : "Quiz Details"}</span>
          {initialData && <span className="bg-emerald-100 text-emerald-700 text-sm px-3 py-1 rounded-full flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Auto-filled</span>}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Quiz Title</label><input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 1" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Subject</label>
            <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>Select Subject</option>
              {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Grade Level</label>
            <select required value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>Select Grade</option>
              {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Region</label>
            <select required value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>Select Region</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h3 className="font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">Question {qIndex + 1}</h3>
              {questions.length > 1 && <button type="button" onClick={() => handleRemoveQuestion(qIndex)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>}
            </div>

            <textarea required rows={2} value={q.questionText} onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)} placeholder="Type question..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className={`flex items-center p-2 rounded-2xl border-2 transition-all ${q.correctAnswerIndex === optIndex ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                  <div className="px-3" title="Mark Correct"><input type="radio" name={`correct-${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex)} className="w-5 h-5 text-emerald-500 cursor-pointer" /></div>
                  <input required type="text" value={opt} onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + optIndex)}`} className="w-full py-3 pr-2 bg-transparent outline-none font-bold text-slate-700" />
                  {q.options.length > 2 && <button type="button" onClick={() => handleRemoveOption(qIndex, optIndex)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-400 font-bold flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1"/> Select radio button for correct answer.</p>
              <button type="button" onClick={() => handleAddOption(qIndex)} className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl flex items-center"><Plus className="w-4 h-4 mr-1" /> Add Option</button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={handleAddQuestion} className="w-full py-5 border-4 border-dashed border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-[32px] font-black text-lg flex items-center justify-center"><PlusCircle className="w-6 h-6 mr-2" /> Add Another Question</button>

      <button type="submit" disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center disabled:opacity-70">
        {isSaving ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Save className="w-6 h-6 mr-2" />}
        {isSaving ? "Saving to Database..." : `${editId ? 'Update Existing' : 'Save Final'} Quiz`}
      </button>
    </form>
  );
}

const X = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
