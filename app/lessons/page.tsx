"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  PlayCircle, FileText, ArrowLeft, BookOpen, 
  Lock, Search, ShieldCheck, AlertCircle, Video,
  Filter, GraduationCap, MapPin,
  ChevronRight
} from "lucide-react";

// --- Interfaces ---
interface Lesson {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  videoUrl: string;
  pdfUrl: string;
  grade: string;
  region: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function AllInOneLessonsPage() {
  const router = useRouter();

  // --- Data State ---
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  
  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  
  // "All-in-One" View Toggler
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // --- UI & Security State ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Data Fetching ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        setIsLoading(true);

        // 1. Fetch User Profile to get their demographics & Premium Status
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setError("User profile not found.");
          setIsLoading(false);
          return;
        }

        const userData = userDocSnap.data();
        const isPremium = userData.isPremium || userData.pro || false;

        // Secure Gatekeeper
        if (!isPremium) {
          router.push("/subscription"); 
          return;
        }

        // Auto-set filters based on user's profile
        if (userData.grade) setSelectedGrade(userData.grade);
        if (userData.region) setSelectedRegion(userData.region);

        // 2. Fetch Subjects Mapping
        const subjectsRef = collection(db, "subjects");
        const subjectsSnap = await getDocs(subjectsRef);
        const subjectMap: Record<string, string> = {};
        subjectsSnap.docs.forEach(doc => {
          subjectMap[doc.id] = doc.data().name;
        });
        setSubjects(subjectMap);

        // 3. Fetch ALL Lessons (We will filter them client-side for maximum flexibility)
        const lessonsRef = collection(db, "lessons");
        const allLessonsSnap = await getDocs(lessonsRef);
        
