import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchAdminUsersMgmt, updateUserStatusMgmt, generateAdminCode } from "../../lib/api.js";
import { Shield, UserPlus, ShieldCheck, ShieldX, Crown, Users } from "lucide-react";

export default function AdminManagement() {
  const { user: currentUser, logout } = useAuth();
  const { showToast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdminCode, setNewAdminCode] = useState("");
  const [creatingCode, setCreatingCode] = useState(false);

  const isSuperAdmin = currentUser?.email === "yasirfaizan680@gmail.com";

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const data = await fetchAdminUsersMgmt();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to load admins", "error");
      setAdmins([]);
    }
  };

  const handleStatusChange = async (adminId, newStatus) => {
    if (!isSuperAdmin && adminId !== currentUser._id) {
      showToast("Only super admin can change other admin status", "error");
      return;
    }

    try {
      await updateUserStatusMgmt(adminId, newStatus);
      await loadAdmins();
      showToast(`Admin ${newStatus === "Active" ? "activated" : "suspended"} successfully`, "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update status", "error");
    }
  };

  const handleGenerateAdminCode = async () => {
    if (!isSuperAdmin) {
      showToast("Only super admin can generate admin codes", "error");
      return;
    }

    setCreatingCode(true);
    try {
      const data = await generateAdminCode();
      setNewAdminCode(data.code);
      showToast("Admin code generated successfully", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to generate code", "error");
    } finally {
      setCreatingCode(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "text-emerald-400 bg-emerald-400/10";
      case "Suspended": return "text-red-400 bg-red-400/10";
      case "Pending": return "text-amber-400 bg-amber-400/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Active": return <ShieldCheck className="h-3 w-3" />;
      case "Suspended": return <ShieldX className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Admin Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage admin users and their permissions
            </p>
          </div>
          
          {isSuperAdmin && (
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Create Admin
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerateAdminCode}
                disabled={creatingCode}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Shield className="h-4 w-4" />
                {creatingCode ? "Generating..." : "Generate Code"}
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Admin Code Generation */}
      {isSuperAdmin && newAdminCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                New Admin Registration Code
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-bold text-green-600 tracking-wider">
                  {newAdminCode}
                </span>
                <span className="text-sm text-green-600">
                  Share this code with trusted admins
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newAdminCode);
                showToast("Code copied to clipboard", "success");
              }}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Copy
            </button>
          </div>
        </motion.div>
      )}

      {/* Admin Creation Form */}
      {isSuperAdmin && showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl"
        >
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            Create New Admin Account
          </h3>
          <p className="text-blue-600 mb-4">
            Share the admin code above with the person you want to add as an admin. They will use this code during signup.
          </p>
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <div className="text-center">
              <div className="text-6xl mb-2">📧</div>
              <p className="text-gray-700 font-medium">
                Admin code sent to email
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Check your email for the registration code
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Admins List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-600" />
            All Admin Users ({admins.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {Array.isArray(admins) && admins.map((admin, index) => (
            <motion.div
              key={admin._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {admin.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                    {admin.email === "yasirfaizan680@gmail.com" && (
                      <div className="absolute -top-1 -right-1">
                        <Crown className="h-4 w-4 text-yellow-400" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="font-semibold text-gray-900">
                      {admin.name}
                      {admin.email === "yasirfaizan680@gmail.com" && (
                        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                          SUPER ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {admin.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      Joined {new Date(admin.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(admin.status)}`}>
                    {getStatusIcon(admin.status)}
                    {admin.status}
                  </div>
                  
                  {isSuperAdmin && admin._id !== currentUser._id && (
                    <div className="flex gap-2">
                      {admin.status === "Active" ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusChange(admin._id, "Suspended")}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Suspend
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusChange(admin._id, "Active")}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Activate
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
