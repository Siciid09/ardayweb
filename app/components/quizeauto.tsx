"use client";

import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { UploadCloud, CheckCircle2, FileJson, Sparkles, ArrowRight } from "lucide-react";

const GRADE_LEVELS = ['Form 4', 'Form 3', 'Form 2', 'Form 1', 'Grade 8', 'Grade 7', 'Grade 6'];
const REGIONS = ['Somaliland', 'Somalia', 'Puntland', 'Ethiopia', 'Banaadir'];

interface QuizAutoProps {
  onParseComplete: (data: any) => void;
}

export default function QuizAuto({ onParseComplete }: QuizAutoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("");
  const [region, setRegion] = useState("");
  
  const [subjectsList, setSubjectsList] = useState<{id: string, name: string}[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSubjects = async () => {
      const snap = await getDocs(collection(db, "subjects"));
      setSubjectsList(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchSubjects();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) throw new Error("JSON must be an array.");
        setParsedData(json);
      } catch (err) {
        setError("Invalid JSON format. Check file structure.");
        setParsedData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId || !grade || !region || parsedData.length === 0) return alert("Fill all fields.");
    
    // Forwards the data to the Manual Editor!
    onParseComplete({
      title,
      subjectId,
      grade,
      region,
      questions: parsedData.map(q => ({
        questionText: q.questionText || "",
        options: q.options || ["A", "B", "C", "D"],
        correctAnswerIndex: q.correctAnswerIndex ?? 0
      }))
    });
  };

  return (
    <form onSubmit={handleReview} className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Sparkles className="text-emerald-500 w-6 h-6"/> Smart Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Quiz Title</label><input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 1 Quiz" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Subject</label><select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"><option value="" disabled>Select Subject</option>{subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Grade Level</label><select required value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"><option value="" disabled>Select Grade</option>{GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Region</label><select required value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"><option value="" disabled>Select Region</option>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 text-center">
        <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        {!parsedData.length ? (
          <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer py-16 border-4 border-dashed border-slate-200 rounded-[24px] hover:bg-emerald-50 hover:border-emerald-300 transition-all flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4"><UploadCloud className="w-10 h-10 text-emerald-600" /></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Upload JSON File</h3>
            <p className="text-slate-500 font-bold">File must contain an array of questions.</p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-[24px] flex items-center justify-between">
            <div className="flex items-center text-left">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mr-6 shadow-lg shadow-emerald-500/30"><FileJson className="w-8 h-8 text-white" /></div>
              <div>
                <h3 className="text-2xl font-black text-emerald-900 mb-1">JSON Parsed Successfully</h3>
                <p className="text-emerald-700 font-bold"><CheckCircle2 className="w-5 h-5 inline mr-1 mb-1"/> Found {parsedData.length} questions.</p>
              </div>
            </div>
            <button type="button" onClick={() => setParsedData([])} className="px-6 py-3 bg-white text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:bg-emerald-100">Clear File</button>
          </div>
        )}
        {error && <p className="text-red-500 font-bold mt-4">{error}</p>}
      </div>

      <button type="submit" disabled={parsedData.length === 0} className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center disabled:opacity-50">
        Process & Review in Editor <ArrowRight className="w-6 h-6 ml-2" />
      </button>
    </form>
  );
}
