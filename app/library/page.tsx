"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase"; 
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  Book, Search, Lock, Unlock, AlertCircle, 
  Sparkles, X, BookOpen, Filter, GraduationCap, MapPin
} from "lucide-react";

// --- Interfaces ---
interface GeneralBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  pdfUrl: string;
  grade: string;
  region: string;
}

export default function LibraryPage() {
  const router = useRouter();

  // --- Data State ---
  const [books, setBooks] = useState<GeneralBook[]>([]);
  
  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  
  // --- UI & Security State ---
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      try {
        setIsLoading(true);
        
        // 1. Fetch User Profile for Auto-Filtering & Premium Check
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setIsPremium(userData.isPremium || userData.pro || false);
          
          // Auto-set filters based on user's profile
          if (userData.grade) setSelectedGrade(userData.grade);
          if (userData.region) setSelectedRegion(userData.region);
        }

        // 2. Fetch Library Books
        const booksRef = collection(db, "generalBooks");
        const booksSnap = await getDocs(booksRef);
        
        const fetchedBooks: GeneralBook[] = booksSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Untitled Book",
            author: data.author || "Unknown Author",
            coverImageUrl: data.coverImageUrl || "",
            pdfUrl: data.pdfUrl || "",
            grade: data.grade || "Unspecified",
            region: data.region || "Unspecified",
          };
        });
        
        setBooks(fetchedBooks);
      } catch (err) {
        console.error("Error fetching library data:", err);
        setError("Failed to load the library. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  // --- Handlers ---
  const handleReadBook = (bookId: string, pdfUrl: string) => {
    if (!pdfUrl) {
      alert("This book doesn't have a PDF attached yet.");
      return;
    }
    if (isPremium) {
      router.push(`/library/${bookId}`);
    } else {
      setShowUpgradeModal(true);
    }
  };

  // --- Dynamic Options for Dropdowns ---
  const uniqueGrades = Array.from(new Set(books.map(b => b.grade).filter(g => g !== "Unspecified")));
  const uniqueRegions = Array.from(new Set(books.map(b => b.region).filter(r => r !== "Unspecified")));

  // --- Filtering Logic ---
  const filteredBooks = books.filter(book => {
    const matchSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGrade = selectedGrade === "all" || book.grade === selectedGrade;
    const matchRegion = selectedRegion === "all" || book.region === selectedRegion;
    
    return matchSearch && matchGrade && matchRegion;
  });

  // ==========================================
  // VIEW: LOADING
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm animate-pulse">
          <Book className="w-8 h-8 text-indigo-600" />
        </div>
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Loading Library...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN LIBRARY
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans selection:bg-indigo-200">
      
      {/* --- Premium Cinematic Header --- */}
      <header className="bg-slate-900 pt-16 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Abstract Background Blurs */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="text-center md:text-left text-white max-w-2xl">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-indigo-200 font-bold text-xs uppercase tracking-widest mb-6 border border-white/10">
              <BookOpen className="w-4 h-4 mr-2" /> Digital Collection
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
              General <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Library</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg md:text-xl">
              Expand your knowledge with our exclusive collection of reading materials, reference books, and study guides.
            </p>
          </div>

          {/* User Status Badge */}
          <div className={`px-6 py-4 rounded-3xl font-black flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md border shrink-0 ${
            isPremium ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isPremium ? (
              <><Unlock className="w-8 h-8 mb-2 text-emerald-400" /> Pro Access Active</>
            ) : (
              <><Lock className="w-8 h-8 mb-2 text-amber-400" /> Free Plan</>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 space-y-8">
        
        {/* --- Modern Control Center --- */}
        <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-4">
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="relative w-full md:flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search by book title or author..."
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium text-lg"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              
              {/* Grade Filter */}
              <div className="relative w-full sm:w-48 shrink-0">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-slate-800 cursor-pointer transition-all"
                >
                  <option value="all">All Grades</option>
                  {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                  {!uniqueGrades.includes("Form 4") && <option value="Form 4">Form 4</option>}
                  {!uniqueGrades.includes("Grade 8") && <option value="Grade 8">Grade 8</option>}
                </select>
              </div>

              {/* Region Filter */}
              <div className="relative w-full sm:w-48 shrink-0">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-slate-800 cursor-pointer transition-all"
                >
                  <option value="all">All Regions</option>
                  {uniqueRegions.map(r => <option key={r as string} value={r as string}>{r as string}</option>)}
                  {!uniqueRegions.includes("Somaliland") && <option value="Somaliland">Somaliland</option>}
                </select>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center font-bold">
            <AlertCircle className="w-6 h-6 mr-3 shrink-0" /> <p>{error}</p>
          </div>
        )}

        {/* --- Books Grid --- */}
        {filteredBooks.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center border border-slate-200 shadow-sm animate-in fade-in">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
              <Book className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No Books Found</h3>
            <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">
              We couldn't find any reading materials matching your current search or filters.
            </p>
            <button 
              onClick={() => { setSearchQuery(""); setSelectedGrade("all"); setSelectedRegion("all"); }}
              className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredBooks.map((book) => (
              <button 
                key={book.id} 
                onClick={() => handleReadBook(book.id, book.pdfUrl)}
                className="bg-white rounded-[24px] p-3 shadow-sm border border-slate-200 hover:shadow-2xl hover:-translate-y-2 hover:border-indigo-300 transition-all duration-300 group text-left flex flex-col h-full"
              >
                {/* Book Cover */}
                <div className="aspect-[3/4] bg-slate-100 rounded-xl mb-4 overflow-hidden relative shadow-sm border border-slate-100">
                  {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
                      <Book className="w-12 h-12 text-indigo-200 mb-2" />
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors duration-300 flex items-center justify-center">
                    <div className={`p-4 rounded-full opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-2xl ${isPremium ? 'bg-white text-indigo-600' : 'bg-slate-900 text-amber-400'}`}>
                      {isPremium ? <BookOpen className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                  </div>
                </div>
                
                {/* Book Details */}
                <div className="px-1 flex flex-col flex-1">
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1">{book.title}</h3>
                  <p className="text-xs font-bold text-slate-400 mb-3 truncate">{book.author}</p>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-2 mt-auto">
                    {book.grade !== "Unspecified" && (
                      <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-100 truncate">
                        {book.grade}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* --- Premium Upgrade Modal --- */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowUpgradeModal(false)}></div>
          
          <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 overflow-hidden text-center animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3 border-4 border-white">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Pro Feature</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                Unlock the entire General Library, plus unlimited Past Papers, Video Lessons, and Quizzes by upgrading to <span className="font-bold text-indigo-600">Arday Caawiye Pro</span>.
              </p>
              <button 
                onClick={() => { setShowUpgradeModal(false); router.push("/subscription"); }} 
                className="w-full py-4 px-6 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-transform active:scale-[0.98] shadow-xl shadow-slate-900/20"
              >
                View Pro Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}