"use client";

import { useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, writeBatch } from "firebase/firestore";
import { UploadCloud, CheckCircle2, FileJson, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuizAuto() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) throw new Error("JSON must be an array of questions.");
        setParsedData(json);
      } catch (err: any) {
        setError("Invalid JSON format. Please check your file structure.");
        setParsedData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId || parsedData.length === 0) return alert("Fill all fields and upload a valid JSON.");
    
    setIsUploading(true);
    try {
      // 1. Create Parent Quiz Document
      const quizRef = await addDoc(collection(db, "quizzes"), {
        title,
        subjectId,
        createdAt: new Date(),
      });

      // 2. Batch write JSON questions
      const batch = writeBatch(db);
      parsedData.forEach((q) => {
        const qRef = doc(collection(db, "quizzes", quizRef.id, "questions"));
        batch.set(qRef, {
          questionText: q.questionText || "Missing Question",
          options: q.options || ["A", "B", "C", "D"],
          correctAnswerIndex: q.correctAnswerIndex ?? 0,
        });
      });

      await batch.commit();
      alert(`Success! Imported ${parsedData.length} questions.`);
      router.push(`/admin/quizzes`);
    } catch (err) {
      console.error(err);
      alert("Failed to batch upload questions.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Meta Data */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Sparkles className="text-emerald-500 w-6 h-6"/> Smart Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Quiz Title</label>
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 1 Quiz" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Subject ID</label>
            <input required type="text" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="e.g. biology-101" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800" />
          </div>
        </div>
      </div>

      {/* File Drop Zone */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 text-center">
        <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        
        {!parsedData.length ? (
          <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer py-16 border-4 border-dashed border-slate-200 rounded-[24px] hover:bg-emerald-50 hover:border-emerald-300 transition-all flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <UploadCloud className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Upload JSON File</h3>
            <p className="text-slate-500 font-bold max-w-sm">File must contain an array of objects with <code className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">questionText</code>, <code className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">options</code> array, and <code className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">correctAnswerIndex</code>.</p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-[24px] flex items-center justify-between">
            <div className="flex items-center text-left">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mr-6 shadow-lg shadow-emerald-500/30">
                <FileJson className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-900 mb-1">JSON Parsed Successfully</h3>
                <p className="text-emerald-700 font-bold text-lg"><CheckCircle2 className="w-5 h-5 inline mr-1 mb-1"/> Found {parsedData.length} questions ready for upload.</p>
              </div>
            </div>
            <button type="button" onClick={() => setParsedData([])} className="px-6 py-3 bg-white text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors">
              Clear & Upload Different File
            </button>
          </div>
        )}
        {error && <p className="text-red-500 font-bold mt-4">{error}</p>}
      </div>

      <button type="submit" disabled={isUploading || parsedData.length === 0} className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center disabled:opacity-50 disabled:hover:bg-emerald-600">
        {isUploading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <UploadCloud className="w-6 h-6 mr-2" />}
        {isUploading ? "Uploading Batch Data..." : `Deploy ${parsedData.length || ''} Questions to Database`}
      </button>
    </form>
  );
}