"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { 
  FileText, 
  Search, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  MapPin,
  GraduationCap,
  BookOpen
} from "lucide-react";

// --- Interfaces ---
interface Exam {
  id: string;
  title: string;
  year: number;
  subjectId: string;
  pdfUrl: string;
  isAnswer: boolean;
  coverImageUrl?: string;
  grade: string;
  region: string;
}

export default function ExamsHubPage() {
  const router = useRouter();

  // --- State ---
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  
  // Filter States
  const [activeTab, setActiveTab] = useState<"questions" | "answers">("questions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Authentication & Fetch Data ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        setIsLoading(true);

        // 1. Fetch User Profile to get their default Grade & Region
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Auto-set filters based on user's profile if they exist
          if (userData.grade) setSelectedGrade(userData.grade);
          if (userData.region) setSelectedRegion(userData.region);
        }

        // 2. Fetch Subjects Mapping
        const subjectsSnap = await getDocs(collection(db, "subjects"));
        const subjectMap: Record<string, string> = {};
        subjectsSnap.docs.forEach(doc => {
          subjectMap[doc.id] = doc.data().name;
        });
        setSubjects(subjectMap);

        // 3. Fetch Exams
        const examsQuery = query(collection(db, "exams"), orderBy("year", "desc"));
        const examsSnap = await getDocs(examsQuery);
        
        const fetchedExams: Exam[] = examsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Untitled Exam",
            year: data.year || new Date().getFullYear(),
            subjectId: data.subjectId || "",
            pdfUrl: data.pdfUrl || "",
            isAnswer: data.isAnswer || false,
            coverImageUrl: data.coverImageUrl || "",
            grade: data.grade || "Unspecified",
            region: data.region || "Unspecified",
          };
        });

        setExams(fetchedExams);
      } catch (err) {
        console.error("Error fetching exams:", err);
        setError("Failed to load past papers. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // --- Extract Unique Filter Options dynamically from the fetched exams ---
  const uniqueGrades = Array.from(new Set(exams.map(e => e.grade).filter(g => g !== "Unspecified")));
  const uniqueRegions = Array.from(new Set(exams.map(e => e.region).filter(r => r !== "Unspecified")));

  // --- Filtering Logic ---
  const filteredExams = exams.filter(exam => {
    const matchesTab = activeTab === "answers" ? exam.isAnswer : !exam.isAnswer;
    const matchesSubject = selectedSubject === "all" || exam.subjectId === selectedSubject;
    const matchesGrade = selectedGrade === "all" || exam.grade === selectedGrade;
    const matchesRegion = selectedRegion === "all" || exam.region === selectedRegion;
    
    const searchLower = searchQuery.toLowerCase();
    const subjectName = (subjects[exam.subjectId] || "").toLowerCase();
    const matchesSearch = 
      exam.title.toLowerCase().includes(searchLower) || 
      exam.year.toString().includes(searchLower) ||
      subjectName.includes(searchLower);

    return matchesTab && matchesSubject && matchesGrade && matchesRegion && matchesSearch;
  });

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm animate-pulse">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Loading Vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 font-sans selection:bg-blue-200">
      
      {/* =========================================
          PREMIUM HEADER
      ========================================= */}
      <header className="bg-slate-900 pt-16 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full"></div>
          <div className="absolute top-20 -left-24 w-72 h-72 bg-indigo-600/20 blur-[80px] rounded-full"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-blue-200 font-bold text-xs uppercase tracking-widest mb-6 border border-white/10">
            <BookOpen className="w-4 h-4 mr-2" /> Official Database
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            Past Papers <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">& Answers</span>
          </h1>
          <p className="text-slate-400 font-medium max-w-2xl mx-auto text-lg md:text-xl">
            Review previous examination papers customized to your specific grade and region to secure your success.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 space-y-6">
        
        {/* =========================================
            MODERN CONTROL CENTER
        ========================================= */}
        <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-5">
          
          {/* Top Row: Search & Toggle */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full lg:flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text"
                placeholder="Search by year or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-black font-bold placeholder:text-slate-400 placeholder:font-medium text-lg"
              />
            </div>

            {/* Questions vs Answers Toggle */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto shrink-0 border border-slate-200">
              <button
                onClick={() => setActiveTab("questions")}
                className={`flex-1 lg:w-36 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${
                  activeTab === "questions" 
                    ? "bg-white text-slate-900 shadow-md shadow-slate-200" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <HelpCircle className="w-4 h-4 mr-2" /> Questions
              </button>
              <button
                onClick={() => setActiveTab("answers")}
                className={`flex-1 lg:w-36 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${
                  activeTab === "answers" 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Answers
              </button>
            </div>

          </div>

          {/* Bottom Row: 3 Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
            
            {/* Subject Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold text-black cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {Object.entries(subjects).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div className="relative">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold text-black cursor-pointer"
              >
                <option value="all">All Grades</option>
                {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                {!uniqueGrades.includes("Form 4") && <option value="Form 4">Form 4</option>}
                {!uniqueGrades.includes("Grade 8") && <option value="Grade 8">Grade 8</option>}
              </select>
            </div>

            {/* Region Filter */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold text-black cursor-pointer"
              >
                <option value="all">All Regions</option>
                {uniqueRegions.map(r => <option key={r as string} value={r as string}>{r as string}</option>)}
                {!uniqueRegions.includes("Somaliland") && <option value="Somaliland">Somaliland</option>}
                {!uniqueRegions.includes("Somalia") && <option value="Somalia">Somalia</option>}
              </select>
            </div>

          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center font-bold">
            <AlertCircle className="w-6 h-6 mr-3 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* =========================================
            EXAMS GRID
        ========================================= */}
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center border border-slate-200 shadow-sm animate-in fade-in">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
              <FileText className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No Papers Found</h3>
            <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">
              We couldn't find any {activeTab} matching your current Grade, Region, or Subject filters.
            </p>
            <button 
              onClick={() => {
                setSearchQuery(""); setSelectedSubject("all"); setSelectedGrade("all"); setSelectedRegion("all");
              }}
              className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <Link 
                href={`/exams/${exam.id}`} 
                key={exam.id}
                className="bg-white rounded-[2rem] shadow-sm hover:shadow-xl border border-slate-200 hover:border-blue-300 transition-all duration-300 group flex flex-col h-full overflow-hidden"
              >
                {/* --- 50% Cover Image Section --- */}
                <div className="relative w-full h-48 sm:h-56 bg-gradient-to-br from-slate-100 to-blue-50 overflow-hidden shrink-0 border-b border-slate-100">
                  {exam.coverImageUrl ? (
                    <img 
                      src={exam.coverImageUrl} 
                      alt={exam.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <FileText className="w-16 h-16 text-blue-200 mb-4" />
                    </div>
                  )}
                  
                  {/* Modern Fade to White Gradient at Bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                  
                  {/* Floating Badges over the image */}
                  <div className="absolute top-4 left-4">
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/40 shadow-sm flex flex-col items-center justify-center">
                      <span className="text-[10px] font-black text-slate-500 leading-none mb-1">YEAR</span>
                      <span className="text-xl font-black text-slate-900 leading-none">{exam.year}</span>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4">
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-black flex items-center shadow-sm backdrop-blur-md border border-white/30 ${exam.isAnswer ? 'bg-emerald-500/90 text-white' : 'bg-blue-600/90 text-white'}`}>
                      {exam.isAnswer ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <HelpCircle className="w-3.5 h-3.5 mr-1" />}
                      {exam.isAnswer ? 'Answer Key' : 'Question Paper'}
                    </div>
                  </div>
                </div>
                
                {/* --- Content Section --- */}
                <div className="p-6 flex flex-col flex-1 bg-white relative z-10">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2 line-clamp-1">
                    {subjects[exam.subjectId] || "Subject Unknown"}
                  </p>
                  <h3 className="text-xl font-black text-slate-900 mb-4 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {exam.title}
                  </h3>

                  {/* Badges for Grade and Region pushed to bottom */}
                  <div className="flex flex-wrap gap-2 mb-6 mt-auto border-t border-slate-100 pt-4">
                    <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-bold text-slate-500 border border-slate-100">
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {exam.grade}
                    </div>
                    <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-bold text-slate-500 border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {exam.region}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors border border-slate-100 group-hover:border-blue-200">
                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">Open Document</span>
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-sm border border-slate-200">
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}