"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  FileText,
  Filter,
  CheckSquare,
  FolderInput,
  MapPin,
  GraduationCap
} from "lucide-react";

// Helper to map URL type to actual Firebase Collection name
const getCollectionName = (type: string) => {
  switch (type) {
    case "lesson": return "lessons";
    case "exam": return "exams";
    case "subject": return "subjects";
    case "quiz": return "quizzes";
    case "generalBooks": return "generalBooks";
    default: return type;
  }
};

const FALLBACK_GRADES = ["Grade 8", "Form 4"];
const FALLBACK_REGIONS = ["Somaliland", "Somalia", "Puntland", "Ethiopia"];

function ContentListManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "lesson";
  const collectionName = getCollectionName(type);

  // --- Data State ---
  const [items, setItems] = useState<any[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  
  // --- UI State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterRegion, setFilterRegion] = useState("");

  // --- Selection & Bulk Action State ---
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkGrade, setBulkGrade] = useState("");
  const [bulkRegion, setBulkRegion] = useState("");

  // ==========================================
  // FETCH DATA
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch Main Items
        const snap = await getDocs(collection(db, collectionName));
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(fetched);

        // 2. Fetch Grades (with Fallback)
        try {
          const gradesSnap = await getDocs(collection(db, "grades"));
          if (!gradesSnap.empty) setGrades(gradesSnap.docs.map(d => d.data().name));
          else setGrades(FALLBACK_GRADES);
        } catch (e) { setGrades(FALLBACK_GRADES); }

        // 3. Fetch Regions (with Fallback)
        try {
          const regionsSnap = await getDocs(collection(db, "regions"));
          if (!regionsSnap.empty) setRegions(regionsSnap.docs.map(d => d.data().name));
          else setRegions(FALLBACK_REGIONS);
        } catch (e) { setRegions(FALLBACK_REGIONS); }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [collectionName]);

  // Reset selection when filters change to prevent invisible bulk actions
  useEffect(() => {
    setSelectedItems([]);
  }, [searchQuery, filterGrade, filterRegion]);

  // ==========================================
  // FILTERING LOGIC
  // ==========================================
  const filteredItems = items.filter(item => {
    const matchSearch = (item.title || item.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchGrade = filterGrade ? item.grade === filterGrade : true;
    const matchRegion = filterRegion ? item.region === filterRegion : true;
    return matchSearch && matchGrade && matchRegion;
  });

  // ==========================================
  // SELECTION LOGIC
  // ==========================================
  const isAllSelected = filteredItems.length > 0 && selectedItems.length === filteredItems.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedItems(filteredItems.map(i => i.id));
    else setSelectedItems([]);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  // ==========================================
  // ACTIONS
  // ==========================================
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      setItems(items.filter(item => item.id !== id)); 
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } catch (error) {
      alert("Failed to delete item.");
    }
  };

  const handleBulkMove = async (field: "grade" | "region", value: string) => {
    if (!value || selectedItems.length === 0) return;
    
    setIsUpdating(true);
    try {
      // Create an array of update promises
      const updatePromises = selectedItems.map(id => 
        updateDoc(doc(db, collectionName, id), { [field]: value })
      );
      
      await Promise.all(updatePromises);

      // Update local state instantly so UI reflects changes
      setItems(prev => prev.map(item => 
        selectedItems.includes(item.id) ? { ...item, [field]: value } : item
      ));

      // Reset states
      setSelectedItems([]);
      if (field === "grade") setBulkGrade("");
      if (field === "region") setBulkRegion("");
      
    } catch (error) {
      console.error("Bulk update failed:", error);
      alert("Failed to move some items.");
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 sm:px-6">
      
      {/* ==========================================
          HEADER
      ========================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pt-8">
        <div className="flex items-center">
          <button 
            onClick={() => router.push("/admin/content")}
            className="p-2 mr-4 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 capitalize">Manage {type}s</h1>
            <p className="text-slate-500 font-medium text-sm">View, filter, or bulk-move existing content.</p>
          </div>
        </div>
        
        <button 
          onClick={() => type === 'quiz' ? router.push('/admin/content/list/quize') : router.push(`/admin/content/add-edit?type=${type}`)}
          className="flex items-center px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-indigo-600/30 shrink-0"
        >
          <Plus className="w-5 h-5 mr-2" /> Add New {type}
        </button>
      </div>

      {/* ==========================================
          FILTER BAR
      ========================================== */}
      <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={`Search by title...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium transition-all"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-bold appearance-none cursor-pointer"
            >
              <option value="">All Grades</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="relative w-full md:w-48">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-bold appearance-none cursor-pointer"
            >
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ==========================================
          BULK ACTION TOOLBAR (Appears when selected)
      ========================================== */}
      {selectedItems.length > 0 && (
        <div className="bg-indigo-900 rounded-2xl p-4 mb-6 shadow-xl shadow-indigo-900/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center text-white font-bold">
            <CheckSquare className="w-5 h-5 mr-3 text-indigo-400" />
            {selectedItems.length} items selected
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Move to Grade */}
            <div className="flex items-center bg-indigo-950 rounded-xl p-1 border border-indigo-800">
              <GraduationCap className="w-4 h-4 text-indigo-400 ml-3 mr-2 shrink-0" />
              <select 
                value={bulkGrade} 
                onChange={(e) => setBulkGrade(e.target.value)}
                className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer py-2 pr-2"
              >
                <option value="" disabled>Move to Grade...</option>
                {grades.map(g => <option key={g} value={g} className="text-slate-900">{g}</option>)}
              </select>
              <button 
                onClick={() => handleBulkMove("grade", bulkGrade)}
                disabled={!bulkGrade || isUpdating}
                className="ml-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
            </div>

            {/* Move to Region */}
            <div className="flex items-center bg-indigo-950 rounded-xl p-1 border border-indigo-800">
              <FolderInput className="w-4 h-4 text-indigo-400 ml-3 mr-2 shrink-0" />
              <select 
                value={bulkRegion} 
                onChange={(e) => setBulkRegion(e.target.value)}
                className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer py-2 pr-2"
              >
                <option value="" disabled>Move to Region...</option>
                {regions.map(r => <option key={r} value={r} className="text-slate-900">{r}</option>)}
              </select>
              <button 
                onClick={() => handleBulkMove("region", bulkRegion)}
                disabled={!bulkRegion || isUpdating}
                className="ml-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          CONTENT TABLE
      ========================================== */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold">Loading Database...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No items found</h3>
            <p className="text-slate-500">There are no {type}s matching your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            
            {/* Loading overlay for bulk actions */}
            {isUpdating && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold flex items-center shadow-2xl">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Updating Records...
                </div>
              </div>
            )}

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-widest">
                  <th className="p-4 w-12">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 font-black">Title / Name</th>
                  <th className="p-4 font-black hidden sm:table-cell">Grade</th>
                  <th className="p-4 font-black hidden md:table-cell">Region</th>
                  <th className="p-4 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group ${selectedItems.includes(item.id) ? "bg-indigo-50/50" : ""}`}>
                    
                    {/* Checkbox */}
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Title */}
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{item.title || item.name || "Untitled"}</p>
                      <p className="text-xs font-mono text-slate-400 mt-1 sm:hidden">{item.grade} • {item.region}</p>
                    </td>

                    {/* Grade & Region Tags */}
                    <td className="p-4 hidden sm:table-cell">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold whitespace-nowrap">
                        {item.grade || "No Grade"}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold whitespace-nowrap">
                        {item.region || "No Region"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 flex justify-end gap-2">
                      <button 
                        onClick={() => router.push(`/admin/content/add-edit?type=${type}&id=${item.id}`)}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default function ContentListWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold text-slate-500">Loading Manager...</div>}>
      <ContentListManager />
    </Suspense>
  );
}