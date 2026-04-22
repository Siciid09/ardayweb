"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; // Adjust path if needed
import { collection, getCountFromServer } from "firebase/firestore";
import { 
  BookOpen, 
  PlayCircle, 
  FileText, 
  HelpCircle, 
  Library, 
  Plus, 
  Settings2,
  Users,
  TrendingUp,
  ArrowRight,
  Home,
  ChevronRight
} from "lucide-react";

// --- Interfaces ---
interface DashboardStats {
  users: number;
  lessons: number;
  exams: number;
  books: number;
  quizzes: number;
}

export default function ContentManagementHub() {
  const router = useRouter();
  
  const [stats, setStats] = useState<DashboardStats>({
    users: 0, lessons: 0, exams: 0, books: 0, quizzes: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // --- Fetch Live Totals from Firebase ---
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        setIsLoading(true);
        
        // Using getCountFromServer is much faster and cheaper than fetching all documents
        const [usersSnap, lessonsSnap, examsSnap, booksSnap, quizzesSnap] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collection(db, "lessons")),
          getCountFromServer(collection(db, "exams")),
          getCountFromServer(collection(db, "generalBooks")),
          getCountFromServer(collection(db, "quizzes"))
        ]);

        setStats({
          users: usersSnap.data().count,
          lessons: lessonsSnap.data().count,
          exams: examsSnap.data().count,
          books: booksSnap.data().count,
          quizzes: quizzesSnap.data().count,
        });
      } catch (error) {
        console.error("Failed to fetch database totals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotals();
  }, []);

  const contentTypes = [
    { id: "subject", title: "Subjects", desc: "Create new subjects or courses.", icon: <BookOpen className="w-8 h-8 text-blue-500" />, color: "bg-blue-50 border-blue-100", count: null },
    { id: "lesson", title: "Video Lessons", desc: "Upload video links and PDF notes.", icon: <PlayCircle className="w-8 h-8 text-indigo-500" />, color: "bg-indigo-50 border-indigo-100", count: stats.lessons },
    { id: "exam", title: "Past Papers", desc: "Add past exams and answer keys.", icon: <FileText className="w-8 h-8 text-emerald-500" />, color: "bg-emerald-50 border-emerald-100", count: stats.exams },
    { id: "quiz", title: "Quizzes", desc: "Build interactive question sets.", icon: <HelpCircle className="w-8 h-8 text-amber-500" />, color: "bg-amber-50 border-amber-100", count: stats.quizzes },
    { id: "generalBooks", title: "General Library", desc: "Upload extra reading materials.", icon: <Library className="w-8 h-8 text-purple-500" />, color: "bg-purple-50 border-purple-100", count: stats.books },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* 1. Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
            <button onClick={() => router.push("/admin")} className="hover:text-indigo-500 flex items-center">
              <Home className="w-4 h-4 mr-1" /> Admin
            </button>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-slate-700">Content Hub</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Content Management</h1>
          <p className="text-slate-500 font-medium mt-2">Manage all platform resources, track users, and upload new materials.</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => router.push('/admin/content/add-edit?type=lesson')}
            className="flex items-center px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl font-bold transition-colors"
          >
            <Plus className="w-5 h-5 mr-1" /> Add Lesson
          </button>
          <button 
            onClick={() => router.push('/admin/content/add-edit?type=exam')}
            className="flex items-center px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl font-bold transition-colors"
          >
            <Plus className="w-5 h-5 mr-1" /> Add Exam
          </button>
          <button 
            onClick={() => router.push('/admin/content/add-edit?type=generalBooks')}
            className="flex items-center px-4 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-xl font-bold transition-colors"
          >
            <Plus className="w-5 h-5 mr-1" /> Add Book
          </button>
        </div>
      </div>

      {/* 2. Platform Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 rounded-[24px] p-6 shadow-lg border border-slate-800 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/30">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Total Users</p>
          {isLoading ? (
            <div className="h-10 w-20 bg-slate-800 animate-pulse rounded-lg mt-1"></div>
          ) : (
            <h2 className="text-4xl font-black text-white">{stats.users.toLocaleString()}</h2>
          )}
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 flex flex-col justify-between col-span-2 md:col-span-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-emerald-500 mr-2" />
              <h3 className="font-bold text-slate-800 text-lg">Total Assets Uploaded</h3>
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100">Live DB Sync</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="border-l-4 border-indigo-500 pl-4">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Video Lessons</p>
              <p className="text-2xl font-black text-slate-800">{isLoading ? "-" : stats.lessons}</p>
            </div>
            <div className="border-l-4 border-emerald-500 pl-4">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Past Papers</p>
              <p className="text-2xl font-black text-slate-800">{isLoading ? "-" : stats.exams}</p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Quizzes Built</p>
              <p className="text-2xl font-black text-slate-800">{isLoading ? "-" : stats.quizzes}</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Library Books</p>
              <p className="text-2xl font-black text-slate-800">{isLoading ? "-" : stats.books}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Management Grid */}
      <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">Content Categories</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentTypes.map((type) => (
          <div 
            key={type.id}
            className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col h-full group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${type.color} group-hover:scale-110 transition-transform`}>
                {type.icon}
              </div>
              {type.count !== null && !isLoading && (
                <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-sm border border-slate-200">
                  {type.count} Total
                </span>
              )}
            </div>
            
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">{type.title}</h3>
            <p className="text-slate-500 font-medium mb-8 flex-1">{type.desc}</p>
            
            {/* Split Action Buttons: Add & Manage */}
            <div className="flex items-center gap-3 mt-auto border-t border-slate-100 pt-6">
              <button 
                onClick={() => router.push(`/admin/content/add-edit?type=${type.id}`)}
                className="flex-1 py-3 px-2 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl font-bold transition-colors flex items-center justify-center shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" /> Add
              </button>
              <button 
                onClick={() => router.push(`/admin/content/list?type=${type.id}`)} // Assumes you have a list view to edit existing content
                className="flex-1 py-3 px-2 bg-slate-50 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl font-bold transition-colors flex items-center justify-center"
              >
                <Settings2 className="w-4 h-4 mr-2" /> Manage
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}