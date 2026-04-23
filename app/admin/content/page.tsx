"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, getCountFromServer, doc, getDoc } from "firebase/firestore";
import { 
  BookOpen, PlayCircle, FileText, HelpCircle, Library, 
  Plus, Settings2, Users, TrendingUp, ArrowRight, 
  Home, ChevronRight, Lock, ShieldAlert, Database
} from "lucide-react";

// --- Interfaces & Security ---
interface DashboardStats {
  users: number;
  lessons: number;
  exams: number;
  books: number;
  quizzes: number;
}

const ALLOWED_ROLES = ["admin", "sadmin", "badmin", "hoadmin"];

export default function ContentManagementHub() {
  const router = useRouter();
  
  // --- Security State ---
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [adminRole, setAdminRole] = useState<string>("");

  // --- Data State ---
  const [stats, setStats] = useState<DashboardStats>({
    users: 0, lessons: 0, exams: 0, books: 0, quizzes: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // AUTH CHECK & DATA FETCHING
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        setIsLoading(true);

        // 1. Security Check
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        const role = userDocSnap.data()?.role || "user";
        setAdminRole(role);

        if (!ALLOWED_ROLES.includes(role)) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);

        // 2. Fetch Live Totals Concurrently (Extremely fast)
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
    });

    return () => unsubscribe();
  }, [router]);

  // --- Content Grid Configuration ---
  const contentTypes = [
    { id: "subject", title: "Subjects", desc: "Create new subjects or courses.", icon: <BookOpen className="w-7 h-7 text-blue-600" />, bg: "bg-blue-50", border: "border-blue-100", count: null },
    { id: "lesson", title: "Video Lessons", desc: "Upload video links and PDF notes.", icon: <PlayCircle className="w-7 h-7 text-indigo-600" />, bg: "bg-indigo-50", border: "border-indigo-100", count: stats.lessons },
    { id: "exam", title: "Past Papers", desc: "Add past exams and answer keys.", icon: <FileText className="w-7 h-7 text-emerald-600" />, bg: "bg-emerald-50", border: "border-emerald-100", count: stats.exams },
    { id: "quiz", title: "Quizzes", desc: "Build interactive question sets.", icon: <HelpCircle className="w-7 h-7 text-amber-600" />, bg: "bg-amber-50", border: "border-amber-100", count: stats.quizzes },
    { id: "generalBooks", title: "General Library", desc: "Upload extra reading materials.", icon: <Library className="w-7 h-7 text-purple-600" />, bg: "bg-purple-50", border: "border-purple-100", count: stats.books },
  ];

  // ==========================================
  // VIEW: LOADING
  // ==========================================
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm animate-pulse">
          <Database className="w-8 h-8 text-slate-400" />
        </div>
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Connecting to Database...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW: ACCESS DENIED
  // ==========================================
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 text-center animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_40px_rgba(220,38,38,0.3)]">
            <Lock className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Access Denied</h1>
          <p className="text-red-400 font-medium text-lg max-w-md mx-auto mb-8 leading-relaxed">
            Your role (<span className="text-white uppercase font-bold px-2 py-1 bg-white/10 rounded">{adminRole}</span>) cannot access the Content Hub.
          </p>
          <button onClick={() => router.push("/admin")} className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-2xl font-black text-lg transition-transform hover:scale-105 shadow-xl">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: SECURE CONTENT HUB
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-28">
      
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">
            <button onClick={() => router.push("/admin")} className="hover:text-slate-900 flex items-center transition-colors">
              <Home className="w-4 h-4 mr-1.5" /> Admin
            </button>
            <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
            <span className="text-slate-900 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-1.5 text-indigo-500" /> Content Hub
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Content Hub</h1>
          <p className="text-slate-500 font-medium mt-3 text-lg">Manage all platform resources, track assets, and upload new materials securely.</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => router.push('/admin/content/add-edit?type=lesson')} className="flex items-center px-5 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-bold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5">
            <Plus className="w-5 h-5 mr-1.5" /> Lesson
          </button>
          <button onClick={() => router.push('/admin/content/add-edit?type=exam')} className="flex items-center px-5 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-bold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5">
            <Plus className="w-5 h-5 mr-1.5" /> Exam
          </button>
          <button onClick={() => router.push('/admin/content/add-edit?type=generalBooks')} className="flex items-center px-5 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-bold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5">
            <Plus className="w-5 h-5 mr-1.5" /> Book
          </button>
        </div>
      </div>

      {/* 2. Platform Statistics Overview (Bento Box) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Total Users Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 shadow-xl shadow-indigo-600/20 text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-inner relative z-10">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-100 font-bold text-xs uppercase tracking-widest mb-2">Total Students</p>
            <h2 className="text-6xl font-black text-white tracking-tighter leading-none">{stats.users.toLocaleString()}</h2>
          </div>
        </div>

        {/* Database Assets Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 flex flex-col justify-between col-span-1 lg:col-span-3 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mr-4 border border-emerald-100">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-black text-slate-900 text-2xl tracking-tight">Database Assets</h3>
            </div>
            <span className="text-xs font-black bg-slate-100 text-slate-600 px-4 py-2 rounded-full flex items-center w-max">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></div> Live Sync Active
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="flex flex-col">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1 flex items-center"><PlayCircle className="w-3 h-3 mr-1 text-indigo-500"/> Lessons</p>
              <p className="text-4xl font-black text-slate-800 tracking-tight">{stats.lessons}</p>
            </div>
            <div className="flex flex-col border-l border-slate-100 pl-6">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1 flex items-center"><FileText className="w-3 h-3 mr-1 text-emerald-500"/> Exams</p>
              <p className="text-4xl font-black text-slate-800 tracking-tight">{stats.exams}</p>
            </div>
            <div className="flex flex-col border-l border-slate-100 pl-6">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1 flex items-center"><HelpCircle className="w-3 h-3 mr-1 text-amber-500"/> Quizzes</p>
              <p className="text-4xl font-black text-slate-800 tracking-tight">{stats.quizzes}</p>
            </div>
            <div className="flex flex-col border-l border-slate-100 pl-6">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1 flex items-center"><Library className="w-3 h-3 mr-1 text-purple-500"/> Books</p>
              <p className="text-4xl font-black text-slate-800 tracking-tight">{stats.books}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Management Grid */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 mt-12 mb-6 tracking-tight">Content Categories</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contentTypes.map((type) => (
            <div 
              key={type.id}
              className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col h-full group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${type.bg} ${type.border} group-hover:scale-110 transition-transform`}>
                  {type.icon}
                </div>
                {type.count !== null && (
                  <span className="bg-slate-50 text-slate-600 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-100 flex items-center">
                    {type.count} Total
                  </span>
                )}
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{type.title}</h3>
              <p className="text-slate-500 font-medium mb-10 flex-1">{type.desc}</p>
              
              {/* Split Action Buttons */}
              <div className="flex items-center gap-3 mt-auto">
                <button 
                  onClick={() => router.push(`/admin/content/add-edit?type=${type.id}`)}
                  className="flex-1 py-3.5 px-2 bg-slate-900 text-white hover:bg-black rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center active:scale-[0.98]"
                >
                  <Plus className="w-5 h-5 mr-1.5" /> Add
                </button>
                <button 
                  onClick={() => router.push(`/admin/content/list?type=${type.id}`)}
                  className="flex-1 py-3.5 px-2 bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-bold transition-all flex items-center justify-center active:scale-[0.98]"
                >
                  <Settings2 className="w-5 h-5 mr-1.5" /> Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}