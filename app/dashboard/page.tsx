"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { 
  BookOpen, CalendarClock, MessageCircle, Send, ChevronRight, 
  AlertCircle, Database, Sparkles, PlayCircle, FileText, Trophy, 
  Gamepad2, Quote, Flame, Star, BrainCircuit, Library, Clock
} from "lucide-react";

// --- TypeScript Interfaces ---
interface UserProfile {
  uid: string;
  displayName: string;
  grade: string;
  region: string;
  isPremium: boolean;
}

interface Subject {
  id: string;
  name: string;
  coverImageUrl?: string;
}

interface ContentItem {
  id: string;
  title: string;
  subjectId?: string;
  type?: string;
  year?: number;
  author?: string;
  isAnswer?: boolean;
}

interface QuizGame {
  id: string;
  title: string;
  questionCount: number;
}

export default function MassiveDashboard() {
  const router = useRouter();

  // --- State Management ---
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [examDays, setExamDays] = useState<number | null>(null);
  const [wisdomQuote, setWisdomQuote] = useState<{ text: string, author: string }>({ text: "", author: "" });
  
  // Content States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<ContentItem[]>([]);
  const [exams, setExams] = useState<ContentItem[]>([]);
  const [books, setBooks] = useState<ContentItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizGame[]>([]);
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({});
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [indexUrl, setIndexUrl] = useState<string | null>(null);

  // --- Paywall Logic ---
  const handlePremiumRoute = (path: string) => {
    if (userProfile?.isPremium) {
      router.push(path);
    } else {
      alert("This content requires Arday Caawiye Pro. Please upgrade your account to access it.");
      // You can replace this alert with your custom Paywall Modal if desired
    }
  };

  // --- Data Fetching Engine ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/auth");

      try {
        setIsLoading(true);

        // 1. Fetch Core Profile
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (!userDocSnap.exists()) throw new Error("Profile not found.");
        
        const userData = userDocSnap.data();
        if (!userData.grade || !userData.region) return router.push("/onboarding");

        const profile: UserProfile = {
          uid: user.uid,
          displayName: userData.displayName || "Student",
          grade: userData.grade,
          region: userData.region,
          isPremium: userData.isPremium || userData.pro || false,
        };
        setUserProfile(profile);

        // 2. Setup Daily Wisdom
        const quotes = [
          { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
          { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
          { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
          { text: "There are no shortcuts to any place worth going.", author: "Beverly Sills" }
        ];
        setWisdomQuote(quotes[new Date().getDay() % quotes.length]);

        // 3. Fetch Subjects (Filtered by Grade & Region)
        const subjectsQuery = query(
          collection(db, "subjects"),
          where("grade", "==", profile.grade),
          where("region", "==", profile.region)
        );
        const subjectsSnap = await getDocs(subjectsQuery);
        const fetchedSubjects = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
        setSubjects(fetchedSubjects);

        // Create a map for quick subject name lookups
        const sMap: Record<string, string> = {};
        fetchedSubjects.forEach(s => sMap[s.id] = s.name);
        setSubjectMap(sMap);

        // 4. Fetch Recent Lessons (Limit 4)
        const lessonsQuery = query(collection(db, "lessons"), where("grade", "==", profile.grade), where("region", "==", profile.region), limit(4));
        const lessonsSnap = await getDocs(lessonsQuery);
        setLessons(lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem)));

        // 5. Fetch Recent Exams (Limit 3)
        const examsQuery = query(collection(db, "exams"), where("grade", "==", profile.grade), where("region", "==", profile.region), limit(3));
        const examsSnap = await getDocs(examsQuery);
        setExams(examsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem)));

        // 6. Fetch General Books (Limit 4)
        const booksQuery = query(collection(db, "generalBooks"), limit(4));
        const booksSnap = await getDocs(booksQuery);
        setBooks(booksSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem)));

        // 7. Fetch Quizzes (Limit 4)
        const quizSnap = await getDocs(query(collection(db, "quizzes"), limit(4)));
        setQuizzes(quizSnap.docs.map(d => ({ id: d.id, title: d.data().title, questionCount: d.data().questionCount || 10 })));

        // 8. Fetch Exam Countdown
        const examSnap = await getDoc(doc(db, "examm", "examm"));
        if (examSnap.exists()) setExamDays(examSnap.data().days || 0);

      } catch (err: any) {
        console.error("Dashboard Error:", err);
        if (err.message?.includes("requires an index")) {
          const urlMatch = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
          if (urlMatch) setIndexUrl(urlMatch[0]);
          setError("Database indexing required. Click below to optimize your database.");
        } else {
          setError(err.message || "Failed to load dashboard data.");
        }
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // --- UI Handlers & Skeletons ---
  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-100 p-8 rounded-[32px] max-w-lg text-center shadow-xl">
          {indexUrl ? <Database className="w-16 h-16 mx-auto mb-4 text-blue-600" /> : <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />}
          <h2 className="text-2xl font-bold mb-3">{indexUrl ? "System Optimization Required" : "Dashboard Error"}</h2>
          <p className="mb-8 font-medium text-slate-600">{error}</p>
          {indexUrl ? (
            <a href={indexUrl} target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">Generate Required Index</a>
          ) : (
            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">Try Again</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 font-sans selection:bg-blue-100">
      
      {/* =========================================
          SECTION 1: THE SMART HEADER
          ========================================= */}
      <header className="bg-slate-900 pt-8 pb-16 md:pt-14 md:pb-28 px-4 sm:px-6 lg:px-8 rounded-b-[32px] md:rounded-b-[48px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500 opacity-20 rounded-full blur-3xl mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500 opacity-20 rounded-full blur-3xl mix-blend-overlay"></div>

        <div className="max-w-6xl mx-auto flex justify-between items-center relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl md:rounded-[20px] flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
              <span className="text-white font-extrabold text-xl md:text-2xl">
                {userProfile?.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-0.5 md:mb-1 flex items-center">
                Welcome back, {userProfile?.displayName.split(" ")[0]} <Sparkles className="w-5 h-5 ml-2 text-amber-300" />
              </h1>
              <div className="flex items-center space-x-2 text-slate-300 font-bold text-xs md:text-sm tracking-wider uppercase">
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/5">{userProfile?.grade}</span>
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/5">{userProfile?.region}</span>
              </div>
            </div>
          </div>
          
          {userProfile?.isPremium ? (
            <div className="hidden md:flex items-center px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-white font-bold text-sm shadow-lg shadow-orange-500/30 border border-orange-300/50">
              <Star className="w-4 h-4 mr-1.5 fill-white" /> Pro Member
            </div>
          ) : (
            <div className="hidden md:flex items-center px-4 py-2 bg-slate-800 rounded-full text-slate-300 font-bold text-sm border border-slate-700">
              Free Tier
            </div>
          )}
        </div>
      </header>

      {/* =========================================
          MAIN DASHBOARD BODY
          ========================================= */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 md:-mt-16 space-y-8 md:space-y-12 relative z-20">
        
        {/* SECTION 2: STATS & QUICK ACTIONS CAROUSEL */}
        <div className="flex overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar space-x-4 md:space-x-6">
          <div className="snap-center shrink-0 w-72 md:w-80 bg-gradient-to-br from-red-500 to-rose-600 rounded-[24px] p-6 shadow-xl text-white relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
            <div className="flex items-center space-x-3 mb-4 relative z-10">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/10">
                <CalendarClock className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-lg tracking-wide">Exam Target</h3>
            </div>
            <div className="relative z-10">
              {examDays !== null ? (
                <><p className="text-4xl font-black mb-1 tracking-tight">{examDays} <span className="text-xl font-bold text-rose-100">Days</span></p>
                <p className="text-rose-100 text-sm font-medium">Keep pushing, you're almost there!</p></>
              ) : (
                <p className="text-rose-100 font-medium">Dates unannounced.</p>
              )}
            </div>
          </div>

          <QuickActionCard href="https://portfolio.mubarikosman.com/telegram" icon={<Send className="w-6 h-6" />} title="Telegram Hub" desc="Get instant updates and news." colors="from-sky-400 to-blue-500" />
          <QuickActionCard href="https://portfolio.mubarikosman.com/whatsapp" icon={<MessageCircle className="w-6 h-6" />} title="WhatsApp Group" desc="Chat with peers and mentors." colors="from-emerald-400 to-teal-500" />
        </div>

        {/* SECTION 3: DAILY WISDOM */}
        <section className="bg-white rounded-[32px] p-1.5 shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 rounded-[28px] p-6 md:p-8 flex items-center relative overflow-hidden border border-slate-100">
            <Quote className="absolute -left-4 -top-4 w-32 h-32 text-blue-600/5 rotate-12" />
            <div className="relative z-10 flex-1 pl-4 md:pl-8 border-l-4 border-blue-500">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-snug mb-3">"{wisdomQuote.text}"</h3>
              <p className="text-blue-600 font-bold tracking-widest text-xs uppercase flex items-center">
                <Flame className="w-4 h-4 mr-1 text-orange-500" /> {wisdomQuote.author}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: CORE CURRICULUM (Subjects) */}
        <section>
          <SectionHeader title="Your Curriculum" subtitle="Core subjects for your grade level" />
          {subjects.length === 0 ? (
            <EmptyState icon={<BookOpen className="w-12 h-12" />} title="Curriculum Updating" desc="We are currently syncing content for your specific region and grade." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {subjects.map((subject) => (
                <Link href={`/subjects/${subject.id}`} key={subject.id} className="bg-white rounded-[28px] p-4 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 group flex flex-col">
                  <div className="aspect-[4/3] bg-slate-100 rounded-[20px] mb-4 overflow-hidden relative border border-slate-100">
                    {subject.coverImageUrl ? (
                      <img src={subject.coverImageUrl} alt={subject.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                        <BookOpen className="w-10 h-10 text-blue-200" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors duration-300"></div>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">{subject.name}</h3>
                  <div className="flex items-center text-xs text-slate-400 font-bold uppercase tracking-wider mt-auto pt-2">
                    <span>Explore</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-2 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 5: VIDEO LESSONS VAULT */}
        <section>
          <SectionHeader title="Video Vault" subtitle="Latest video lessons & notes" actionLink="/lessons" />
          {lessons.length === 0 ? (
             <EmptyState icon={<PlayCircle className="w-12 h-12" />} title="No Lessons Yet" desc="Video content for your grade is being recorded." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessons.map((lesson) => (
                <button onClick={() => handlePremiumRoute(`/lessons/${lesson.id}`)} key={lesson.id} className="w-full text-left bg-white rounded-[24px] p-4 flex items-center border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <PlayCircle className="w-7 h-7" />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{subjectMap[lesson.subjectId || ""] || "Lesson"}</p>
                    <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{lesson.title}</h4>
                  </div>
                  {!userProfile?.isPremium ? <span className="text-amber-500 font-bold text-xs uppercase tracking-widest">🔒 Pro</span> : <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 6: PAST PAPERS (Exams) */}
        <section>
          <SectionHeader title="Past Papers" subtitle="Official examination papers & answer keys" actionLink="/exams" />
          {exams.length === 0 ? (
             <EmptyState icon={<FileText className="w-12 h-12" />} title="No Exams Yet" desc="Past papers are currently being digitized." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <button onClick={() => handlePremiumRoute(`/exams/${exam.id}`)} key={exam.id} className="w-full text-left bg-white rounded-[24px] p-5 flex flex-col justify-between border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group min-h-[160px]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 font-black text-xs tracking-widest group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                      {exam.year || "PAPER"}
                    </div>
                    {!userProfile?.isPremium ? <span className="text-amber-500 text-sm">🔒</span> : <FileText className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{subjectMap[exam.subjectId || ""] || "Exam"}</p>
                    <h4 className="font-black text-slate-800 text-lg leading-tight line-clamp-2 group-hover:text-emerald-600 transition-colors">{exam.title}</h4>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 7: GENERAL LIBRARY */}
        <section>
          <SectionHeader title="Digital Library" subtitle="Extra reading & reference materials" actionLink="/library" />
          {books.length === 0 ? (
             <EmptyState icon={<Library className="w-12 h-12" />} title="Library Empty" desc="Books are currently being uploaded." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {books.map((book) => (
                <button onClick={() => handlePremiumRoute(`/library/${book.id}`)} key={book.id} className="w-full text-left bg-white rounded-[24px] p-4 flex flex-col items-center text-center border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all group">
                  <div className="w-16 h-20 bg-slate-100 rounded-xl mb-4 flex items-center justify-center group-hover:bg-purple-50 transition-colors border border-slate-200">
                     <Library className="w-8 h-8 text-slate-400 group-hover:text-purple-600" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm line-clamp-2 mb-1 group-hover:text-purple-600">{book.title}</h4>
                  <p className="text-xs font-bold text-slate-400 truncate w-full">{book.author || "Unknown Author"}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 8: GAMIFICATION & QUIZZES */}
        <section>
          <SectionHeader title="Brain Games" subtitle="Test your knowledge interactively" actionLink="/quizzes" />
          {quizzes.length === 0 ? (
            <EmptyState icon={<Trophy className="w-12 h-12" />} title="No Quizzes Yet" desc="New challenges are unlocking soon." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quizzes.map((quiz) => (
                <button onClick={() => handlePremiumRoute(`/quizzes/${quiz.id}`)} key={quiz.id} className="w-full text-left bg-slate-900 rounded-[24px] p-5 relative overflow-hidden group text-white shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-800">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity"></div>
                  <Gamepad2 className="w-8 h-8 text-blue-400 mb-4 relative z-10 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg leading-tight mb-2 relative z-10 line-clamp-2">{quiz.title}</h4>
                  <p className="text-slate-400 text-sm font-medium relative z-10 flex items-center justify-between">
                    <span className="flex items-center"><BrainCircuit className="w-4 h-4 mr-1.5" /> {quiz.questionCount} Qs</span>
                    {!userProfile?.isPremium && <span className="text-amber-400 text-base">🔒</span>}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

// --- Helper Components ---

function SectionHeader({ title, subtitle, actionLink }: { title: string, subtitle: string, actionLink?: string }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
        <p className="text-sm md:text-base font-medium text-slate-500 mt-1">{subtitle}</p>
      </div>
      {actionLink && (
        <Link href={actionLink} className="hidden sm:flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors">
          View All <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white rounded-[24px] p-10 text-center border border-slate-200 border-dashed">
      <div className="text-slate-300 flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-black text-slate-700">{title}</h3>
      <p className="text-slate-500 font-medium text-sm mt-1">{desc}</p>
    </div>
  );
}

function QuickActionCard({ href, icon, title, desc, colors }: { href: string, icon: React.ReactNode, title: string, desc: string, colors: string }) {
  return (
    <Link href={href} target="_blank" className={`snap-center shrink-0 w-72 md:w-80 bg-gradient-to-br ${colors} rounded-[24px] p-6 shadow-xl text-white hover:-translate-y-1 transition-transform group relative overflow-hidden`}>
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></div>
      <div className="flex items-center space-x-3 mb-4 relative z-10">
        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
          {icon}
        </div>
        <h3 className="font-bold text-lg tracking-wide">{title}</h3>
      </div>
      <p className="text-white/90 text-sm mb-5 font-medium relative z-10">{desc}</p>
      <div className="inline-flex items-center text-xs font-black bg-white text-slate-900 px-4 py-2.5 rounded-full shadow-md group-hover:shadow-lg transition-all">
        OPEN LINK <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="bg-slate-300 pt-8 pb-16 md:pt-14 md:pb-28 px-6 rounded-b-[32px] md:rounded-b-[48px] h-48 md:h-64"></div>
      <div className="max-w-6xl mx-auto px-6 -mt-10 md:-mt-16 space-y-12">
        <div className="flex space-x-4 overflow-hidden">
          {[1,2,3].map(i => <div key={i} className="w-72 md:w-80 h-40 bg-slate-200 rounded-[24px] shrink-0"></div>)}
        </div>
        <div className="h-32 bg-slate-200 rounded-[32px]"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-200 rounded-[28px]"></div>)}
        </div>
      </div>
    </div>
  );
}