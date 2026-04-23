"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  Search, Users, ShieldAlert, Lock, AlertCircle,
  ArrowLeft, CreditCard, MessageCircle, Filter, 
  CheckSquare, CheckCircle2, XCircle
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

const ALLOWED_ROLES = ["admin", "sadmin", "badmin", "hoadmin"];

export default function UserManagementPage() {
  const router = useRouter();

  // --- Auth & Security State ---
  const [currentAdminRole, setCurrentAdminRole] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // --- Data State ---
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // --- Filtering & Selection State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  // ==========================================
  // FETCH DATA & AUTH
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        setIsLoading(true);
        
        // 1. Verify Role Access
        const currentUserDoc = await getDoc(doc(db, "users", user.uid));
        const role = currentUserDoc.data()?.role || "user";
        setCurrentAdminRole(role);

        if (!ALLOWED_ROLES.includes(role)) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);

        // 2. Fetch Users
        const usersRef = collection(db, "users");
        const usersSnap = await getDocs(usersRef);
        
        const fetchedUsers: UserRecord[] = usersSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            email: data.email || "No Email",
            displayName: data.displayName || "No Username",
            phone: data.phone || "",
            role: data.role || "user",
            isPremium: data.isPremium || data.pro || false, 
            isbixiyay: data.isbixiyay || false,             
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          };
        });

        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to verify admin credentials or load users.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Reset selection on filter change
  useEffect(() => setSelectedUsers([]), [searchQuery, filterRole, filterStatus]);

  // ==========================================
  // HANDLERS (The Shadow Logic Trick)
  // ==========================================
  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setActionLoadingId(targetUserId);
    try {
      await updateDoc(doc(db, "users", targetUserId), { role: newRole });
      setUsers(users.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert("Failed to update user role.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePremiumStatusChange = async (targetUserId: string, isPaid: boolean) => {
    setActionLoadingId(targetUserId);
    try {
      const userRef = doc(db, "users", targetUserId);

      if (currentAdminRole === "badmin" || currentAdminRole === "hoadmin") {
        // SUPER ADMINS: Update real Pro status
        await updateDoc(userRef, { isPremium: isPaid, pro: isPaid });
        setUsers(users.map(u => u.id === targetUserId ? { ...u, isPremium: isPaid } : u));
      } else {
        // OTHER ADMINS: Update shadow status
        await updateDoc(userRef, { isbixiyay: isPaid });
        setUsers(users.map(u => u.id === targetUserId ? { ...u, isbixiyay: isPaid } : u));
      }
    } catch (err) {
      alert("Failed to update payment status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBulkStatusChange = async (isPaid: boolean) => {
    if (selectedUsers.length === 0) return;
    setIsUpdatingBulk(true);

    try {
      const isSuperAdmin = currentAdminRole === "badmin" || currentAdminRole === "hoadmin";
      const updateField = isSuperAdmin ? { isPremium: isPaid, pro: isPaid } : { isbixiyay: isPaid };

      const updatePromises = selectedUsers.map(id => updateDoc(doc(db, "users", id), updateField));
      await Promise.all(updatePromises);

      // Update Local State
      setUsers(users.map(u => {
        if (selectedUsers.includes(u.id)) {
          return isSuperAdmin ? { ...u, isPremium: isPaid } : { ...u, isbixiyay: isPaid };
        }
        return u;
      }));

      setSelectedUsers([]);
    } catch (error) {
      alert("Failed to bulk update users.");
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  // ==========================================
  // UTILS & FILTERING
  // ==========================================
  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, ''); // Strip non-numeric chars
    if (!cleanPhone) return alert("No valid phone number found.");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchRole = filterRole ? u.role === filterRole : true;
    
    const paymentStatus = (currentAdminRole === "badmin" || currentAdminRole === "hoadmin") ? u.isPremium : u.isbixiyay;
    const matchStatus = filterStatus === "paid" ? paymentStatus : filterStatus === "unpaid" ? !paymentStatus : true;

    return matchSearch && matchRole && matchStatus;
  });

  const isAllSelected = filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedUsers(filteredUsers.map(u => u.id));
    else setSelectedUsers([]);
  };

  // --- Dynamic Stats Calculations ---
  const totalPaidCount = users.filter(u => 
    (currentAdminRole === "badmin" || currentAdminRole === "hoadmin") ? u.isPremium : u.isbixiyay
  ).length;

  // ==========================================
  // VIEW: LOADING
  // ==========================================
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Syncing Users...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW: ACCESS DENIED (Strict Block)
  // ==========================================
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 text-center animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_40px_rgba(220,38,38,0.3)]">
            <Lock className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Access Denied</h1>
          <p className="text-red-400 font-medium text-lg max-w-md mx-auto mb-8 leading-relaxed">
            Your current role (<span className="text-white uppercase font-bold px-2 py-1 bg-white/10 rounded">{currentAdminRole}</span>) cannot manage users.
          </p>
          <button onClick={() => router.push("/dashboard")} className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-2xl font-black text-lg transition-transform hover:scale-105 shadow-xl">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: USER MANAGEMENT DESK
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28">
      
      {/* 1. Header & Stats Grid */}
      <div className="flex flex-col items-start gap-4 mb-10">
        <button onClick={() => router.push("/admin")} className="flex items-center text-slate-500 hover:text-blue-600 font-bold transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
        </button>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">User Operations</h1>
          <p className="text-slate-500 font-medium text-lg">Manage roles, upgrade accounts, and contact students.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center font-bold shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Users</p>
            <h2 className="text-5xl font-black text-slate-800 tracking-tight">{users.length.toLocaleString()}</h2>
          </div>
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100">
            <Users className="w-8 h-8" />
          </div>
        </div>
        
        {/* Dynamic "Total Paid" Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-8 shadow-lg shadow-emerald-500/20 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest mb-1">Total Paid Accounts</p>
            <h2 className="text-5xl font-black text-white tracking-tight">{totalPaidCount.toLocaleString()}</h2>
          </div>
          <div className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative w-full lg:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium transition-all"
          />
        </div>
        
        <div className="flex gap-4 w-full lg:w-auto">
          <div className="relative w-full lg:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-bold appearance-none cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="reagent">Reagent</option>
              <option value="sadmin">S-Admin</option>
              <option value="badmin">B-Admin</option>
            </select>
          </div>

          <div className="relative w-full lg:w-48">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-bold appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Bulk Actions Toolbar */}
      {selectedUsers.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4 mb-6 shadow-xl shadow-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center text-white font-bold px-2">
            <CheckSquare className="w-5 h-5 mr-3 text-blue-400" />
            {selectedUsers.length} Users Selected
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={() => handleBulkStatusChange(true)}
              disabled={isUpdatingBulk}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Paid
            </button>
            <button 
              onClick={() => handleBulkStatusChange(false)}
              disabled={isUpdatingBulk}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-4 h-4 mr-2" /> Mark Unpaid
            </button>
          </div>
        </div>
      )}

      {/* 4. Data Table */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden relative">
        
        {/* Loading Overlay for Bulk Updates */}
        {isUpdatingBulk && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold flex items-center shadow-2xl">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              Updating Accounts...
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status / Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                
                // Shadow Check
                const displayPaymentStatus = (currentAdminRole === "badmin" || currentAdminRole === "hoadmin") ? user.isPremium : user.isbixiyay;

                return (
                  <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${selectedUsers.includes(user.id) ? 'bg-blue-50/30' : ''}`}>
                    
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => setSelectedUsers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                        className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Profile */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-black shrink-0 border border-blue-200">
                          {user.displayName.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900">{user.displayName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact + WhatsApp */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-700 mb-1">{user.email}</div>
                      <div className="flex items-center">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{user.phone || "No phone"}</span>
                        {user.phone && (
                          <button 
                            onClick={() => openWhatsApp(user.phone)}
                            className="ml-2 p-1.5 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white rounded-lg transition-colors group relative"
                            title="Message on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Role Dropdown */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={actionLoadingId === user.id}
                        className={`text-sm font-bold rounded-xl px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                          ["badmin", "hoadmin"].includes(user.role)
                            ? "bg-purple-50 text-purple-700 border-purple-200" 
                            : ["admin", "sadmin", "reagent"].includes(user.role)
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <option value="user">User</option>
                        <option value="reagent">Reagent</option>
                        <option value="admin">Admin</option>
                        <option value="sadmin">S-Admin</option>
                        {/* Only super users can assign badmin/hoadmin */}
                        {["badmin", "hoadmin"].includes(currentAdminRole) && (
                          <>
                            <option value="badmin">B-Admin</option>
                            <option value="hoadmin">Ho-Admin</option>
                          </>
                        )}
                      </select>
                    </td>

                    {/* Payment Status Dropdown */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={displayPaymentStatus ? "paid" : "unpaid"}
                        onChange={(e) => handlePremiumStatusChange(user.id, e.target.value === "paid")}
                        disabled={actionLoadingId === user.id}
                        className={`text-sm font-bold rounded-xl px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors ${
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
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold text-lg">No users found.</p>
                    <p className="text-slate-400 text-sm">Try adjusting your search or filters.</p>
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