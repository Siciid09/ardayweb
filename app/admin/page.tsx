"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { doc, getDoc, collection, getCountFromServer } from "firebase/firestore";
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
  ArrowRight
} from "lucide-react";

export default function AdminDashboardOverview() {
  const router = useRouter();
  const [adminRole, setAdminRole] = useState<string>("");
  
  // All Stats State
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
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        // Get Role Context First
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        const role = userDocSnap.data()?.role || "reagent";
        setAdminRole(role);

        // Fetch All Counts using getCountFromServer (Highly optimized)
        const [
          subjectsSnap, 
          examsSnap, 
          lessonsSnap, 
          booksSnap, 
          quizzesSnap
        ] = await Promise.all([
          getCountFromServer(collection(db, "subjects")),
          getCountFromServer(collection(db, "exams")),
          getCountFromServer(collection(db, "lessons")),
          getCountFromServer(collection(db, "generalBooks")),
          getCountFromServer(collection(db, "quizzes"))
        ]);

        let usersCount = 0;
        // Only fetch and calculate total users if the role is hoadmin
        if (role === "hoadmin") {
          const usersCountSnap = await getCountFromServer(collection(db, "users"));
          usersCount = usersCountSnap.data().count;
        }

        setStats({
          users: usersCount,
          subjects: subjectsSnap.data().count,
          lessons: lessonsSnap.data().count,
          exams: examsSnap.data().count,
          books: booksSnap.data().count,
          quizzes: quizzesSnap.data().count,
        });

      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
        setError("Failed to load dashboard statistics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold animate-pulse">Syncing Database...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-2">Platform Overview</h1>
          <p className="text-slate-500 font-medium text-lg">Real-time statistics and quick management access.</p>
        </div>

        {/* Clickable Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => router.push('/admin/content/add-edit?type=lesson')}
            className="flex items-center px-5 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Lesson
          </button>
          <button 
            onClick={() => router.push('/admin/content/add-edit?type=exam')}
            className="flex items-center px-5 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Exam
          </button>
          <button 
            onClick={() => router.push('/admin/content/add-edit?type=generalBooks')}
            className="flex items-center px-5 py-3 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Book
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center font-bold">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* 2. Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 mb-10">
        
        {/* Conditional User Stat Card (Only for hoadmin) */}
        {adminRole === "hoadmin" && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 bg-slate-900 rounded-[24px] p-6 shadow-xl border border-slate-800 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/30">
                <Users className="w-7 h-7 text-blue-400" />
              </div>
              <span className="text-xs font-black bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg">LIVE</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</p>
              <h2 className="text-5xl font-black text-white leading-none tracking-tight">{stats.users.toLocaleString()}</h2>
            </div>
          </div>
        )}

        {/* Content Stats */}
        <StatCard 
          icon={<BookOpen className="w-6 h-6 text-blue-600" />} 
          color="bg-blue-50" label="Subjects" count={stats.subjects} 
        />
        <StatCard 
          icon={<PlayCircle className="w-6 h-6 text-indigo-600" />} 
          color="bg-indigo-50" label="Lessons" count={stats.lessons} 
        />
        <StatCard 
          icon={<FileText className="w-6 h-6 text-emerald-600" />} 
          color="bg-emerald-50" label="Exams" count={stats.exams} 
        />
        <StatCard 
          icon={<Library className="w-6 h-6 text-purple-600" />} 
          color="bg-purple-50" label="Books" count={stats.books} 
        />
        <StatCard 
          icon={<HelpCircle className="w-6 h-6 text-amber-600" />} 
          color="bg-amber-50" label="Quizzes" count={stats.quizzes} 
        />
      </div>

      {/* 3. Getting Started / Content Management Banner */}
      <div className="bg-indigo-600 rounded-[32px] p-8 md:p-12 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 max-w-2xl">
          <TrendingUp className="w-12 h-12 text-indigo-300 mb-6" />
          <h2 className="text-3xl font-black mb-4">Manage Platform Content</h2>
          <p className="text-indigo-100 text-lg leading-relaxed font-medium">
            Ready to organize your curriculum? Head over to the Content Hub to add, edit, or remove materials from the database securely.
          </p>
        </div>

        <button 
          onClick={() => router.push('/admin/content')}
          className="relative z-10 w-full md:w-auto flex items-center justify-center px-8 py-4 bg-white text-indigo-600 hover:bg-slate-50 rounded-2xl font-black text-lg transition-transform hover:scale-105 shadow-lg shrink-0"
        >
          Open Content Hub <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>

    </div>
  );
}

// --- Helper Component for Stat Cards ---
function StatCard({ icon, color, label, count }: { icon: React.ReactNode, color: string, label: string, count: number }) {
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h2 className="text-3xl font-black text-slate-800 leading-none">{count.toLocaleString()}</h2>
      </div>
    </div>
  );
}