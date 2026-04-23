"use client";

import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, doc, getDoc, updateDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { 
  ArrowLeft, UploadCloud, FileType, CheckCircle2, 
  AlertCircle, Image as ImageIcon, Save, Check, Lock
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";

const ALLOWED_ROLES = ["admin", "sadmin", "badmin", "hoadmin"];
export default function AddEditContentWrapper() {
  const [isMounted, setIsMounted] = useState(false);

  // This ensures the component ONLY renders in the browser, completely skipping the Vercel build crash
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AddEditContentForm />
    </Suspense>
  );
}

function AddEditContentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentType = searchParams.get("type") || "subject";
  const editId = searchParams.get("id"); // Get ID if we are editing!

  // --- Security State ---
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [adminRole, setAdminRole] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/auth");
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.data()?.role || "user";
        setAdminRole(role);
        if (!ALLOWED_ROLES.includes(role)) {
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      } catch {
        setIsAuthorized(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- Form State ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [isAnswer, setIsAnswer] = useState(false);
  const [author, setAuthor] = useState("");

  // Demographics 
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  
  // Relations
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [subjectsList, setSubjectsList] = useState<{id: string, name: string}[]>([]);

  // Files
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);

  // UI State
  const [isFetching, setIsFetching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const GRADE_LEVELS = ['Form 4', 'Form 3', 'Form 2', 'Form 1', 'Grade 8', 'Grade 7', 'Grade 6'];
  const REGIONS = ['Somaliland', 'Somalia', 'Puntland', 'Ethiopia', 'Banaadir'];

  const targetCollection = contentType === "generalBooks" ? "generalBooks" : `${contentType}s`;

  // 1. Fetch subjects list
  useEffect(() => {
    if (['lesson', 'exam', 'quiz'].includes(contentType)) {
      const fetchSubjects = async () => {
        const snap = await getDocs(collection(db, "subjects"));
        setSubjectsList(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      };
      fetchSubjects();
    }
  }, [contentType]);

  // 2. If Editing, fetch existing data
  useEffect(() => {
    if (editId) {
      const fetchExistingData = async () => {
        setIsFetching(true);
        try {
          const docSnap = await getDoc(doc(db, targetCollection, editId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTitle(data.title || data.name || "");
            setDescription(data.description || "");
            setVideoUrl(data.videoUrl || "");
            setYear(data.year?.toString() || new Date().getFullYear().toString());
            setIsAnswer(data.isAnswer || false);
            setAuthor(data.author || "");
            setSelectedGrade(data.grade || "");
            setSelectedRegion(data.region || "");
            setSelectedSubjectId(data.subjectId || "");
            
            // Save existing URLs so we don't overwrite them if no new file is uploaded
            setExistingCoverUrl(data.coverImageUrl || null);
            setExistingPdfUrl(data.pdfUrl || data.bookPdfUrl || null);
            if (data.coverImageUrl) setCoverPreview(data.coverImageUrl);
          }
        } catch (err) {
          console.error(err);
          setError("Failed to load existing document.");
        } finally {
          setIsFetching(false);
        }
      };
      fetchExistingData();
    }
  }, [editId, targetCollection]);

  // Handle Cover Image Selection for Live Preview
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  // --- Upload Helper ---
  const uploadFileToStorage = async (file: File, folder: string) => {
    const storage = getStorage();
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // --- Main Submit Logic ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsUploading(true);

    if (!selectedGrade || !selectedRegion) {
      setError("Grade and Region are strictly required for all content.");
      setIsUploading(false);
      return;
    }

    try {
      // 1. Handle File Uploads (Only upload if a NEW file was selected)
      let finalCoverUrl = existingCoverUrl || "";
      let finalPdfUrl = existingPdfUrl || "";

      if (coverImage) finalCoverUrl = await uploadFileToStorage(coverImage, "covers");
      if (pdfFile) finalPdfUrl = await uploadFileToStorage(pdfFile, "pdfs");

      // 2. Build Base Payload
      let payload: any = {
        grade: selectedGrade,
        region: selectedRegion,
        coverImageUrl: finalCoverUrl,
        updatedAt: serverTimestamp(),
      };

      if (!editId) {
        payload.createdAt = serverTimestamp();
      }

      // 3. Append Specific Fields based on Content Type
      switch (contentType) {
        case "subject":
          payload.name = title;
          payload.bookPdfUrl = finalPdfUrl;
          break;
        case "lesson":
          payload.title = title;
          payload.description = description;
          payload.subjectId = selectedSubjectId;
          payload.videoUrl = videoUrl;
          payload.pdfUrl = finalPdfUrl;
          if (!editId) payload.quizId = ""; 
          break;
        case "exam":
          payload.title = title;
          payload.year = parseInt(year);
          payload.subjectId = selectedSubjectId;
          payload.isAnswer = isAnswer;
          payload.pdfUrl = finalPdfUrl;
          break;
        case "quiz":
          payload.title = title;
          payload.subjectId = selectedSubjectId;
          if (!editId) payload.questionCount = 0; 
          break;
        case "generalBooks":
          payload.title = title;
          payload.author = author;
          payload.pdfUrl = finalPdfUrl;
          break;
      }

      // 4. Write to Firestore (Update or Add)
      if (editId) {
        await updateDoc(doc(db, targetCollection, editId), payload);
      } else {
        await addDoc(collection(db, targetCollection), payload);
      }

      setSuccess(true);
      setTimeout(() => router.push(`/admin/content/list?type=${contentType}`), 2000);

    } catch (err: any) {
      console.error("Upload Error:", err);
      setError(err.message || "An error occurred while saving the content.");
    } finally {
      setIsUploading(false);
    }
  };

  // 1. Check Authorization First
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <Lock className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-black text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-500 font-medium">Your role (<span className="uppercase font-bold text-red-500">{adminRole}</span>) cannot add or edit content.</p>
        <button onClick={() => router.push("/dashboard")} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  // 2. Wait for Auth OR Data Fetching
  if (isFetching || isAuthorized === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold">Loading secure environment...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center mb-8 bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
        <button 
          onClick={() => router.back()}
          className="p-3 mr-4 bg-slate-50 rounded-xl hover:bg-slate-100 hover:scale-105 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-800 capitalize tracking-tight">
            {editId ? "Edit" : "Add New"} {contentType.replace(/([A-Z])/g, ' $1').trim()}
          </h1>
          <p className="text-slate-500 font-medium mt-1">Fields marked with <span className="text-red-500">*</span> are required.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center font-bold animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> <p>{error}</p>
        </div>
      )}

      {success ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-[32px] p-16 text-center shadow-lg animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
            <Check className="w-12 h-12 text-white stroke-[3px]" />
          </div>
          <h2 className="text-3xl font-black text-emerald-900 mb-2">Successfully Saved!</h2>
          <p className="text-emerald-700 font-bold text-lg">Routing you back to the content hub...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Demographics */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-slate-200">
            <div className="flex items-center mb-6 border-b border-slate-100 pb-4">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black mr-3">1</div>
              <h3 className="text-xl font-bold text-slate-800">Target Audience</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Grade Level <span className="text-red-500">*</span></label>
                <select 
                  required value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                >
                  <option value="" disabled>Select Grade</option>
                  {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Region <span className="text-red-500">*</span></label>
                <select 
                  required value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                >
                  <option value="" disabled>Select Region</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Core Details */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-slate-200">
            <div className="flex items-center mb-6 border-b border-slate-100 pb-4">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black mr-3">2</div>
              <h3 className="text-xl font-bold text-slate-800">Content Details</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title / Name <span className="text-red-500">*</span></label>
                <input 
                  required type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mathematics Chapter 1"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Conditional Fields based on Type */}
              {['lesson', 'exam', 'quiz'].includes(contentType) && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Associated Subject <span className="text-red-500">*</span></label>
                  <select 
                    required value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                  >
                    <option value="" disabled>Select Subject Database Link</option>
                    {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {contentType === 'lesson' && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add study notes or a brief description..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">YouTube Video URL</label>
                    <input 
                      type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-indigo-600 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </>
              )}

              {contentType === 'exam' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Year <span className="text-red-500">*</span></label>
                    <input 
                      required type="number" value={year} onChange={(e) => setYear(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-4">
                    <label className="flex items-center space-x-3 cursor-pointer bg-slate-50 p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" checked={isAnswer} onChange={(e) => setIsAnswer(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="font-bold text-slate-700">Is this an Answer Key?</span>
                    </label>
                  </div>
                </div>
              )}

              {contentType === 'generalBooks' && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Author</label>
                  <input 
                    type="text" value={author} onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: File Uploads */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-slate-200">
            <div className="flex items-center mb-6 border-b border-slate-100 pb-4">
              <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-black mr-3">3</div>
              <h3 className="text-xl font-bold text-slate-800">Media Uploads</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Image Upload */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cover Image (Optional)</label>
                <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative ${coverPreview ? 'border-indigo-400 shadow-inner' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <div className="relative z-10 bg-slate-900/80 text-white px-4 py-2 rounded-lg font-bold flex items-center backdrop-blur-sm">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Image Selected
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <ImageIcon className="w-6 h-6 text-indigo-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Click to upload cover</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverSelect} />
                </label>
              </div>

              {/* PDF Upload */}
              {contentType !== 'quiz' && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">PDF Document</label>
                  <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all relative ${pdfFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                      <div className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center mb-3 ${pdfFile ? 'bg-emerald-500' : 'bg-white'}`}>
                        {pdfFile ? <Check className="w-6 h-6 text-white" /> : <FileType className="w-6 h-6 text-slate-400" />}
                      </div>
                      <p className={`text-sm font-bold ${pdfFile ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {pdfFile ? pdfFile.name : (existingPdfUrl ? "PDF Already Uploaded (Click to Replace)" : "Click to select PDF")}
                      </p>
                      {!pdfFile && <p className="text-xs font-medium text-slate-400 mt-1">Maximum size 50MB</p>}
                    </div>
                    <input type="file" className="hidden" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              )}

            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 sticky bottom-6 z-50">
            <button 
              type="submit" 
              disabled={isUploading}
              className="w-full py-5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl font-black text-xl transition-all shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center disabled:opacity-70 hover:-translate-y-1"
            >
              {isUploading ? (
                <><div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin mr-3"></div> Uploading & Saving...</>
              ) : (
                <><Save className="w-6 h-6 mr-3" /> Save to Database</>
              )}
            </button>
          </div>

        </form>
      )}
    </div>
  );
}