"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore";
import { 
  ArrowRightCircle, 
  Database, 
  CheckSquare, 
  Square,
  AlertTriangle,
  RefreshCw,
  FolderInput,
  GraduationCap,
  MapPin
} from "lucide-react";

// The 5 collections holding your content
const CONTENT_COLLECTIONS = ["subjects", "lessons", "exams", "quizzes", "generalBooks"];

export default function MigrationTool() {
  const [items, setItems] = useState<any[]>([]);
  const [officialGrades, setOfficialGrades] = useState<any[]>([]);
  const [officialRegions, setOfficialRegions] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);

  // Left Panel State
  const [selectedTag, setSelectedTag] = useState<string>("All"); // Category button filter
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // Array of item IDs

  // Right Panel State
  const [targetRegion, setTargetRegion] = useState("");
  const [targetGrade, setTargetGrade] = useState("");

  // Load everything
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Get Official Dictionaries
      const [gradesSnap, regionsSnap] = await Promise.all([
        getDocs(collection(db, "grades")),
        getDocs(collection(db, "regions"))
      ]);
      setOfficialGrades(gradesSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
      setOfficialRegions(regionsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

      // 2. Scan all 5 content collections
      let allContent: any[] = [];
      for (const colName of CONTENT_COLLECTIONS) {
        const snap = await getDocs(collection(db, colName));
        snap.forEach(doc => {
          allContent.push({
            id: doc.id,
            _collection: colName,
            title: doc.data().title || doc.data().name || "Untitled",
            grade: doc.data().grade || "Unassigned",
            region: doc.data().region || "Unassigned"
          });
        });
      }
      setItems(allContent);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Extract unique messy strings for the horizontal buttons
  const uniqueTags = Array.from(new Set(
    items.flatMap(item => [`Grade: ${item.grade}`, `Region: ${item.region}`])
  )).sort();

  // Filter items based on selected tag
  const filteredItems = items.filter(item => {
    if (selectedTag === "All") return true;
    if (selectedTag.startsWith("Grade: ")) return item.grade === selectedTag.replace("Grade: ", "");
    if (selectedTag.startsWith("Region: ")) return item.region === selectedTag.replace("Region: ", "");
    return true;
  });

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) setSelectedItems([]);
    else setSelectedItems(filteredItems.map(i => i.id));
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // The Bulk Move Execution
  const executeMove = async () => {
    if (selectedItems.length === 0 || !targetGrade || !targetRegion) return;
    setIsMoving(true);

    try {
      const batch = writeBatch(db);
      
      selectedItems.forEach(id => {
        // Find which collection this item belongs to
        const item = items.find(i => i.id === id);
        if (item) {
          const docRef = doc(db, item._collection, id);
          batch.update(docRef, {
            grade: targetGrade,   // Overwriting with official string
            region: targetRegion  // Overwriting with official string
          });
        }
      });

      await batch.commit();

      // Instantly update local UI so they disappear from the "messy" view if changed
      setItems(prev => prev.map(item => {
        if (selectedItems.includes(item.id)) {
          return { ...item, grade: targetGrade, region: targetRegion };
        }
        return item;
      }));

      setSelectedItems([]);
      setTargetGrade("");
      setTargetRegion("");
      alert("Items successfully moved and relinked!");

    } catch (error) {
      console.error("Migration failed:", error);
      alert("Error moving items.");
    } finally {
      setIsMoving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500 animate-pulse">Scanning Database...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex gap-6">
      
      {/* ================================================================= */}
      {/* LEFT PANEL: The Messy Data & Horizontal Categories                  */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col bg-white rounded-[30px] border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center">
              <Database className="w-6 h-6 mr-3 text-indigo-600" /> Content Migration Hub
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Select old string fields and snap them to official collections.</p>
          </div>
          <button onClick={fetchAllData} className="p-3 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Category Buttons */}
        <div className="px-6 py-4 border-b border-slate-100 overflow-x-auto whitespace-nowrap flex gap-3 scrollbar-hide">
          <button 
            onClick={() => { setSelectedTag("All"); setSelectedItems([]); }}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedTag === "All" ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            All Content
          </button>
          {uniqueTags.map(tag => (
            <button 
              key={tag}
              onClick={() => { setSelectedTag(tag); setSelectedItems([]); }}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedTag === tag ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* List of Items */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <button onClick={handleSelectAll} className="flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800">
              {selectedItems.length === filteredItems.length && filteredItems.length > 0 ? <CheckSquare className="w-5 h-5 mr-2" /> : <Square className="w-5 h-5 mr-2" />}
              Select All {filteredItems.length} Items
            </button>
            <span className="text-sm font-bold text-slate-500">{selectedItems.length} selected</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => handleSelectItem(item.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedItems.includes(item.id) ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 bg-white hover:border-indigo-300"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white bg-slate-800 px-2 py-1 rounded-md">
                    {item._collection}
                  </span>
                  <input type="checkbox" checked={selectedItems.includes(item.id)} readOnly className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                </div>
                <h3 className="font-bold text-slate-800 mb-3 truncate" title={item.title}>{item.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg flex items-center">
                    <GraduationCap className="w-3 h-3 mr-1" /> {item.grade}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center">
                    <MapPin className="w-3 h-3 mr-1" /> {item.region}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* RIGHT PANEL: Official Collection Mapper (The Mover)                 */}
      {/* ================================================================= */}
      <div className="w-[400px] bg-slate-900 rounded-[30px] shadow-2xl p-6 flex flex-col relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-600/30 to-transparent pointer-events-none"></div>

        <div className="mb-8 relative">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/40">
            <FolderInput className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Target Destination</h2>
          <p className="text-slate-400 font-medium text-sm mt-2">Move the {selectedItems.length} selected items to official DB categories.</p>
        </div>

        {selectedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <AlertTriangle className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-500 font-bold">Select items from the left panel to begin.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Step 1: Target Region */}
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                <MapPin className="w-4 h-4 mr-2 text-indigo-400" /> 1. Select Official Region
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {officialRegions.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setTargetRegion(r.name)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${targetRegion === r.name ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Target Grade */}
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                <GraduationCap className="w-4 h-4 mr-2 text-indigo-400" /> 2. Select Official Grade
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {officialGrades.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setTargetGrade(g.name)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${targetGrade === g.name ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6">
              <button
                onClick={executeMove}
                disabled={!targetGrade || !targetRegion || isMoving}
                className="w-full flex items-center justify-center px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-emerald-900/20"
              >
                {isMoving ? (
                  <span className="flex items-center"><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Moving Items...</span>
                ) : (
                  <span className="flex items-center">Confirm Move <ArrowRightCircle className="w-5 h-5 ml-2" /></span>
                )}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}