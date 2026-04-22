"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from 'next/dynamic'; // <-- Next.js Dynamic Importer
import { db, auth } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  ArrowLeft, ShieldAlert, AlertCircle, 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut 
} from "lucide-react";

// Dynamically import the PDF Viewer and strictly disable Server-Side Rendering!
const SecurePdfViewer = dynamic(() => import('../../components/SecurePdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-bold">
      Loading Browser Engine...
    </div>
  )
});

// --- Interfaces ---
interface GeneralBook {
  id: string;
  title: string;
  author: string;
  pdfUrl: string;
}

export default function SecureCanvasBookViewer() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<GeneralBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && !userDocSnap.data().isPremium && !userDocSnap.data().pro) {
           router.push("/library");
           return;
        }

        if (bookId) {
          const bookRef = doc(db, "generalBooks", bookId);
          const bookSnap = await getDoc(bookRef);
          if (bookSnap.exists()) {
            setBook({
              id: bookSnap.id,
              title: bookSnap.data().title,
              author: bookSnap.data().author,
              pdfUrl: bookSnap.data().pdfUrl,
            });
          } else {
            setError("Book not found.");
          }
        }
      } catch (err) {
        console.error("Error loading book:", err);
        setError("Failed to load secure document.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [bookId, router]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prev => prev + offset);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">Initializing Secure Engine...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-500/30 text-red-500 p-8 rounded-3xl text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Error</h2>
          <p>{error}</p>
          <button onClick={() => router.push("/library")} className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col select-none overflow-hidden h-screen">
      
      <header className="bg-slate-900 border-b border-slate-800 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 shadow-md z-20">
        <div className="flex items-center space-x-4 min-w-0">
          <button onClick={() => router.push("/library")} className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3 min-w-0">
            <h1 className="text-white font-bold truncate text-sm sm:text-base">
              {book.title} <span className="text-slate-500 font-normal">by {book.author}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shrink-0">
          <ShieldAlert className="w-4 h-4 text-emerald-500 mr-2" />
          <span className="text-xs font-bold text-emerald-500 hidden sm:inline">Canvas Encrypted</span>
        </div>
      </header>

      <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center justify-center space-x-6 z-20">
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold w-12 text-center text-slate-400">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3.0, s + 0.2))} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white">
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-4 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button disabled={pageNumber <= 1} onClick={() => changePage(-1)} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 disabled:opacity-30">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-sm font-bold text-slate-300 min-w-[80px] text-center">
            {numPages ? `${pageNumber} / ${numPages}` : "-- / --"}
          </span>
          <button disabled={pageNumber >= (numPages || 1)} onClick={() => changePage(1)} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 disabled:opacity-30">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-auto bg-slate-950 relative flex justify-center p-4 sm:p-8 custom-scrollbar">
        <div className="relative">
          {/* THE DYNAMIC CLIENT COMPONENT */}
          <SecurePdfViewer 
            pdfUrl={book.pdfUrl}
            pageNumber={pageNumber}
            scale={scale}
            onLoadSuccess={onDocumentLoadSuccess}
          />
          
          <div className="absolute inset-0 z-10" onContextMenu={(e) => e.preventDefault()}></div>
        </div>
      </main>
    </div>
  );
}