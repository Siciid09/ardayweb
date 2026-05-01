"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FolderHeart, Plus, Trash2, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { getDoc } from "firebase/firestore";

export default function CategoryManagementPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📚"); // Default emoji icon
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Check Security Clearance
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.data()?.role?.toLowerCase() || "user";
        if (["sadmin", "admin", "badmin"].includes(role)) {
          setHasAccess(true);
          fetchCategories();
        } else {
          setHasAccess(false);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Categories
  const fetchCategories = async () => {
    const snap = await getDocs(collection(db, "categories"));
    setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // 3. Add Category
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !icon.trim()) return alert("Name and Icon are required!");
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "categories"), {
        name,
        icon,
        createdAt: serverTimestamp(),
      });
      setName("");
      setIcon("📚");
      await fetchCategories();
    } catch (error) {
      alert("Failed to save category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Delete Category
  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Delete the "${catName}" category? Books using this category will lose their filter.`)) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      setCategories(categories.filter(c => c.id !== id));
    } catch {
      alert("Failed to delete.");
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0164E5]" /></div>;
  if (!hasAccess) return <div className="min-h-screen flex items-center justify-center"><ShieldAlert className="w-16 h-16 text-red-500" /></div>;

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-gray-900 dark:bg-[#0A0A0A] dark:text-white pb-20">
      <header className="flex h-20 items-center justify-between px-6 pt-4 max-w-4xl mx-auto">
        <button onClick={() => window.history.back()} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-black tracking-[0.2em] text-[#0164E5]">CATEGORY MANAGEMENT</h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto mt-8 max-w-4xl px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* ADD NEW CATEGORY FORM */}
        <div className="md:col-span-1">
          <form onSubmit={handleSave} className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-6 rounded-[24px] sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl"><FolderHeart className="text-[#0164E5] w-6 h-6" /></div>
              <h2 className="font-black text-xl">New Filter</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Category Name</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Self Help" className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#0164E5] transition" />
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Emoji Icon</label>
                <input required type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. 🧠" className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-2xl outline-none focus:ring-2 focus:ring-[#0164E5] transition text-center" />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-[#0164E5] to-[#00C6FF] text-white rounded-xl font-black transition-all hover:opacity-90 disabled:opacity-70 flex justify-center items-center">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Add Category</>}
              </button>
            </div>
          </form>
        </div>

        {/* ACTIVE CATEGORIES LIST */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-black text-xl mb-6">Active Categories</h3>
          {categories.length === 0 ? (
            <p className="text-gray-500">No categories found. Create one to get started!</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 rounded-[20px] transition hover:shadow-md">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="font-bold text-lg">{cat.name}</span>
                </div>
                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-3 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
}