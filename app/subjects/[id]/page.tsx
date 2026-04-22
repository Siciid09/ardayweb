"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase"; // Adjust path to your firebase config
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  ArrowLeft, 
  PlayCircle, 
  FileText, 
  HelpCircle, 
  BookOpen, 
  ChevronRight,
  AlertCircle
} from "lucide-react";

// --- TypeScript Interfaces ---
interface Subject {
  id: string;
  name: string;
  coverImageUrl: string;
}

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  coverImageUrl: string;
}

type TabType = "lessons" | "exams" | "quizzes";

export default function SubjectHubPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  // --- State ---
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lessons, setLessons] = useState<ContentItem[]>([]);
  const [exams, setExams] = useState<ContentItem[]>([]);
  const [quizzes, setQuizzes] = useState<ContentItem[]>([]);
  
  const [activeTab, setActiveTab] = useState<TabType>("lessons");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Data Fetching ---
  useEffect(() => {
    if (!subjectId) return;

    const fetchSubjectData = async () => {
      setIsLoading(true);
      setError("");

      try {
        // 1. Fetch Subject Info
        const subjectRef = doc(db, "subjects", subjectId);
        const subjectSnap = await getDoc(subjectRef);

        if (!subjectSnap.exists()) {
          setError("Subject not found.");
          setIsLoading(false);
          return;
        }

        setSubject({
          id: subjectSnap.id,
          name: subjectSnap.data().name,
          coverImageUrl: subjectSnap.data().coverImageUrl || "",
        });

        // 2. Fetch all content concurrently for maximum speed
        const [lessonsSnap, examsSnap, quizzesSnap] = await Promise.all([
          getDocs(query(collection(db, "lessons"), where("subjectId", "==", subjectId))),
          getDocs(query(collection(db, "exams"), where("subjectId", "==", subjectId))),
          getDocs(query(collection(db, "quizzes"), where("subjectId", "==", subjectId)))
        ]);

        // Map Lessons
        setLessons(lessonsSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || "Untitled Lesson",
          description: doc.data().description || "No description provided.",
          coverImageUrl: doc.data().coverImageUrl || "",
        })));

        // Map Exams (Exams might not have a 'description', so we map year or default text)
        setExams(examsSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || "Untitled Exam",
          description: doc.data().year ? `Past Paper - ${doc.data().year}` : "Past Examination Paper",
          coverImageUrl: doc.data().coverImageUrl || "",
        })));

        // Map Quizzes
        setQuizzes(quizzesSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || "Untitled Quiz",
          description: doc.data().questionCount ? `${doc.data().questionCount} Questions` : "Interactive Challenge",
          coverImageUrl: doc.data().coverImageUrl || "",
        })));

      } catch (err) {
        console.error("Error fetching subject data:", err);
        setError("Failed to load subject materials. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectData();
  }, [subjectId]);

  // --- UI Components ---

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading materials...</p>
      </div>
    );
  }

  // Error Screen
  if (error || !subject) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops!</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <button 
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Active Content Array based on Tab
  const getActiveContent = () => {
    switch (activeTab) {
      case "lessons": return lessons;
      case "exams": return exams;
      case "quizzes": return quizzes;
      default: return [];
    }
  };

  const getBasePath = () => {
    switch (activeTab) {
      case "lessons": return "/lessons";
      case "exams": return "/exams";
      case "quizzes": return "/quizzes";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* 1. Hero Header */}
      <header className="relative bg-slate-900 text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8 rounded-b-[40px] overflow-hidden shadow-xl">
        {/* Background Blur Image */}
        {subject.coverImageUrl && (
          <div 
            className="absolute inset-0 opacity-30 bg-cover bg-center"
            style={{ backgroundImage: `url(${subject.coverImageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />

        <div className="relative max-w-5xl mx-auto">
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center text-slate-300 hover:text-white transition-colors mb-6 group bg-white/10 px-4 py-2 rounded-full backdrop-blur-md w-fit border border-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          
          <div className="flex items-end space-x-6">
            <div className="w-24 h-24 bg-white rounded-2xl p-2 shadow-2xl z-10 shrink-0">
              {subject.coverImageUrl ? (
                <img src={subject.coverImageUrl} alt={subject.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-blue-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-blue-600" />
                </div>
              )}
            </div>
            <div className="pb-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
                {subject.name}
              </h1>
              <p className="text-slate-300 font-medium text-lg flex items-center">
                <span className="bg-blue-600 px-3 py-1 rounded-md text-sm text-white font-bold mr-3 shadow-lg shadow-blue-600/30">
                  {lessons.length + exams.length + quizzes.length} Resources
                </span>
                Study Hub
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        
        {/* 2. Modern Tab Navigation */}
        <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-100 flex items-center justify-between mb-8 overflow-x-auto hide-scrollbar">
          <TabButton 
            active={activeTab === "lessons"} 
            onClick={() => setActiveTab("lessons")} 
            icon={<PlayCircle className="w-5 h-5 mr-2" />} 
            label={`Video Lessons (${lessons.length})`} 
          />
          <TabButton 
            active={activeTab === "exams"} 
            onClick={() => setActiveTab("exams")} 
            icon={<FileText className="w-5 h-5 mr-2" />} 
            label={`Past Exams (${exams.length})`} 
          />
          <TabButton 
            active={activeTab === "quizzes"} 
            onClick={() => setActiveTab("quizzes")} 
            icon={<HelpCircle className="w-5 h-5 mr-2" />} 
            label={`Quizzes (${quizzes.length})`} 
          />
        </div>

        {/* 3. Content Grid */}
        <section>
          {getActiveContent().length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm mt-8">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                {activeTab === "lessons" && <PlayCircle className="w-10 h-10 text-slate-300" />}
                {activeTab === "exams" && <FileText className="w-10 h-10 text-slate-300" />}
                {activeTab === "quizzes" && <HelpCircle className="w-10 h-10 text-slate-300" />}
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">No {activeTab} available</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                We are currently preparing amazing {activeTab} for {subject.name}. Please check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getActiveContent().map((item) => (
                <Link 
                  href={`${getBasePath()}/${item.id}`} 
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col"
                >
                  <div className="aspect-video bg-slate-100 relative overflow-hidden">
                    {item.coverImageUrl ? (
                      <img 
                        src={item.coverImageUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                        {activeTab === "lessons" && <PlayCircle className="w-12 h-12 text-blue-200" />}
                        {activeTab === "exams" && <FileText className="w-12 h-12 text-blue-200" />}
                        {activeTab === "quizzes" && <HelpCircle className="w-12 h-12 text-blue-200" />}
                      </div>
                    )}
                    
                    {/* Play/View Overlay Icon */}
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors duration-300 flex items-center justify-center">
                      <div className="bg-white text-blue-600 rounded-full p-3 opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-lg">
                        <PlayCircle className="w-6 h-6" fill="currentColor" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center text-sm font-bold text-blue-600 mt-auto pt-4 border-t border-slate-50">
                      {activeTab === "lessons" ? "Start Lesson" : activeTab === "exams" ? "View Paper" : "Start Quiz"}
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Hide Scrollbar for tabs on mobile */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

// --- Helper Component for Tabs ---
function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center px-6 py-3 rounded-xl font-bold transition-all duration-200 shrink-0 mx-1 flex-1
        ${active 
          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
          : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}