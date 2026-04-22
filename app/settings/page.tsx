"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { 
  User, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  MapPin, 
  GraduationCap, 
  Phone, 
  Mail,
  Edit2,
  Check,
  X,
  Crown,
  ChevronDown
} from "lucide-react";

// --- Interfaces ---
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  grade: string;
  region: string;
  role: string;
  isPremium: boolean;
  pro: boolean;
}

// --- Instant Optimistic Fallbacks ---
const INITIAL_GRADES = ["Form 4", "Grade 8", "Grade 6"];
const INITIAL_REGIONS = ["Somaliland", "Somalia", "Puntland", "Ethiopia", "Banaadir"];

export default function SettingsPage() {
  const router = useRouter();

  // --- State ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State for Editing
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editRegion, setEditRegion] = useState("");

  // Dropdown Data
  const [grades, setGrades] = useState<string[]>(INITIAL_GRADES);
  const [regions, setRegions] = useState<string[]>(INITIAL_REGIONS);

  // Dropdown UI State
  const [openDropdown, setOpenDropdown] = useState<"grade" | "region" | null>(null);

  // General UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- Data Fetching ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        setIsLoading(true);

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const loadedProfile = {
            uid: user.uid,
            email: data.email || user.email || "",
            displayName: data.displayName || "",
            phone: data.phone || "",
            grade: data.grade || "",
            region: data.region || "",
            role: data.role || "user",
            isPremium: data.isPremium || false,
            pro: data.pro || false,
          };
          setProfile(loadedProfile);
          
          setEditName(loadedProfile.displayName);
          setEditPhone(loadedProfile.phone);
          setEditGrade(loadedProfile.grade);
          setEditRegion(loadedProfile.region);
        }

        const fetchDropdowns = async () => {
          try {
            const [gradesSnap, regionsSnap] = await Promise.all([
              getDocs(collection(db, "grades")),
              getDocs(collection(db, "regions"))
            ]);
            if (!gradesSnap.empty) setGrades(gradesSnap.docs.map(d => d.data().name));
            if (!regionsSnap.empty) setRegions(regionsSnap.docs.map(d => d.data().name));
          } catch (e) {
            console.log("Background sync failed, keeping hardcoded values.");
          }
        };
        fetchDropdowns();

      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // --- Handlers ---
  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    setError("");
    setSuccessMsg("");

    if (!editName.trim()) {
      setError("Name cannot be empty.");
      setIsSaving(false);
      return;
    }

    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        displayName: editName,
        phone: editPhone,
        grade: editGrade,
        region: editRegion,
        updatedAt: new Date(),
      });

      setProfile({ ...profile, displayName: editName, phone: editPhone, grade: editGrade, region: editRegion });
      setSuccessMsg("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/auth");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown]);

  const isAdmin = profile && ["sadmin", "badmin", "hoadmin", "reagent"].includes(profile.role);

  // --- UI Components ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium animate-pulse">Loading settings...</p>
      </div>
    );
  }

  if (!profile) return null;

  // --- THE FIXED DROPDOWN COMPONENT (With z-[999]) ---
  const CustomDropdown = ({ 
    type, options, value, setValue 
  }: { 
    type: "grade" | "region", options: string[], value: string, setValue: (v: string) => void 
  }) => {
    const isOpen = openDropdown === type;
    const displayOptions = Array.from(new Set([value, ...options])).filter(Boolean);

    return (
      <div className={`relative w-full ${isOpen ? 'z-[999]' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : type)}
          className={`w-full px-4 py-3 bg-slate-50 text-slate-900 border ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300'} rounded-xl font-bold flex items-center justify-between transition-all outline-none`}
        >
          <span className="truncate">{value || `Select ${type}`}</span>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
              {displayOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setValue(opt);
                    setOpenDropdown(null);
                  }}
                  className={`w-full px-4 py-3 text-left font-bold flex items-center justify-between transition-colors ${
                    value === opt ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {opt}
                  {value === opt && <Check className="w-5 h-5 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-28 font-sans">
      
      {/* 1. Header */}
      <header className="bg-blue-600 pt-10 pb-20 px-4 sm:px-6 lg:px-8 shadow-md rounded-b-[40px]">
        <div className="max-w-3xl mx-auto flex items-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mr-5">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-1">Account Settings</h1>
            <p className="text-blue-100 font-medium">Manage your profile & preferences</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 space-y-6 relative z-10">
        
        {error && (
          <div className="bg-white border-l-4 border-red-500 text-red-800 p-4 rounded-xl shadow-sm font-bold flex items-center animate-in slide-in-from-top-2">
            <X className="w-6 h-6 mr-3 text-red-500 shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-white border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl shadow-sm font-bold flex items-center animate-in slide-in-from-top-2">
            <Check className="w-6 h-6 mr-3 text-emerald-500 shrink-0" /> {successMsg}
          </div>
        )}

        {/* 2. Admin Card */}
        {isAdmin && (
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between group border border-slate-800">
            <div className="flex items-center mb-4 sm:mb-0 w-full sm:w-auto">
              <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mr-4 shrink-0 shadow-inner">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center">
                  Admin Access 
                  <span className="ml-3 px-2 py-0.5 rounded-md bg-indigo-600 text-indigo-100 text-[10px] uppercase tracking-widest font-black">
                    {profile.role}
                  </span>
                </h3>
                <p className="text-slate-400 font-medium text-sm">Manage platform content and users.</p>
              </div>
            </div>
            <button 
              onClick={() => router.push("/admin")}
              className="w-full sm:w-auto px-6 py-3 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl transition-colors shadow-md"
            >
              Open Dashboard
            </button>
          </div>
        )}

        {/* 3. Profile Card */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-visible">
          
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-[24px]">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center">
              <User className="w-6 h-6 mr-3 text-blue-600" />
              Personal Details
            </h2>
            
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center text-sm font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2.5 rounded-xl transition-colors"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Edit Info
              </button>
            ) : (
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setOpenDropdown(null);
                  }}
                  className="flex items-center text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-4 py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-colors shadow-md disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-b-[24px]">
            
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center mb-2">
                <User className="w-4 h-4 mr-2 text-slate-400" /> Full Name
              </label>
              {isEditing ? (
                <input 
                  type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold"
                />
              ) : (
                <p className="text-lg font-bold text-slate-900 px-1">{profile.displayName}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center mb-2">
                <Mail className="w-4 h-4 mr-2 text-slate-400" /> Email Address
              </label>
              <p className="text-lg font-bold text-slate-600 px-1">{profile.email}</p>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center mb-2">
                <Phone className="w-4 h-4 mr-2 text-slate-400" /> Phone Number
              </label>
              {isEditing ? (
                <input 
                  type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold placeholder:text-slate-400"
                />
              ) : (
                <p className="text-lg font-bold text-slate-900 px-1">{profile.phone || "Not provided"}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center mb-2">
                <Crown className="w-4 h-4 mr-2 text-slate-400" /> Account Tier
              </label>
              <div className="flex items-center px-1">
                {profile.isPremium || profile.pro ? (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-extrabold text-sm flex items-center border border-emerald-300">
                    <Check className="w-4 h-4 mr-1 stroke-[3px]" /> PRO ACTIVE
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-extrabold text-sm border border-slate-300">
                    FREE PLAN
                  </span>
                )}
              </div>
            </div>

            {/* Dropdowns */}
            <div className="relative z-20">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center mb-2">
                <GraduationCap className="w-4 h-4 mr-2 text-slate-400" /> Grade Level
              </label>
              {isEditing ? (
                <CustomDropdown type="grade" options={grades} value={editGrade} setValue={setEditGrade} />
              ) : (
                <p className="text-lg font-bold text-slate-900 px-1">{profile.grade}</p>
              )}
            </div>

            <div className="relative z-10">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center mb-2">
                <MapPin className="w-4 h-4 mr-2 text-slate-400" /> Region
              </label>
              {isEditing ? (
                <CustomDropdown type="region" options={regions} value={editRegion} setValue={setEditRegion} />
              ) : (
                <p className="text-lg font-bold text-slate-900 px-1">{profile.region}</p>
              )}
            </div>

          </div>
        </div>

        {/* 4. Logout Area - Massive pb-48 added so the user can scroll down for the popups! */}
        <div className="pt-6 pb-48">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-4 bg-white border border-slate-300 text-red-600 rounded-2xl font-extrabold hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
          >
            <LogOut className="w-5 h-5 mr-3" /> Log Out of Application
          </button>
        </div>

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}