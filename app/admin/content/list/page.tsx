"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  AlertCircle,
  FileText
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

function ContentListManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "lesson";
  const collectionName = getCollectionName(type);

  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Items
  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const snap = await getDocs(collection(db, collectionName));
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(fetched);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [collectionName]);

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      setItems(items.filter(item => item.id !== id)); // Remove from UI
    } catch (error) {
      alert("Failed to delete item.");
      console.error(error);
    }
  };

  const filteredItems = items.filter(item => 
    (item.title || item.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center">
          <button 
            onClick={() => router.push("/admin/content")}
            className="p-2 mr-4 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 capitalize">Manage {type}s</h1>
            <p className="text-slate-500 font-medium text-sm">View, edit, or delete existing content in the database.</p>
          </div>
        </div>
        
        <button 
          onClick={() => router.push(`/admin/content/add-edit?type=${type}`)}
          className="flex items-center px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold transition-colors shadow-md"
        >
          <Plus className="w-5 h-5 mr-2" /> Add New {type}
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={`Search ${type}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Content Table/List */}
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
            <p className="text-slate-500">There are no {type}s matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-widest">
                  <th className="p-4 font-black">Title / Name</th>
                  <th className="p-4 font-black">ID</th>
                  <th className="p-4 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <td className="p-4 font-bold text-slate-800">
                      {item.title || item.name || "Untitled"}
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-400">
                      {item.id.substring(0, 8)}...
                    </td>
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