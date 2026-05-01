"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase"; // Adjust path if needed
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, 
  doc, serverTimestamp, query, orderBy, getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  BookOpen, Plus, Edit, Trash2, ArrowLeft, Search, 
  UploadCloud, Save, Loader2, Image as ImageIcon, Link as LinkIcon, Star, ShieldAlert
} from "lucide-react";

export default function BookManagementPage() {
  // --- Security State ---
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);

  // --- Data State ---
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // --- UI State ---
  const [view, setView] = useState<"list" | "form">("list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- Form State ---
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pages, setPages] = useState("");
  const [language, setLanguage] = useState("so"); // Default Somali
  const [audioLink, setAudioLink] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // --- Files State ---
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCover, setExistingCover] = useState("");

  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentLink, setContentLink] = useState(""); // Can be manual URL or uploaded file URL

  // ==========================================
  // 1. AUTHENTICATION & ACCESS CONTROL
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setHasAccess(false);
        setIsLoadingAccess(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.data()?.role?.toLowerCase() || "user";
        if (["sadmin", "admin", "badmin"].includes(role)) {
          setHasAccess(true);
          fetchData(); // Load data if authorized
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        setHasAccess(false);
      } finally {
        setIsLoadingAccess(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // 2. DATA FETCHING
  // ==========================================
  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      // Fetch Categories
      const catSnap = await getDocs(collection(db, "categories"));
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Books
      const bookQ = query(collection(db, "books"), orderBy("createdAt", "desc"));
      const bookSnap = await getDocs(bookQ);
      setBooks(bookSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // ==========================================
  // 3. CRUD OPERATIONS
  // ==========================================
  const uploadToStorage = async (file: File, folder: string) => {
    const storage = getStorage();
    const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !categoryId) return alert("Please fill required fields.");
    setIsSubmitting(true);

    try {
      let finalCoverUrl = existingCover;
      let finalContentUrl = contentLink;

      // Upload Cover if new file selected
      if (coverFile) {
        finalCoverUrl = await uploadToStorage(coverFile, "book_covers");
      }
      // Upload Content if new file selected
      if (contentFile) {
        finalContentUrl = await uploadToStorage(contentFile, "book_contents");
      }

      const payload = {
        title,
        author,
        description,
        categoryId,
        pages: parseInt(pages) || 0,
        language,
        link: audioLink, // Firebase structure expects "link" for audio
        coverUrl: finalCoverUrl,
        contentUrl: finalContentUrl,
        isFeatured,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "books", editingId), payload);
      } else {
        await addDoc(collection(db, "books"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      await fetchData();
      resetForm();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save book.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, bookTitle: string) => {
    if (!confirm(`Are you sure you want to completely delete "${bookTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, "books", id));
      setBooks(books.filter(b => b.id !== id));
    } catch (error) {
      alert("Failed to delete book.");
    }
  };

  // ==========================================
  // 4. UTILS & HANDLERS
  // ==========================================
  const openEdit = (book: any) => {
    setEditingId(book.id);
    setTitle(book.title || "");
    setAuthor(book.author || "");
    setDescription(book.description || "");
    setCategoryId(book.categoryId || "");
    setPages(book.pages?.toString() || "");
    setLanguage(book.language || "so");
    setAudioLink(book.link || "");
    setIsFeatured(book.isFeatured || false);
    setExistingCover(book.coverUrl || "");
    setCoverPreview(book.coverUrl || null);
    setContentLink(book.contentUrl || "");
    setCoverFile(null);
    setContentFile(null);
    setView("form");
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setAuthor(""); setDescription(""); setCategoryId("");
    setPages(""); setLanguage("so"); setAudioLink(""); setIsFeatured(false);
    setCoverFile(null); setCoverPreview(null); setExistingCover("");
    setContentFile(null); setContentLink("");
    setView("list");
  };

  // ==========================================
  // 5. RENDER UI
  // ==========================================
  if (isLoadingAccess) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0164E5]" /></div>;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-black">Access Denied</h1>
        <p className="text-gray-500 mt-2">You lack the necessary permissions to manage the library.</p>
        <button onClick={() => window.history.back()} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-gray-900 dark:bg-[#0A0A0A] dark:text-white pb-20">
      
      {/* --- HEADER --- */}
      <header className="flex h-20 items-center justify-between px-6 pt-4 max-w-6xl mx-auto">
        <button onClick={() => view === "form" ? resetForm() : window.history.back()} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-black tracking-[0.2em] text-[#0164E5]">LIBRARY TERMINAL</h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto mt-4 max-w-6xl px-6">
        
        {/* ==================== LIST VIEW ==================== */}
        {view === "list" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input 
                  type="text" placeholder="Search books..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 outline-none focus:ring-2 focus:ring-[#0164E5] transition"
                />
              </div>
            <button onClick={() => { resetForm(); setView("form"); }} className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-[#0164E5] to-[#00C6FF] text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:opacity-90 transition flex items-center justify-center gap-2">
  <Plus size={20} /> Add New Book
</button>
            </div>

            {/* Data Grid */}
            {isLoadingData ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase())).map((book) => (
                  <div key={book.id} className="group relative bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[24px] p-4 flex gap-4 transition hover:shadow-xl dark:hover:bg-white/10">
                    <img src={book.coverUrl || "https://via.placeholder.com/150"} alt={book.title} className="w-24 h-32 object-cover rounded-xl shadow-sm" />
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg leading-tight line-clamp-2">{book.title}</h3>
                          {book.isFeatured && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{book.author}</p>
                        <p className="text-xs font-semibold text-[#0164E5] mt-2 bg-blue-50 dark:bg-blue-500/10 inline-block px-2 py-1 rounded-md">
                          {categories.find(c => c.id === book.categoryId)?.name || "Unknown"}
                        </p>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => openEdit(book)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-[#0164E5] hover:text-white transition text-gray-600 dark:text-gray-300">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(book.id, book.title)} className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== FORM VIEW ==================== */}
        {view === "form" && (
          <form onSubmit={handleSave} className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8 max-w-4xl mx-auto">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black">{editingId ? "Edit Book" : "Publish New Book"}</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-500">Featured</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0164E5]"></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Col: Media Uploads */}
              <div className="space-y-6 md:col-span-1">
                {/* Cover Image */}
                <div className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 rounded-[24px]">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Cover Image *</label>
                  <label className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden ${coverPreview ? 'border-[#0164E5]' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                    {coverPreview ? (
                      <img src={coverPreview} className="absolute inset-0 w-full h-full object-cover" alt="Cover" />
                    ) : (
                      <div className="text-center px-4">
                        <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <span className="text-sm font-bold text-gray-500">Upload Cover</span>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
                    }} />
                  </label>
                </div>
              </div>

              {/* Right Col: Details */}
              <div className="md:col-span-2 space-y-6">
                
                <div className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-6 rounded-[24px] space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Book Title *</label>
                      <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#0164E5] transition" placeholder="Atomic Habits" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Author *</label>
                      <input required type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#0164E5] transition" placeholder="James Clear" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Category *</label>
                      <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#0164E5] transition appearance-none">
                        <option value="" disabled>Select...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Language</label>
                      <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#0164E5] transition appearance-none">
                        <option value="so">Somali</option>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Pages</label>
                      <input type="number" value={pages} onChange={(e) => setPages(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#0164E5] transition" placeholder="320" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#0164E5] transition resize-none" placeholder="A brief summary of the book..." />
                  </div>
                </div>

                {/* Digital Assets Section */}
                <div className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-6 rounded-[24px] space-y-5">
                  <h3 className="font-black text-lg flex items-center gap-2"><BookOpen className="text-[#0164E5] w-5 h-5"/> Digital Assets</h3>
                  
                  {/* Content (PDF/JSON) File or URL */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Book Content (PDF or External Link) *</label>
                    <div className="flex gap-3">
                      <input type="text" value={contentFile ? contentFile.name : contentLink} onChange={(e) => { setContentLink(e.target.value); setContentFile(null); }} placeholder="Paste direct URL or upload file ->" className="flex-1 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#0164E5] transition" />
                      <label className="flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl font-bold cursor-pointer hover:bg-gray-200 transition">
                        <UploadCloud className="w-5 h-5 mr-2" /> Upload
                        <input type="file" className="hidden" accept=".pdf,.txt,.json" onChange={(e) => {
                          if(e.target.files?.[0]) setContentFile(e.target.files[0]);
                        }} />
                      </label>
                    </div>
                  </div>

                  {/* Audio Link */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Audiobook Stream URL (Optional)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                      <input type="url" value={audioLink} onChange={(e) => setAudioLink(e.target.value)} placeholder="https://your-audio-link.mp3" className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#0164E5] transition" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky Submit Footer */}
            <div className="sticky bottom-6 z-50 pt-4">
              <button type="submit" disabled={isSubmitting} className="w-full py-5 px-6 bg-gradient-to-r from-[#0164E5] to-[#00C6FF] text-white rounded-2xl font-black text-xl transition-all shadow-[0_10px_40px_-10px_rgba(1,100,229,0.5)] flex items-center justify-center hover:-translate-y-1 disabled:opacity-70">
                {isSubmitting ? <><Loader2 className="w-6 h-6 animate-spin mr-3" /> Saving to Library...</> : <><Save className="w-6 h-6 mr-3" /> {editingId ? "Update Book" : "Publish Book"}</>}
              </button>
            </div>

          </form>
        )}
      </main>
    </div>
  );
}