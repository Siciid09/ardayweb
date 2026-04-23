"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { doc, getDoc, collection, getCountFromServer } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  Users, 
  BookOpen, 
  FileText, 
  AlertCircle, 
  TrendingUp,
  PlayCircle,
  HelpCircle,
  Library,
  Plus,
  ArrowRight,
  ShieldAlert,
  Lock,
  UserCog,
  Database
} from "lucide-react";

// The roles allowed to view this dashboard
const ALLOWED_ROLES = ["admin", "sadmin", "badmin", "hoadmin"];

export default function AdminDashboardOverview() {
  const router = useRouter();
  
  // --- Auth & Access State ---
  const [adminRole, setAdminRole] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // --- Data State ---
  const [stats, setStats] = useState({
    users: 0,
    subjects: 0,
    lessons: 0,
    exams: 0,
    books: 0,
    quizzes: 0,
  });
  
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

        // 1. Verify Role Access First
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        const role = userDocSnap.data()?.role || "user";
        setAdminRole(role);

        if (!ALLOWED_ROLES.includes(role)) {
          setIsAuthorized(false);
          setIsLoading(false);
          return; // Stop execution, throw access denied
        }

        setIsAuthorized(true);

        // 2. Fetch All Counts Concurrently (Extremely fast)
        const [
          usersSnap,
          subjectsSnap, 
          examsSnap, 
          lessonsSnap, 
          booksSnap, 
          quizzesSnap
        ] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collection(db, "subjects")),
          getCountFromServer(collection(db, "exams")),
          getCountFromServer(collection(db, "lessons")),
          getCountFromServer(collection(db, "generalBooks")),
          getCountFromServer(collection(db, "quizzes"))
        ]);

        setStats({
          users: usersSnap.data().count,
          subjects: subjectsSnap.data().count,
          lessons: lessonsSnap.data().count,
          exams: examsSnap.data().count,
          books: booksSnap.data().count,
          quizzes: quizzesSnap.data().count,
        });

      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
        setError("Database connection failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // ==========================================================================
  // VIEW: LOADING
  // ==========================================================================
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner animate-pulse">
          <Database className="w-8 h-8 text-indigo-600" />
        </div>
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Authenticating Admin...</p>
      </div>
    );
  }

  // ==========================================================================
  // VIEW: ACCESS DENIED (Strict Block)
  // ==========================================================================
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
            Your current role (<span className="text-white uppercase font-bold px-2 py-1 bg-white/10 rounded">{adminRole}</span>) does not have sufficient privileges to access the Admin Control Center.
          </p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-2xl font-black text-lg transition-transform hover:scale-105 shadow-xl"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW: ADMIN CONTROL CENTER
  // ==========================================================================
  return (
    <div className="min-h-screen bg-slate-50 pb-20 selection:bg-indigo-100">
      
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight">Admin Center</h1>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-1">System Online</p>
            </div>
          </div>
          
          <div className="px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full flex items-center shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse mr-2"></span>
            <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Role: {adminRole}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Error Banner */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center font-bold shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* --- SECTION 1: MASTER METRICS (Bento Grid) --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 mb-10">
          
          {/* Main User Stat Card */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2 bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 blur-3xl -mr-10 -mt-10 rounded-full transition-transform duration-700 group-hover:scale-150"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <button 
                onClick={() => router.push('/admin/users')}
                className="text-xs font-black bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors backdrop-blur-md flex items-center"
              >
                Manage <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Active Users</p>
              <h2 className="text-6xl font-black text-white tracking-tighter">{stats.users.toLocaleString()}</h2>
            </div>
          </div>

          {/* Sub Stats */}
          <StatCard icon={<BookOpen className="w-6 h-6 text-blue-600" />} color="bg-blue-50" border="border-blue-100" label="Subjects" count={stats.subjects} />
          <StatCard icon={<PlayCircle className="w-6 h-6 text-indigo-600" />} color="bg-indigo-50" border="border-indigo-100" label="Lessons" count={stats.lessons} />
          <StatCard icon={<FileText className="w-6 h-6 text-emerald-600" />} color="bg-emerald-50" border="border-emerald-100" label="Exams" count={stats.exams} />
          <StatCard icon={<Library className="w-6 h-6 text-purple-600" />} color="bg-purple-50" border="border-purple-100" label="Books" count={stats.books} />
          {/* <StatCard icon={<HelpCircle className="w-6 h-6 text-amber-600" />} color="bg-amber-50" border="border-amber-100" label="Quizzes" count={stats.quizzes} /> */}
          
          {/* Quick Action Block in Grid */}
          <div className="col-span-2 md:col-span-2 lg:col-span-2 flex flex-col gap-4">
             <button onClick={() => router.push('/admin/content/add-edit?type=lesson')} className="flex-1 flex items-center justify-between px-6 bg-white border border-slate-200 rounded-[20px] hover:border-indigo-300 hover:shadow-lg transition-all group">
               <div className="flex items-center font-bold text-slate-700 group-hover:text-indigo-700 transition-colors"><Plus className="w-5 h-5 mr-3 text-indigo-500" /> Add New Lesson</div>
               <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
             </button>
             <button onClick={() => router.push('/admin/content/add-edit?type=exam')} className="flex-1 flex items-center justify-between px-6 bg-white border border-slate-200 rounded-[20px] hover:border-emerald-300 hover:shadow-lg transition-all group">
               <div className="flex items-center font-bold text-slate-700 group-hover:text-emerald-700 transition-colors"><Plus className="w-5 h-5 mr-3 text-emerald-500" /> Add New Exam</div>
               <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
             </button>
          </div>
        </div>

        {/* --- SECTION 2: MANAGEMENT PORTALS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Content Management Portal */}
          <div className="bg-indigo-600 rounded-[2rem] p-8 md:p-10 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden flex flex-col justify-between group cursor-pointer hover:bg-indigo-700 transition-colors" onClick={() => router.push('/admin/content')}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10 mb-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tight">Content Hub</h2>
              <p className="text-indigo-200 font-medium text-lg max-w-sm">
                Organize your curriculum. Add, edit, or securely remove study materials across the entire platform.
              </p>
            </div>
            
            <div className="relative z-10 flex items-center text-white font-black text-lg group-hover:translate-x-2 transition-transform">
              Enter Content Manager <ArrowRight className="w-6 h-6 ml-2" />
            </div>
          </div>

          {/* User Management Portal */}
          <div className="bg-white border-2 border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-sm relative overflow-hidden flex flex-col justify-between group cursor-pointer hover:border-blue-400 hover:shadow-xl transition-all" onClick={() => router.push('/admin/users')}>
            
            <div className="relative z-10 mb-10">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 group-hover:bg-blue-600 transition-colors">
                <UserCog className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">User Operations</h2>
              <p className="text-slate-500 font-medium text-lg max-w-sm">
                Control user access. Upgrade students to Premium, manage roles, and review account statistics.
              </p>
            </div>
            
            <div className="relative z-10 flex items-center text-blue-600 font-black text-lg group-hover:translate-x-2 transition-transform">
              Manage Users <ArrowRight className="w-6 h-6 ml-2" />
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}

// --- Helper Component for Grid Stat Cards ---
function StatCard({ icon, color, border, label, count }: { icon: React.ReactNode, color: string, border: string, label: string, count: number }) {
  return (
    <div className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all flex flex-col justify-between`}>
      <div className={`w-14 h-14 ${color} ${border} border rounded-2xl flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">{count.toLocaleString()}</h2>
      </div>
    </div>
  );
}