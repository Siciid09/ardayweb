"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; // Adjust path to your firebase config
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, FileText, AlertCircle, ShieldAlert } from "lucide-react";

// --- Interface ---
interface ExamDetails {
  id: string;
  title: string;
  year: number;
  pdfUrl: string;
  subjectName: string;
  isAnswer: boolean;
}

export default function SecureExamViewerPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // --- Security State ---
  const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);

  // --- Security Engine ---
  useEffect(() => {
    // 1. Block Right-Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Block Keyboard Shortcuts & PrintScreen
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen Key
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText(""); // Wipe clipboard
        setIsSecurityTriggered(true);
        setTimeout(() => setIsSecurityTriggered(false), 3000); // Black screen for 3 seconds
      }

      // Block Ctrl+P (Print), Ctrl+S (Save), Ctrl+C (Copy), Ctrl+U (View Source)
      if (
        (e.ctrlKey || e.metaKey) && 
        ["p", "s", "c", "x", "u"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };

    // 3. Block Snipping Tool / Screen Recording (Blur Detection)
    // When the window loses focus (e.g., opening a snipping tool or screen recorder menu), black out the screen.
    const handleBlur = () => {
      setIsSecurityTriggered(true);
    };

    // Restore screen when they click back into the window
    const handleFocus = () => {
      setIsSecurityTriggered(false);
    };

    // 4. Block Copy Action
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      navigator.clipboard.writeText("");
    };

    // Attach all listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCopy);

    // Cleanup listeners on unmount
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCopy);
    };
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (!examId) return;

    const fetchExamDetails = async () => {
      try {
        const examRef = doc(db, "exams", examId);
        const examSnap = await getDoc(examRef);

        if (!examSnap.exists()) {
          setError("Exam paper not found.");
          setIsLoading(false);
          return;
        }

        const data = examSnap.data();

        let subjectName = "Unknown Subject";
        if (data.subjectId) {
          const subjectSnap = await getDoc(doc(db, "subjects", data.subjectId));
          if (subjectSnap.exists()) {
            subjectName = subjectSnap.data().name;
          }
        }

        setExam({
          id: examSnap.id,
          title: data.title || "Untitled Paper",
          year: data.year || new Date().getFullYear(),
          pdfUrl: data.pdfUrl || "",
          subjectName,
          isAnswer: data.isAnswer || false,
        });

      } catch (err) {
        console.error("Error fetching exam:", err);
        setError("Failed to load the document.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamDetails();
  }, [examId]);

  // ==========================================================================
  // BLACKOUT SCREEN: Rendered when security is triggered
  // ==========================================================================
  if (isSecurityTriggered) {
    return (
      <div className="fixed inset-0 z-[9999] h-screen w-screen bg-black flex flex-col items-center justify-center select-none">
        <ShieldAlert className="w-24 h-24 text-red-600 mb-6 animate-pulse" />
        <h1 className="text-3xl font-black text-red-600 mb-2">SECURITY VIOLATION</h1>
        <p className="text-red-500 font-bold max-w-md text-center">
          Screenshots, screen recording, and background capture are strictly prohibited. Please return focus to this window to continue reading.
        </p>
      </div>
    );
  }

  // --- Standard Loaders & Errors ---
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Decrypting Document...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button 
          onClick={() => router.back()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ==========================================================================
  // SECURE VIEWER RENDER
  // ==========================================================================
  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden select-none">
      
      {/* Anti-Print CSS Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { display: none !important; }
        }
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      `}} />

      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 shadow-md z-10">
        <div className="flex items-center space-x-4 min-w-0">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 min-w-0">
            <div className="hidden sm:flex px-2 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md text-xs font-black uppercase tracking-wider shrink-0">
              {exam.year}
            </div>
            <h1 className="text-white font-bold truncate text-sm sm:text-base flex items-center">
              {exam.subjectName} - {exam.isAnswer ? `${exam.title} (Answers)` : exam.title}
            </h1>
          </div>
        </div>

        {/* Security Badge (Replaces Download Button) */}
        <div className="flex items-center px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg shrink-0">
          <ShieldAlert className="w-4 h-4 text-red-500 mr-2" />
          <span className="text-xs font-bold text-red-500 hidden sm:inline">Protected View</span>
        </div>
      </header>

      {/* Main Content Area (Full Screen PDF) */}
      <main className="flex-1 relative bg-slate-950 flex items-center justify-center">
        {exam.pdfUrl ? (
          <div className="relative w-full h-full">
            {/* The PDF Object. 
                #toolbar=0 disables the native download/print buttons in Chrome/Edge.
                #navpanes=0 hides the sidebar.
            */}
            <object
              data={`${exam.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
              type="application/pdf"
              className="absolute inset-0 w-full h-full"
            >
              <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900">
                <FileText className="w-20 h-20 text-slate-600 mb-6" />
                <h2 className="text-xl font-bold text-white mb-2">Browser Cannot Securely Display PDF</h2>
                <p className="text-slate-400 mb-6 max-w-md">
                  Your current browser configuration does not support our secure inline PDF viewer. 
                </p>
                <button onClick={() => router.back()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">
                  Return
                </button>
              </div>
            </object>

            {/* Invisible Glass Overlay: Blocks them from right-clicking the actual PDF iframe */}
            <div className="absolute inset-0 z-10 pointer-events-none bg-transparent"></div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-slate-500 font-medium text-lg">No PDF file attached to this record.</p>
          </div>
        )}
      </main>

    </div>
  );
}