        const fetchedLessons: Lesson[] = allLessonsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Untitled Lesson",
            description: data.description || "",
            subjectId: data.subjectId || "",
            videoUrl: data.videoUrl || "",
            pdfUrl: data.pdfUrl || "",
            grade: data.grade || "Unspecified",
            region: data.region || "Unspecified",
          };
        });
        
        setLessons(fetchedLessons);

      } catch (err) {
        console.error("Error fetching lessons:", err);
        setError("Failed to load your curriculum. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // --- UI Helpers ---
  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  // --- Dynamic Options for Dropdowns ---
  const uniqueGrades = Array.from(new Set(lessons.map(l => l.grade).filter(g => g !== "Unspecified")));
  const uniqueRegions = Array.from(new Set(lessons.map(l => l.region).filter(r => r !== "Unspecified")));

  // --- Filtering Logic ---
  const filteredLessons = lessons.filter(lesson => {
    const matchSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (subjects[lesson.subjectId] || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchSubject = selectedSubject === "all" || lesson.subjectId === selectedSubject;
    const matchGrade = selectedGrade === "all" || lesson.grade === selectedGrade;
    const matchRegion = selectedRegion === "all" || lesson.region === selectedRegion;
    
    return matchSearch && matchSubject && matchGrade && matchRegion;
  });

  // ==========================================
  // VIEW: LOADING & ERRORS
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm animate-pulse">
          <PlayCircle className="w-8 h-8 text-indigo-600" />
        </div>
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Loading Curriculum...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-[32px] text-center max-w-md shadow-2xl">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Curriculum Error</h2>
          <p className="mb-8">{error}</p>
          <button onClick={() => router.push("/dashboard")} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW MODE: The High-Security Video & PDF Viewer
  // ==========================================================================
  if (selectedLesson) {
    const ytId = extractYouTubeId(selectedLesson.videoUrl);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 pb-20 font-sans">
        
        {/* Viewer Header */}
        <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 p-4 sticky top-0 z-50 flex items-center justify-between shadow-xl">
          <div className="flex items-center min-w-0">
            <button 
              onClick={() => setSelectedLesson(null)}
              className="p-2.5 mr-4 bg-slate-800/50 hover:bg-slate-700 rounded-xl transition-colors shrink-0 border border-slate-700/50"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div className="truncate">
              <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-0.5">
                {subjects[selectedLesson.subjectId]}
              </p>
              <h1 className="text-lg md:text-xl font-black text-white truncate leading-tight">{selectedLesson.title}</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shrink-0 shadow-inner">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mr-2" />
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Secure Viewer</span>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* YouTube Video Player */}
          {ytId ? (
            <div className="bg-black rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 aspect-video relative">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                title="Lesson Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              ></iframe>
            </div>
          ) : (
             <div className="bg-slate-900 rounded-[2rem] aspect-video flex flex-col items-center justify-center border border-slate-800 shadow-inner">
               <Video className="w-16 h-16 text-slate-700 mb-4" />
               <p className="text-slate-500 font-bold">No video provided for this lesson.</p>
             </div>
          )}

          {/* Description */}
          {selectedLesson.description && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl">
              <h3 className="text-xl font-black text-white mb-3 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-indigo-400" /> Lesson Notes
              </h3>
              <p className="text-slate-400 leading-relaxed font-medium">{selectedLesson.description}</p>
            </div>
          )}

          {/* HIGH SECURITY PDF VIEWER */}
          {selectedLesson.pdfUrl && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[800px]">
              <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
                <h3 className="text-lg font-black text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-indigo-400" /> Lesson Material
                </h3>
                <div className="flex items-center text-xs font-black text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                  <Lock className="w-3 h-3 mr-1.5 text-emerald-500" /> Protected
                </div>
              </div>
              
              {/* Security Wrapper */}
              <div 
                className="relative flex-1 bg-slate-950 w-full select-none"
                onContextMenu={(e) => e.preventDefault()} 
              >
                <object
                  data={`${selectedLesson.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  type="application/pdf"
                  className="absolute inset-0 w-full h-full"
                >
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900">
                    <p className="text-slate-400 font-bold">Your browser does not support secure inline PDFs.</p>
                  </div>
                </object>

                {/* Invisible Glass Overlay blocks direct interaction */}
                <div className="absolute inset-0 z-10 pointer-events-none bg-transparent"></div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ==========================================================================
  // LIST MODE: The Main Lesson Hub
  // ==========================================================================
  return (
    <div className="min-h-screen bg-slate-50 pb-28 font-sans selection:bg-indigo-200">
      
      {/* --- Premium Cinematic Header --- */}
      <header className="bg-slate-900 pt-16 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/20 blur-[100px] rounded-full"></div>
          <div className="absolute top-20 -left-24 w-72 h-72 bg-blue-600/20 blur-[80px] rounded-full"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-indigo-200 font-bold text-xs uppercase tracking-widest mb-6 border border-white/10 shadow-inner">
            <PlayCircle className="w-4 h-4 mr-2" /> Masterclass Series
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            Video <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Lessons</span>
          </h1>
          <p className="text-slate-400 font-medium max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
            Master your curriculum with our exclusive high-definition video tutorials and protected study notes.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 space-y-6">
        
        {/* --- Modern Control Center --- */}
        <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-5">
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            
            {/* Search Input */}
            <div className="relative w-full md:flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder="Search by lesson title or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-black font-bold placeholder:text-slate-400 placeholder:font-medium text-lg"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              
              {/* Subject Filter */}
              <div className="relative w-full sm:w-48 shrink-0">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-black cursor-pointer transition-all"
                >
                  <option value="all">All Subjects</option>
                  {Object.entries(subjects).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div className="relative w-full sm:w-40 shrink-0">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-black cursor-pointer transition-all"
                >
                  <option value="all">All Grades</option>
                  {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                  {!uniqueGrades.includes("Form 4") && <option value="Form 4">Form 4</option>}
                  {!uniqueGrades.includes("Grade 8") && <option value="Grade 8">Grade 8</option>}
                </select>
              </div>

              {/* Region Filter */}
              <div className="relative w-full sm:w-40 shrink-0">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-black cursor-pointer transition-all"
                >
                  <option value="all">All Regions</option>
                  {uniqueRegions.map(r => <option key={r as string} value={r as string}>{r as string}</option>)}
                  {!uniqueRegions.includes("Somaliland") && <option value="Somaliland">Somaliland</option>}
                </select>
              </div>

            </div>
          </div>
        </div>

        {/* --- Lessons Grid --- */}
        {filteredLessons.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center border border-slate-200 shadow-sm animate-in fade-in">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
              <Video className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No Lessons Found</h3>
            <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">
              We couldn't find any video lessons matching your current filters.
            </p>
            <button 
              onClick={() => { setSearchQuery(""); setSelectedSubject("all"); setSelectedGrade("all"); setSelectedRegion("all"); }}
              className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map((lesson) => (
              <button 
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 transition-all duration-300 group text-left flex flex-col h-full"
              >
                {/* Cinematic Thumbnail Area */}
                <div className="aspect-video bg-slate-900 rounded-[24px] mb-5 relative overflow-hidden flex items-center justify-center group-hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 to-purple-600/40 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Play Button Glass Pill */}
                  <div className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                    <PlayCircle className="w-8 h-8 text-white fill-white/20" />
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 line-clamp-1">
                    {subjects[lesson.subjectId] || "Unknown Subject"}
                  </p>
                  <h3 className="font-black text-slate-900 text-xl leading-tight line-clamp-2 mb-4 group-hover:text-indigo-600 transition-colors">
                    {lesson.title}
                  </h3>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-lg text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5 opacity-70" /> {lesson.grade}
                    </div>
                    <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-lg text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-70" /> {lesson.region}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center text-xs font-bold text-slate-400">
                    <Video className="w-4 h-4 mr-1.5" /> Video
                    {lesson.pdfUrl && <><div className="w-1 h-1 bg-slate-300 rounded-full mx-2"></div><FileText className="w-4 h-4 mr-1.5" /> PDF</>}
                  </div>
                  <span className="text-sm font-black text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center">
                    Start Lesson <ChevronRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}