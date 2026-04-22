"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; // Adjust the path to your firebase config
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function OnboardingPage() {
  const router = useRouter();

  // User State
  const [userId, setUserId] = useState<string | null>(null);

  // Data State
  const [grades, setGrades] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  // Selection State
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Fallbacks just in case Firestore collections are empty or missing
  const fallbackGrades = ["Form 4", "Grade 8", "Grade 6"];
  const fallbackRegions = ["Somaliland", "Somalia", "Puntland", "Banaadir", "Ethiopia"];

  useEffect(() => {
    // 1. Ensure the user is logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth"); // Redirect to login if they aren't authenticated
      } else {
        setUserId(user.uid);
        fetchOnboardingData();
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchOnboardingData = async () => {
    try {
      // 2. Fetch Grades from Firestore
      const gradesSnapshot = await getDocs(collection(db, "grades"));
      if (!gradesSnapshot.empty) {
        setGrades(gradesSnapshot.docs.map((doc) => doc.data().name));
      } else {
        setGrades(fallbackGrades);
      }

      // 3. Fetch Regions from Firestore
      const regionsSnapshot = await getDocs(collection(db, "regions"));
      if (!regionsSnapshot.empty) {
        setRegions(regionsSnapshot.docs.map((doc) => doc.data().name));
      } else {
        setRegions(fallbackRegions);
      }
    } catch (err) {
      console.error("Error fetching onboarding data:", err);
      // Use fallbacks if there's a permission or network error
      setGrades(fallbackGrades);
      setRegions(fallbackRegions);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!selectedGrade || !selectedRegion) {
      setError("Please select both your Grade and your Region.");
      return;
    }

    if (!userId) return;

    setIsSaving(true);
    setError("");

    try {
      // 4. Update the exact User document with the selected demographics
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        grade: selectedGrade,
        region: selectedRegion,
        onboardingCompleted: true, // Optional flag for route guards
        updatedAt: new Date(),
      });

      // 5. Navigate to Dashboard upon success
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError("Failed to save your profile. Please try again.");
      setIsSaving(false);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Welcome to Arday Caawiye!
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Let's personalize your learning experience. Select your current level and location below.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 space-y-12 border border-slate-100">
          
          {/* Grade Selection Section */}
          <section>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14v7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">What grade are you in?</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {grades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-center font-medium
                    ${selectedGrade === grade 
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md transform scale-[1.02]' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </section>

          {/* Region Selection Section */}
          <section>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Where are you studying?</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {regions.map((region) => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-center font-medium
                    ${selectedRegion === region 
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md transform scale-[1.02]' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </section>

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-100">
            <button
              onClick={handleCompleteSetup}
              disabled={isSaving}
              className="w-full flex items-center justify-center py-4 px-8 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
            >
              {isSaving ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Complete Setup"
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}