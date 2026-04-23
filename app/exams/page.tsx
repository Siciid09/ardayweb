"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // <-- Added Next.js router
import { auth, db } from "./../../lib/firebase"; // <-- Added 'auth' to your imports
import { onAuthStateChanged } from "firebase/auth"; // <-- Added Firebase Auth listener
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { 
  FileText, 
  Search, 
  Filter, 
  BookOpen, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2
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
}

interface Subject {
  id: string;
  name: string;
}

export default function ExamsHubPage() {
  const router = useRouter(); // <-- Initialize router for redirects

  // --- State ---
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  
  const [activeTab, setActiveTab] = useState<"questions" | "answers">("questions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Authentication & Fetch Data ---
  useEffect(() => {
    // 1. Listen for the user's authentication state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If no user is found, instantly kick them to the login page
      if (!user) {
        router.push("/auth"); // Change this if your login page is named something else!
        return;
      }

      // If they are logged in, proceed to fetch the data
      try {
        setIsLoading(true);

        // Fetch Subjects to map subjectId -> Subject Name
        const subjectsSnap = await getDocs(collection(db, "subjects"));
        const subjectMap: Record<string, string> = {};
        subjectsSnap.docs.forEach(doc => {
          subjectMap[doc.id] = doc.data().name;
        });
        setSubjects(subjectMap);

        // Fetch Exams (Ordered by year descending)
        const examsQuery = query(collection(db, "exams"), orderBy("year", "desc"));
        const examsSnap = await getDocs(examsQuery);
        
        const fetchedExams: Exam[] = examsSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || "Untitled Exam",
          year: doc.data().year || new Date().getFullYear(),
          subjectId: doc.data().subjectId || "",
          pdfUrl: doc.data().pdfUrl || "",
          isAnswer: doc.data().isAnswer || false,
          coverImageUrl: doc.data().coverImageUrl || "",
        }));

        setExams(fetchedExams);
      } catch (err) {
        console.error("Error fetching exams:", err);
        setError("Failed to load past papers. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, [router]);

  // --- Filtering Logic ---
  const filteredExams = exams.filter(exam => {
    // 1. Filter by Tab (Questions vs Answers)
    const matchesTab = activeTab === "answers" ? exam.isAnswer : !exam.isAnswer;
    
    // 2. Filter by Subject
    const matchesSubject = selectedSubject === "all" || exam.subjectId === selectedSubject;
    
    // 3. Filter by Search Query
    const searchLower = searchQuery.toLowerCase();
    const subjectName = (subjects[exam.subjectId] || "").toLowerCase();
    const matchesSearch = 
      exam.title.toLowerCase().includes(searchLower) || 
      exam.year.toString().includes(searchLower) ||
      subjectName.includes(searchLower);

    return matchesTab && matchesSubject && matchesSearch;
  });

  // --- UI Components ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Decrypting secure vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Header */}
      <header className="bg-blue-600 pt-12 pb-24 px-4 sm:px-6 lg:px-8 rounded-b-[40px] shadow-lg">
        <div className="max-w-5xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Past Papers & Answers
          </h1>
          <p className="text-blue-100 font-medium max-w-lg mx-auto text-lg">
            Review past examination papers to prepare for your upcoming tests.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 space-y-8 relative z-10">
        
        {/* Search, Filter & Toggle Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Custom Toggle Switch */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveTab("questions")}
              className={`flex-1 md:w-32 py-2 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${
                activeTab === "questions" 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <HelpCircle className="w-4 h-4 mr-2" /> Questions
            </button>
            <button
              onClick={() => setActiveTab("answers")}
              className={`flex-1 md:w-32 py-2 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${
                activeTab === "answers" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Answers
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by year or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>

          {/* Subject Filter */}
          <div className="relative w-full md:w-48 shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {Object.entries(subjects).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Exams Grid */}
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Papers Found</h3>
            <p className="text-slate-500">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <Link 
                href={`/exams/${exam.id}`} 
                key={exam.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex items-start space-x-4"
              >
                <div className="w-16 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-400 mb-1">YEAR</span>
                  <span className="text-lg font-black text-blue-700 leading-none">{exam.year}</span>
                </div>
                
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                    {subjects[exam.subjectId] || "Unknown Subject"}
                  </p>
                  <h3 className="font-bold text-slate-800 mb-2 truncate group-hover:text-blue-600 transition-colors">
                    {exam.isAnswer ? `${exam.title} (Answers)` : exam.title}
                  </h3>
                  <div className="flex items-center text-sm font-bold text-blue-600 mt-2">
                    Open PDF <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
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

// Quick fallback icon component for the toggle
function HelpCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
  );
}