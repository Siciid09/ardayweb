"use client";

import React, { useState } from "react";
import { 
  Check, Save, Loader2, Image as ImageIcon, 
  ArrowLeft, AlertCircle, FileType 
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface MetadataFormProps {
  pdfBlob: Blob | null;
  onBack: () => void;
}

export default function MetadataForm({ pdfBlob, onBack }: MetadataFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form Fields[cite: 3]
  const [grade, setGrade] = useState("");
  const [region, setRegion] = useState("");
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

const GRADE_LEVELS = ['Form 4', 'Form 3', 'Form 2', 'Form 1', 'Grade 8', 'Grade 7', 'Grade 6'];
const REGIONS = ['Somaliland', 'Somalia', 'Puntland', 'Ethiopia', 'Banaadir'];
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const storage = getStorage();
      
      // 1. Upload the PDF Blob from Section 1
      let finalPdfUrl = "";
      if (pdfBlob) {
        const pdfRef = ref(storage, `processed_pdfs/${Date.now()}_upload.pdf`);
        await uploadBytes(pdfRef, pdfBlob);
        finalPdfUrl = await getDownloadURL(pdfRef);
      }

      // 2. Upload Cover Image (Section 2)
      let finalCoverUrl = "";
      if (coverImage) {
        const coverRef = ref(storage, `covers/${Date.now()}_cover.jpg`);
        await uploadBytes(coverRef, coverImage);
        finalCoverUrl = await getDownloadURL(coverRef);
      }

      // 3. Save to Firestore
      await addDoc(collection(db, "subjects"), {
        name: title,
        grade,
        region,
        bookPdfUrl: finalPdfUrl,
        coverImageUrl: finalCoverUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  if (success) return <SuccessDisplay />;

  return (
    <form onSubmit={handleFinalSubmit} className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-500">
      
      {/* 1. Target Audience Section[cite: 3] */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center mb-8 border-b border-slate-100 pb-4">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black mr-3">1</div>
          <h3 className="text-xl font-black text-slate-800">Target Audience</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Grade Level *</label>
            <select 
              required value={grade} onChange={(e) => setGrade(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            >
              <option value="">Select Grade</option>
              {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Region *</label>
            <select 
              required value={region} onChange={(e) => setRegion(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            >
              <option value="">Select Region</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Content Details Section[cite: 3] */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center mb-8 border-b border-slate-100 pb-4">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black mr-3">2</div>
          <h3 className="text-xl font-black text-slate-800">Content Details</h3>
        </div>
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Title / Name *</label>
        <input 
          required type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Biology Form 4 TextBook"
          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
      </div>

      {/* 3. Media Upload (Cover Only)[cite: 3] */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center mb-8 border-b border-slate-100 pb-4">
          <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-black mr-3">3</div>
          <h3 className="text-xl font-black text-slate-800">Media Uploads</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <label className={`h-64 border-4 border-dashed rounded-[32px] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${coverPreview ? 'border-blue-400' : 'border-slate-200 bg-slate-50'}`}>
            {coverPreview ? (
              <img src={coverPreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
            ) : (
              <>
                <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                <span className="font-bold text-slate-500 text-center px-4">Upload Cover Image (Required)</span>
              </>
            )}
            <input type="file" required className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if(file) { setCoverImage(file); setCoverPreview(URL.createObjectURL(file)); }
            }} />
          </label>
          <div className="p-6 bg-emerald-50 rounded-[24px] border border-emerald-100">
            <div className="flex items-center text-emerald-700 font-black mb-2">
              <FileType className="w-6 h-6 mr-2" /> Smart PDF Ready
            </div>
            <p className="text-emerald-600 font-medium text-sm">
              Your processed document from the editor is attached and ready for final database entry.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 sticky bottom-6 z-10">
        <button type="button" onClick={onBack} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xl hover:bg-slate-200 transition-all">
          <ArrowLeft className="inline mr-2 w-6 h-6" /> Edit PDF
        </button>
        <button 
          type="submit" 
          disabled={isUploading}
          className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-xl flex items-center justify-center shadow-2xl shadow-blue-600/40 hover:bg-blue-700 transition-all"
        >
          {isUploading ? <Loader2 className="animate-spin mr-3" /> : <Save className="mr-3" />}
          {isUploading ? "Uploading Data..." : "Publish to Study Hub"}
        </button>
      </div>
    </form>
  );
}

function SuccessDisplay() {
  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-[40px] p-20 text-center shadow-xl animate-in zoom-in duration-300">
      <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/30">
        <Check className="w-12 h-12 stroke-[4px]" />
      </div>
      <h2 className="text-4xl font-black text-emerald-900 mb-2">Subject Added Successfully!</h2>
      <p className="text-emerald-600 font-bold text-xl">The content is now live on ArdayCaawiye.</p>
    </div>
  );
}