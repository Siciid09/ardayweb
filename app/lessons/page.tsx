"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "./../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  PlayCircle, FileText, ArrowLeft, BookOpen, 
  Lock, Search, ShieldCheck, AlertCircle, Video
} from "lucide-react";

// --- Interfaces ---
interface Lesson {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  videoUrl: string;
  pdfUrl: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function AllInOneLessonsPage() {
  const router = useRouter();

  // --- State ---
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // "All-in-One" View Toggler
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

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

        // 1. Fetch User Profile to get their demographics
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setError("User profile not found.");
          setIsLoading(false);
          return;
        }

        const userData = userDocSnap.data();
        const userGrade = userData.grade;
        const userRegion = userData.region;
        const isPremium = userData.isPremium || userData.pro || false;

        if (!isPremium) {
          router.push("/subscription"); // Boot non-premium users out
          return;
        }

        // 2. Fetch Relevant Subjects for this user
        const subjectsRef = collection(db, "subjects");
        const subjectsQuery = query(
          subjectsRef,
          where("grade", "==", userGrade),
          where("region", "==", userRegion)
        );
        const subjectsSnap = await getDocs(subjectsQuery);
        
        const subjectMap: Record<string, string> = {};
        const subjectIds: string[] = [];
        subjectsSnap.docs.forEach(doc => {
          subjectMap[doc.id] = doc.data().name;
          subjectIds.push(doc.id);
        });
        setSubjects(subjectMap);

        // 3. Fetch Lessons matching those subjects
        if (subjectIds.length > 0) {
          // Note: Firestore 'in' queries support max 10 items. 
          // If you have more than 10 subjects per grade, you need to chunk this or fetch all and filter client-side.
          const lessonsRef = collection(db, "lessons");
          
          // Client-side filtering approach (safest if many subjects exist)
          const allLessonsSnap = await getDocs(lessonsRef);
          const fetchedLessons: Lesson[] = [];
          
          allLessonsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (subjectIds.includes(data.subjectId)) {
              fetchedLessons.push({
                id: doc.id,
                title: data.title || "Untitled Lesson",
                description: data.description || "",
                subjectId: data.subjectId,
                videoUrl: data.videoUrl || "",
                pdfUrl: data.pdfUrl || "",
              });
            }
          });
          
          setLessons(fetchedLessons);
        }

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

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (subjects[l.subjectId] || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Loaders & Errors ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-indigo-400 font-medium animate-pulse">Loading Video Lessons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-[32px] text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Curriculum Error</h2>
          <p>{error}</p>
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
      <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
        
        {/* Viewer Header */}
        <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 flex items-center justify-between shadow-xl">
          <div className="flex items-center min-w-0">
            <button 
              onClick={() => setSelectedLesson(null)}
              className="p-2 mr-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div className="truncate">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                {subjects[selectedLesson.subjectId]}
              </p>
              <h1 className="text-lg font-bold text-white truncate">{selectedLesson.title}</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mr-2" />
            <span className="text-xs font-bold text-emerald-400">Secure Viewer</span>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
          
          {/* YouTube Video Player */}
          {ytId ? (
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 aspect-video relative">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                title="Lesson Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              ></iframe>
            </div>
          ) : (
             <div className="bg-slate-900 rounded-2xl aspect-video flex flex-col items-center justify-center border border-slate-800">
               <Video className="w-16 h-16 text-slate-700 mb-4" />
               <p className="text-slate-500 font-bold">No video provided for this lesson.</p>
             </div>
          )}

          {/* Description */}
          {selectedLesson.description && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Lesson Notes</h3>
              <p className="text-slate-400 leading-relaxed">{selectedLesson.description}</p>
            </div>
          )}

          {/* HIGH SECURITY PDF VIEWER */}
          {selectedLesson.pdfUrl && (
            <div className="bg-slate-900 border border-slate-800 rounded-[24px] overflow-hidden shadow-2xl flex flex-col h-[700px]">
              <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-indigo-400" /> Lesson Material
                </h3>
                <div className="flex items-center text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg">
                  <Lock className="w-3 h-3 mr-1" /> Protected Document
                </div>
              </div>
              
              {/* Security Wrapper */}
              <div 
                className="relative flex-1 bg-slate-300 w-full select-none"
                // Disable Right-Click entirely inside this wrapper
                onContextMenu={(e) => e.preventDefault()} 
              >
                {/* The `#toolbar=0` flag hides the download/print buttons in standard browsers.
                  `navpanes=0` hides sidebars.
                */}
                <object
                  data={`${selectedLesson.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  type="application/pdf"
                  className="absolute inset-0 w-full h-full"
                >
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900">
                    <p className="text-slate-400">Your browser does not support secure inline PDFs.</p>
                  </div>
                </object>

                {/* Invisible Glass Overlay. 
                  This blocks right-clicking directly on the iframe in some browsers,
                  adding a secondary layer of deterrence. We use pointer-events-none 
                  so they can still scroll, but combined with the context menu blocker above, 
                  it acts as a strong friction layer.
                */}
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
    <div className="min-h-screen bg-slate-50 pb-24">
      
      {/* Header */}
      <header className="bg-indigo-600 pt-12 pb-24 px-4 sm:px-6 lg:px-8 rounded-b-[40px] shadow-lg">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left text-white">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 flex items-center justify-center md:justify-start">
              <PlayCircle className="w-8 h-8 mr-3 opacity-90" />
              Video Lessons
            </h1>
            <p className="text-indigo-100 font-medium text-lg max-w-xl">
              Master your curriculum with our exclusive high-definition video tutorials and protected study notes.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 space-y-8">
        
        {/* Search Bar */}
        <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-100">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input 
              type="text"
              placeholder="Search lessons or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-transparent rounded-xl focus:outline-none text-slate-800 text-lg font-medium placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Lessons Grid */}
        {filteredLessons.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Lessons Found</h3>
            <p className="text-slate-500">We couldn't find any lessons matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map((lesson) => (
              <button 
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 transition-all duration-300 group text-left flex flex-col"
              >
                <div className="aspect-video bg-slate-900 rounded-[16px] mb-4 relative overflow-hidden flex items-center justify-center group-hover:shadow-lg transition-shadow">
                  {/* Fake Video Thumbnail Area */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20"></div>
                  <PlayCircle className="w-12 h-12 text-white opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all z-10 drop-shadow-md" />
                </div>
                
                <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1.5">
                  {subjects[lesson.subjectId]}
                </p>
                <h3 className="font-extrabold text-slate-800 text-lg line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                  {lesson.title}
                </h3>
                
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center text-xs font-bold text-slate-400">
                    <Video className="w-4 h-4 mr-1.5" /> Video
                    {lesson.pdfUrl && <><FileText className="w-4 h-4 ml-3 mr-1.5" /> PDF</>}
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    Watch Now
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