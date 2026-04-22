"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FileText, 
  Library, 
  User, 
  PlaySquare, 
  Gamepad2 
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  // Hide the navigation bar on Auth, Onboarding, Admin, and active Arena Matches
  const hiddenRoutes = ["/auth", "/login", "/signup", "/onboarding", "/admin", "/arena/match"];
  const isHidden = hiddenRoutes.some(route => pathname.startsWith(route));

  // Also hide it if we are deep inside a full-screen PDF viewer to maximize screen real estate
  // (Assuming your specific lesson/exam viewer uses dynamic IDs like /lessons/123)
  const isFullScreenViewer = 
    (pathname.includes("/lessons/") && pathname.split("/").length > 2) || 
    (pathname.includes("/exams/") && pathname.split("/").length > 2);

  if (isHidden || isFullScreenViewer) {
    return null;
  }

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Lessons", href: "/lessons", icon: PlaySquare },
    { name: "Exams", href: "/exams", icon: FileText },
    { name: "Gamee", href: "/arena", icon: Gamepad2 },
    { name: "Library", href: "/library", icon: Library },
    { name: "Profile", href: "/settings", icon: User }, // Renamed from Settings
  ];

  return (
    // The container positions the pill. 
    // Mobile: Floats slightly above the bottom edge (bottom-4) with side margins.
    // Desktop: Floats higher (bottom-8) and centers perfectly.
    <div className="fixed bottom-4 left-2 right-2 z-50 pointer-events-none md:bottom-8 md:left-1/2 md:right-auto md:-translate-x-1/2 flex justify-center">
      
      {/* The Glassmorphic Pill 
        Uses heavy backdrop blur (2xl), a semi-transparent white background, 
        and a delicate white border to create an ultra-modern frosted glass effect.
      */}
      <nav className="pointer-events-auto w-full max-w-[400px] md:max-w-none md:w-auto bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[2rem] px-2 py-2 md:px-4 md:py-2.5">
        <div className="flex justify-between items-center h-[60px] md:h-12 md:space-x-2">
          {navItems.map((item) => {
            // Check if active. For Home, it must be exact. For others, it checks if the URL starts with it.
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`relative flex flex-col md:flex-row items-center justify-center w-full h-full md:h-auto md:w-auto md:px-4 md:py-2 rounded-2xl md:rounded-full group transition-all duration-300 ${
                  isActive ? "md:bg-blue-600/10" : "hover:bg-white/40"
                }`}
              >
                
                {/* Active Indicator Glow (Mobile: gentle background glow) */}
                {isActive && (
                  <div className="absolute inset-1 bg-blue-500/10 rounded-2xl md:hidden -z-10"></div>
                )}

                {/* Icon Wrapper with bounce animation */}
                <div className={`transition-transform duration-300 ${isActive ? '-translate-y-0.5 md:translate-y-0' : 'group-hover:scale-110'}`}>
                  <Icon 
                    className={`w-5 h-5 md:w-5 md:h-5 mb-1 md:mb-0 md:mr-2 transition-colors ${
                      isActive 
                        ? 'text-blue-600 drop-shadow-[0_2px_8px_rgba(37,99,235,0.3)]' 
                        : 'text-slate-500 group-hover:text-blue-500'
                    }`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                
                {/* Text Label - Dynamically scaled to fit 6 tabs */}
                <span className={`text-[9px] sm:text-[10px] md:text-sm font-bold transition-all duration-300 ${
                  isActive 
                    ? 'text-blue-700 tracking-wide' 
                    : 'text-slate-500 group-hover:text-blue-600'
                }`}>
                  {item.name}
                </span>

                {/* Active Dot Indicator (Mobile Only) */}
                {isActive && (
                  <div className="absolute bottom-0.5 w-1 h-1 bg-blue-600 rounded-full md:hidden shadow-[0_0_8px_rgba(37,99,235,0.8)]"></div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}