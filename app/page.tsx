import type { Metadata } from "next";
import Link from "next/link";
import { 
  ArrowRight, BookOpen, FileText, Download, Users, PlayCircle, 
  MessageCircle, Send, Star, CheckCircle2, ChevronRight, XCircle,
  BrainCircuit, LineChart, GraduationCap, Laptop, Sparkles, HelpCircle,
  TrendingUp
} from "lucide-react";

// ==========================================
// FULL SEO METADATA
// ==========================================
export const metadata: Metadata = {
  title: "ArdayCaawiye | The Ultimate Student Exam Toolkit",
  description: "Prepare smarter, not harder. Access a massive digital library of past exams, textbooks, and study guides. Join 120K+ students achieving a 95% success rate.",
  keywords: "exam preparation, past papers, student study hub, video lessons, high school exams, study guides, ArdayCaawiye",
  openGraph: {
    title: "ArdayCaawiye | The Ultimate Exam Toolkit",
    description: "Your dedicated partner for academic success. Get instant access to exams, books, and interactive learning.",
    type: "website",
    locale: "en_US",
    siteName: "ArdayCaawiye",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
      
      {/* =========================================
          HEADER (Fixed to top, ONLY Logo)
      ========================================= */}
      <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/50 z-50 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center group-hover:bg-blue-800 transition-colors shadow-md shadow-blue-700/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-blue-900">ArdayCaawiye</span>
          </Link>
        </div>
      </header>

      <main className="pt-20"> {/* Offset for fixed header */}
        
        {/* =========================================
            SECTION 1: HERO (Existing)
        ========================================= */}
        <section className="relative pt-8 pb-24 lg:pt-10 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 blur-[100px] -z-10 rounded-full pointer-events-none"></div>

          <div className="inline-flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-full mb-8 shadow-sm">
            <Star className="w-4 h-4 text-blue-600 fill-blue-600" />
            <span className="text-sm font-bold text-blue-900">The #1 Platform for Academic Success</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 leading-[1.05] mb-6 max-w-4xl">
            Prepare smarter. <br />
            <span className="text-blue-700">Score higher.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mb-10 leading-relaxed">
            Your dedicated partner for academic excellence. Get instant access to a comprehensive digital library of past exams, textbooks, and video lessons designed to help you build confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-700/30 flex items-center justify-center group"
            >
              Access Study Hub <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="https://play.google.com/store/apps/details?id=com.ardaycaawiye.app" 
              target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-blue-900 rounded-2xl font-bold text-lg transition-all flex items-center justify-center"
            >
              <Download className="w-5 h-5 mr-2" /> Download Android App
            </a>
          </div>
        </section>

        {/* =========================================
            SECTION 2: STATISTICS (Existing)
        ========================================= */}
        <section className="border-y border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 divide-x divide-slate-100">
              <StatBlock value="120K+" label="Students" />
              <StatBlock value="300K+" label="Downloads" />
              <StatBlock value="11M+" label="Views" />
              <StatBlock value="500+" label="Exams" />
              <StatBlock value="30+" label="Subjects" />
              <StatBlock value="95%" label="Success Rate" highlight />
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 3: PROBLEM VS SOLUTION (NEW)
        ========================================= */}
        <section className="bg-blue-900 py-24 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-4">A better way to study.</h2>
              <p className="text-blue-200 font-medium text-lg">Leave the old, scattered methods behind.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-[32px] backdrop-blur-sm">
                <div className="flex items-center text-red-400 font-bold mb-6 text-lg"><XCircle className="w-6 h-6 mr-2" /> The Old Way</div>
                <ul className="space-y-4 text-slate-300 font-medium">
                  <li>• Carrying heavy, outdated textbooks.</li>
                  <li>• Searching endlessly for reliable past papers.</li>
                  <li>• No way to instantly test your knowledge.</li>
                  <li>• Studying alone without expert guidance.</li>
                </ul>
              </div>
              <div className="bg-blue-600/20 border border-blue-500 p-8 rounded-[32px] backdrop-blur-sm shadow-2xl shadow-blue-500/20">
                <div className="flex items-center text-blue-300 font-bold mb-6 text-lg"><CheckCircle2 className="w-6 h-6 mr-2" /> The ArdayCaawiye Way</div>
                <ul className="space-y-4 text-white font-medium">
                  <li>• Everything you need on your phone or laptop.</li>
                  <li>• Thousands of verified past papers instantly.</li>
                  <li>• Interactive quizzes with immediate feedback.</li>
                  <li>• HD Video lessons from top-tier educators.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 4: HOW IT WORKS (NEW)
        ========================================= */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-blue-900 mb-4">Your Path to Excellence.</h2>
              <p className="text-slate-500 font-medium text-lg">Three simple steps to completely transform your grades.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-blue-200 -z-10"></div>
              
              <StepCard number="01" title="Create your Profile" desc="Set up your account in seconds and access the dashboard." />
              <StepCard number="02" title="Select your Subject" desc="Choose from Biology, Math, Physics, and more." />
              <StepCard number="03" title="Master the Exams" desc="Watch videos, read books, and practice past papers." />
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 5: BENTO FEATURES (Existing)
        ========================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-blue-900 mb-4">The Ultimate Exam Toolkit</h2>
            <p className="text-slate-500 font-medium text-lg">Everything you need to guarantee your success, all in one place.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<FileText className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />}
              title="Past Exams" desc="Practice with hundreds of official past papers and verified answer keys to test your readiness."
            />
            <FeatureCard 
              icon={<BookOpen className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />}
              title="Digital Library" desc="Access required textbooks and custom study guides tailored specifically for your curriculum."
            />
            <FeatureCard 
              icon={<PlayCircle className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />}
              title="Video Lessons" desc="Learn complex topics easily with high-quality video breakdowns from top educators."
            />
          </div>
        </section>

        {/* =========================================
            SECTION 6: DEEP DIVE - VIDEOS (NEW)
        ========================================= */}
        <section className="bg-white py-24 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 w-full order-2 md:order-1">
              <div className="aspect-video bg-slate-100 rounded-[32px] border border-slate-200 shadow-xl overflow-hidden relative flex items-center justify-center group cursor-pointer">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-multiply"></div>
                <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform z-10">
                  <PlayCircle className="w-10 h-10 text-blue-700 ml-1" />
                </div>
              </div>
            </div>
            <div className="flex-1 order-1 md:order-2">
              <h2 className="text-4xl font-black text-blue-900 mb-6 tracking-tight">The Classroom,<br/>Reinvented.</h2>
              <p className="text-slate-500 text-lg font-medium leading-relaxed mb-8">
                Stop struggling with confusing textbooks. Our cinematic video lessons break down the most complex subjects into bite-sized, visual explanations. Rewatch, pause, and master concepts at your own pace.
              </p>
              <Link href="/dashboard" className="inline-flex items-center px-6 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold transition-colors">
                Explore Video Library <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 7: DEEP DIVE - EXAMS (NEW)
        ========================================= */}
        <section className="bg-slate-50 py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-4xl font-black text-blue-900 mb-6 tracking-tight">Don't guess.<br/>Know the test.</h2>
              <p className="text-slate-500 text-lg font-medium leading-relaxed mb-8">
                We have compiled the largest digital repository of official past papers and answer keys. Practice with real exam formatting so you are completely prepared when test day arrives.
              </p>
              <Link href="/dashboard" className="inline-flex items-center px-6 py-3 bg-white border border-slate-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50 rounded-xl font-bold transition-colors shadow-sm">
                Browse Past Papers <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="aspect-square max-h-[400px] mx-auto bg-white rounded-[32px] border border-slate-200 shadow-2xl p-8 relative overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                  <div className="w-32 h-4 bg-slate-200 rounded-full"></div>
                  <div className="w-12 h-4 bg-blue-100 rounded-full"></div>
                </div>
                <div className="w-full h-6 bg-slate-100 rounded-full mb-4"></div>
                <div className="w-5/6 h-6 bg-slate-100 rounded-full mb-8"></div>
                
                <div className="space-y-3 mt-auto">
                  <div className="w-full py-4 px-6 border-2 border-slate-100 rounded-xl flex items-center"><div className="w-4 h-4 rounded-full border-2 border-slate-300 mr-3"></div> <div className="w-32 h-3 bg-slate-200 rounded-full"></div></div>
                  <div className="w-full py-4 px-6 border-2 border-blue-500 bg-blue-50 rounded-xl flex items-center"><div className="w-4 h-4 rounded-full bg-blue-500 mr-3 border-2 border-blue-500"></div> <div className="w-40 h-3 bg-blue-300 rounded-full"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 8: SUBJECT COVERAGE (NEW)
        ========================================= */}
        <section className="py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-blue-900 mb-4">Comprehensive Syllabus Coverage.</h2>
              <p className="text-slate-500 font-medium text-lg">Every subject you need, meticulously organized.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {['Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'English', 'Islamic Studies', 'Somali', 'Social Science', 'Arabic'].map((sub, i) => (
                <div key={i} className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer shadow-sm">
                  {sub}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 9: PROGRESS ANALYTICS (NEW)
        ========================================= */}
        <section className="bg-slate-50 py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 w-full order-2 md:order-1 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl relative z-10">
                <div className="flex items-center mb-6">
                  <LineChart className="w-6 h-6 text-blue-600 mr-3" />
                  <h4 className="font-black text-slate-800 text-lg">Performance Trend</h4>
                </div>
                <div className="flex items-end gap-2 h-40 border-b border-slate-100 pb-2">
                  {[40, 55, 45, 70, 65, 85, 95].map((height, i) => (
                    <div key={i} className="flex-1 bg-blue-100 rounded-t-md hover:bg-blue-600 transition-colors relative group" style={{ height: `${height}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">{height}%</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600 mr-3" />
                  <span className="text-emerald-800 font-bold text-sm">You are in the top 15% of students!</span>
                </div>
              </div>
            </div>
            <div className="flex-1 order-1 md:order-2">
              <h2 className="text-4xl font-black text-blue-900 mb-6 tracking-tight">Track your growth.</h2>
              <p className="text-slate-500 text-lg font-medium leading-relaxed mb-8">
                Interactive dashboards help you visualize your progress. Identify your weak points with our intelligent analytics, and turn them into your greatest strengths before exam day.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 10: EXPERT EDUCATORS (NEW)
        ========================================= */}
        <section className="bg-blue-900 py-24 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <GraduationCap className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-black mb-6">Learn from the Best.</h2>
            <p className="text-blue-200 font-medium text-lg max-w-2xl mx-auto mb-10">
              Our content is curated and taught by highly experienced, certified educators who have a proven track record of producing top-ranking students nationwide.
            </p>
            <Link href="/dashboard" className="inline-flex items-center px-8 py-4 bg-white text-blue-900 hover:bg-blue-50 rounded-2xl font-black text-lg transition-transform hover:scale-105 shadow-xl">
              Start Learning Now
            </Link>
          </div>
        </section>

        {/* =========================================
            SECTION 11: TESTIMONIALS (Existing)
        ========================================= */}
        <section className="bg-slate-50 py-24 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-blue-900 mb-4">Trusted by Students</h2>
              <p className="text-slate-500 font-medium text-lg">See what your peers are saying about ArdayCaawiye.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TestimonialCard 
                text="ArdayCaawiye completely changed how I study. Having all the past papers on my phone helped me practice anywhere."
                name="Student Review" 
              />
              <TestimonialCard 
                text="The video lessons made difficult subjects finally click for me. I couldn't have achieved my grades without it!"
                name="Student Review" 
              />
              <TestimonialCard 
                text="Best educational app out there. The interface is smooth and the study guides are perfectly aligned with our exams."
                name="Student Review" 
              />
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 12: F.A.Q. (NEW)
        ========================================= */}
        <section className="bg-white py-24 border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-blue-900 mb-4">Got Questions?</h2>
              <p className="text-slate-500 font-medium text-lg">Everything you need to know about getting started.</p>
            </div>
            <div className="space-y-4">
              <FaqCard 
                q="How do I access the materials?" 
                a="Simply create a free account, log into the dashboard, and you will instantly have access to our entire library of subjects, videos, and exams." 
              />
              <FaqCard 
                q="Can I use the platform on my phone?" 
                a="Absolutely. ArdayCaawiye is fully optimized for mobile devices. You can use our web dashboard or download our dedicated Android app." 
              />
              <FaqCard 
                q="Are the past papers up to date?" 
                a="Yes, we constantly update our repository with the latest official examinations and highly accurate answer keys." 
              />
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 13: COMMUNITY & UPDATES (Existing)
        ========================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-emerald-50 rounded-[32px] p-8 md:p-12 border border-emerald-100 flex flex-col items-start relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-64 h-64 text-emerald-600" />
              </div>
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-6 relative z-10 shadow-lg shadow-emerald-500/30">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 relative z-10">Join our Community</h3>
              <p className="text-slate-600 font-medium mb-8 text-lg relative z-10 max-w-sm">
                Get help, share notes, and discuss strategies with fellow students on WhatsApp.
              </p>
              <a 
                href="https://api.whatsapp.com/send/?phone=252633227084&text&type=phone_number&app_absent=0" 
                target="_blank" rel="noopener noreferrer"
                className="mt-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors relative z-10 flex items-center"
              >
                Join WhatsApp Group <ChevronRight className="w-5 h-5 ml-1" />
              </a>
            </div>

            <div className="bg-sky-50 rounded-[32px] p-8 md:p-12 border border-sky-100 flex flex-col items-start relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform">
                <Send className="w-64 h-64 text-sky-600" />
              </div>
              <div className="w-16 h-16 bg-sky-500 text-white rounded-2xl flex items-center justify-center mb-6 relative z-10 shadow-lg shadow-sky-500/30">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 relative z-10">Get Instant Updates</h3>
              <p className="text-slate-600 font-medium mb-8 text-lg relative z-10 max-w-sm">
                Subscribe to our Telegram channel for the latest news, exam updates, and app releases.
              </p>
              <a 
                href="#" 
                target="_blank" rel="noopener noreferrer"
                className="mt-auto px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-colors relative z-10 flex items-center"
              >
                Subscribe to Telegram <ChevronRight className="w-5 h-5 ml-1" />
              </a>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 14: FINAL APP DOWNLOAD CTA (Existing)
        ========================================= */}
        <section className="px-4 sm:px-6 lg:px-8 pb-24">
          <div className="max-w-5xl mx-auto bg-blue-700 rounded-[40px] p-10 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            
            <h2 className="text-4xl md:text-5xl font-black mb-6 relative z-10 tracking-tight">Ready to Score Higher?</h2>
            <p className="text-xl text-blue-100 font-medium mb-10 max-w-2xl mx-auto relative z-10">
              The ultimate exam toolkit is one tap away. Get instant access to all resources by downloading the app now or opening the web dashboard.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <a 
                href="https://play.google.com/store/apps/details?id=com.ardaycaawiye.app"
                target="_blank" rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 bg-white text-blue-900 hover:bg-slate-50 rounded-2xl font-black text-lg shadow-xl transition-transform hover:scale-105 flex items-center justify-center"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-8 mr-2" />
              </a>
              <button 
                disabled
                className="w-full sm:w-auto px-8 py-4 bg-blue-800/50 border border-blue-600 text-blue-300 rounded-2xl font-bold text-lg flex items-center justify-center cursor-not-allowed"
              >
                App Store (Coming Soon)
              </button>
            </div>
            
            <div className="mt-8 relative z-10">
              <Link href="/dashboard" className="text-blue-200 hover:text-white font-bold underline underline-offset-4">
                Or continue using the Web Version
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* =========================================
          FOOTER (Existing)
      ========================================= */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight text-blue-900">ArdayCaawiye</span>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
                Your dedicated partner for academic success. We provide students with a comprehensive digital library of past exams, textbooks, and study guides. Our mission is to make quality educational resources accessible to every student.
              </p>
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-6 uppercase tracking-wider text-sm">Quick Links</h4>
              <ul className="space-y-4">
                <li><Link href="/" className="text-slate-500 font-medium hover:text-blue-700 transition">Home</Link></li>
                <li><Link href="/dashboard" className="text-slate-500 font-medium hover:text-blue-700 transition">Exams</Link></li>
                <li><Link href="/dashboard" className="text-slate-500 font-medium hover:text-blue-700 transition">Books</Link></li>
                <li><Link href="/dashboard" className="text-slate-500 font-medium hover:text-blue-700 transition">Scholarships</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-6 uppercase tracking-wider text-sm">Company</h4>
              <ul className="space-y-4">
                <li><Link href="/dashboard" className="text-slate-500 font-medium hover:text-blue-700 transition">About Us</Link></li>
                <li><Link href="/dashboard" className="text-slate-500 font-medium hover:text-blue-700 transition">Blog</Link></li>
                <li><Link href="/dashboard" className="text-slate-500 font-medium hover:text-blue-700 transition">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between text-sm font-bold text-slate-400">
            <p>© {new Date().getFullYear()} ArdayCaawiye. Developed by Hiigsitech.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/dashboard" className="hover:text-blue-700 transition">Privacy Policy</Link>
              <Link href="/dashboard" className="hover:text-blue-700 transition">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Small Reusable Components ---

function StatBlock({ value, label, highlight = false }: { value: string, label: string, highlight?: boolean }) {
  return (
    <div className="text-center px-2 py-4">
      <p className={`text-4xl lg:text-5xl font-black mb-1 tracking-tight ${highlight ? 'text-blue-600' : 'text-slate-900'}`}>{value}</p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <Link href="/dashboard" className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 hover:-translate-y-2 transition-all group">
      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-500 font-medium">{desc}</p>
    </Link>
  );
}

function StepCard({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm text-center flex flex-col items-center hover:shadow-xl hover:-translate-y-2 transition-all">
      <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-black mb-6 shadow-xl shadow-blue-600/30">
        {number}
      </div>
      <h3 className="text-2xl font-black text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-500 font-medium">{desc}</p>
    </div>
  );
}

function FaqCard({ q, a }: { q: string, a: string }) {
  return (
    <div className="bg-slate-50 p-6 md:p-8 rounded-[24px] border border-slate-200">
      <div className="flex items-start">
        <HelpCircle className="w-6 h-6 text-blue-600 mr-4 shrink-0 mt-1" />
        <div>
          <h3 className="font-black text-lg text-slate-800 mb-2">{q}</h3>
          <p className="text-slate-500 font-medium leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ text, name }: { text: string, name: string }) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
      <div className="flex text-amber-400 mb-6">
        <Star className="w-5 h-5 fill-amber-400" /><Star className="w-5 h-5 fill-amber-400" /><Star className="w-5 h-5 fill-amber-400" /><Star className="w-5 h-5 fill-amber-400" /><Star className="w-5 h-5 fill-amber-400" />
      </div>
      <p className="text-slate-700 font-medium text-lg leading-relaxed mb-8 flex-1">"{text}"</p>
      <div className="flex items-center border-t border-slate-100 pt-6">
        <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black mr-4"><Users className="w-6 h-6" /></div>
        <p className="font-bold text-slate-900">{name}</p>
      </div>
    </div>
  );
}