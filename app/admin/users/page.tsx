"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase"; // Adjust path to your firebase config
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  Search, 
  Users, 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  MoreVertical
} from "lucide-react";

// --- Interfaces ---
interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  role: string;
  isPremium: boolean;
  isbixiyay: boolean;
  createdAt: Date | null;
}

export default function UserManagementPage() {
  // --- State ---
  const [currentAdminRole, setCurrentAdminRole] = useState<string>("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchUsers = async (adminRole: string) => {
    try {
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      
      const fetchedUsers: UserRecord[] = usersSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || "No Email",
          displayName: data.displayName || "No Username",
          phone: data.phone || "No Phone",
          role: data.role || "user",
          isPremium: data.isPremium || data.pro || false, // Core field
          isbixiyay: data.isbixiyay || false,             // Shadow field
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
        };
      });

      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load user data.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        setIsLoading(true);
        // 1. Get the current Admin's Role
        const currentUserDoc = await getDoc(doc(db, "users", user.uid));
        const role = currentUserDoc.data()?.role || "user";
        setCurrentAdminRole(role);

        // 2. Fetch all users for the table
        await fetchUsers(role);
      } catch (err) {
        console.error("Auth initialization error:", err);
        setError("Failed to verify admin credentials.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Handlers: The Shadow Logic Trick ---
  
  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    // Optional: Only allow 'badmin' to change roles, or let anyone do it based on your security needs.
    setActionLoadingId(targetUserId);
    try {
      await updateDoc(doc(db, "users", targetUserId), { role: newRole });
      
      // Update local state to reflect UI instantly
      setUsers(users.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Failed to update user role.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePremiumStatusChange = async (targetUserId: string, isPaid: boolean) => {
    setActionLoadingId(targetUserId);
    try {
      const userRef = doc(db, "users", targetUserId);

      if (currentAdminRole === "badmin") {
        // SUPER ADMIN: Write to the real core premium fields
        await updateDoc(userRef, { 
          isPremium: isPaid, 
          pro: isPaid 
        });
        
        setUsers(users.map(u => u.id === targetUserId ? { ...u, isPremium: isPaid } : u));
      } else {
        // OTHER ADMINS: Intercept and write ONLY to the shadow field
        await updateDoc(userRef, { 
          isbixiyay: isPaid 
        });
        
        setUsers(users.map(u => u.id === targetUserId ? { ...u, isbixiyay: isPaid } : u));
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
      alert("Failed to update payment status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- Filtering ---
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- UI Components ---
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading User Database...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* 1. Header & Conditional Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">User Management</h1>
          <p className="text-slate-500 font-medium">Manage accounts, roles, and payment statuses.</p>
        </div>

        {/* The Trick: Only badmin sees the exact total count of real Pro users here */}
        {currentAdminRole === "badmin" && (
          <div className="bg-white border border-indigo-100 rounded-2xl p-4 flex items-center shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mr-4">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Real Pros</p>
              <p className="text-2xl font-black text-slate-800 leading-none mt-1">
                {users.filter(u => u.isPremium).length}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* 2. Controls Bar (Search) */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by email, name, or User ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-800 font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 3. The Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status / Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                
                // --- The UI Trick ---
                // If badmin, the dropdown reads the real isPremium.
                // If any other role, the dropdown reads isbixiyay.
                // Both look EXACTLY the same to the person looking at the screen!
                const displayPaymentStatus = currentAdminRole === "badmin" ? user.isPremium : user.isbixiyay;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* User Details Col */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {user.displayName.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900">{user.displayName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Col */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700">{user.email}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{user.phone || "No phone"}</div>
                    </td>

                    {/* Role Dropdown Col */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={actionLoadingId === user.id}
                        className={`text-sm font-bold rounded-lg px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                          user.role === "badmin" 
                            ? "bg-purple-50 text-purple-700 border-purple-200" 
                            : user.role === "reagent" || user.role === "admin"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <option value="user">User</option>
                        <option value="reagent">Reagent (Manager)</option>
                        {/* Only show badmin option if current user is badmin */}
                        {currentAdminRole === "badmin" && (
                          <option value="badmin">Badmin (Super)</option>
                        )}
                      </select>
                    </td>

                    {/* Payment Status Dropdown Col (The Trick) */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={displayPaymentStatus ? "paid" : "unpaid"}
                        onChange={(e) => handlePremiumStatusChange(user.id, e.target.value === "paid")}
                        disabled={actionLoadingId === user.id}
                        className={`text-sm font-bold rounded-lg px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                          displayPaymentStatus
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <option value="paid">Paid (Pro)</option>
                        <option value="unpaid">Unpaid (Free)</option>
                      </select>
                    </td>

                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}