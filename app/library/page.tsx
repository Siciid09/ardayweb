"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase"; 
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  Book, Search, Lock, Unlock, AlertCircle, 
  Sparkles, X, BookOpen
} from "lucide-react";

interface GeneralBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  pdfUrl: string;
}

export default function LibraryPage() {
  const router = useRouter();

  const [books, setBooks] = useState<GeneralBook[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setIsPremium(userData.isPremium || userData.pro || false);
        }

        const booksRef = collection(db, "generalBooks");
        const booksSnap = await getDocs(booksRef);
        const fetchedBooks: GeneralBook[] = booksSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || "Untitled Book",
          author: doc.data().author || "Unknown Author",
          coverImageUrl: doc.data().coverImageUrl || "",
          pdfUrl: doc.data().pdfUrl || "",
        }));
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

  const handleReadBook = (bookId: string, pdfUrl: string) => {
    if (!pdfUrl) {
      alert("This book doesn't have a PDF attached yet.");
      return;
    }
    if (isPremium) {
      // Route to the dedicated dynamic URL!
      router.push(`/library/${bookId}`);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">Loading Library...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 relative">
      <header className="bg-indigo-600 pt-12 pb-24 px-4 sm:px-6 lg:px-8 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="text-center md:text-left text-white">
            <h1 className="text-3xl md:text-5xl font-black mb-2 flex items-center justify-center md:justify-start">
              <BookOpen className="w-10 h-10 mr-4 opacity-90" />
              General Library
            </h1>
            <p className="text-indigo-100 font-medium text-lg max-w-xl">
              Expand your knowledge with our exclusive collection of reading materials and study guides.
            </p>
          </div>
          <div className={`px-5 py-2.5 rounded-2xl font-bold flex items-center shadow-inner backdrop-blur-md border ${
            isPremium ? 'bg-green-500/20 text-green-100 border-green-400/30' : 'bg-amber-500/20 text-amber-100 border-amber-400/30'
          }`}>
            {isPremium ? <><Unlock className="w-5 h-5 mr-2" /> Pro Access Active</> : <><Lock className="w-5 h-5 mr-2" /> Free Plan</>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 space-y-8">
        <div className="bg-white p-2 rounded-[24px] shadow-xl border border-slate-100">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input 
              type="text" placeholder="Search by book title or author..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-transparent rounded-xl focus:outline-none text-slate-800 text-lg font-bold placeholder:text-slate-400"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center font-bold">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> <p>{error}</p>
          </div>
        )}

        {filteredBooks.length === 0 ? (
          <div className="bg-white rounded-[32px] p-16 text-center border border-slate-100 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Book className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No Books Found</h3>
            <p className="text-slate-500 font-medium">We couldn't find any books matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredBooks.map((book) => (
              <button 
                key={book.id} onClick={() => handleReadBook(book.id, book.pdfUrl)}
                className="bg-white rounded-[24px] p-3 shadow-sm border border-slate-200 hover:shadow-2xl hover:-translate-y-2 hover:border-indigo-300 transition-all duration-300 group text-left flex flex-col"
              >
                <div className="aspect-[3/4] bg-slate-100 rounded-2xl mb-4 overflow-hidden relative shadow-sm border border-slate-100">
                  {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
                      <Book className="w-12 h-12 text-indigo-200 mb-2" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors duration-300 flex items-center justify-center">
                    <div className={`p-4 rounded-full opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-2xl ${isPremium ? 'bg-white text-indigo-600' : 'bg-slate-900 text-amber-400'}`}>
                      {isPremium ? <BookOpen className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                  </div>
                </div>
                <div className="px-1 flex flex-col flex-1">
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1">{book.title}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-auto truncate">{book.author}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Premium Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 overflow-hidden text-center animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-3">Pro Feature</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                Unlock the entire General Library, plus unlimited Past Papers, Video Lessons, and Quizzes by upgrading to <span className="font-bold text-indigo-600">Arday Caawiye Pro</span>.
              </p>
              <button onClick={() => { setShowUpgradeModal(false); router.push("/subscription"); }} className="w-full py-4 px-6 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-black transition-colors shadow-xl">
                View Pro Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}