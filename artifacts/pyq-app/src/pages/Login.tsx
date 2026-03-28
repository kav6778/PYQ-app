import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Shield, User, Eye, EyeOff, Loader2 } from "lucide-react";

type Role = "admin" | "user";

export default function Login() {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>("user");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else {
      setUsername("student");
      setPassword("student123");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 mb-4 shadow-lg shadow-violet-500/30">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">PrepMaster AI</h1>
          <p className="text-gray-400 mt-2 text-sm">AI-extracted PYQs for serious aspirants</p>
        </div>

        {/* Role toggle */}
        <div className="flex rounded-xl bg-white/5 p-1 mb-6 border border-white/10">
          <button
            onClick={() => setRole("user")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              role === "user"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            Student Login
          </button>
          <button
            onClick={() => setRole("admin")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              role === "admin"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            Admin Login
          </button>
        </div>

        {/* Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
          {role === "admin" && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              Admin portal — manage question banks, review extracted data, and approve PDFs.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === "admin" ? "admin" : "student"}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <button
            onClick={fillDemo}
            className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300 transition py-1"
          >
            Use demo credentials →
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          PrepMaster AI · AI-powered exam preparation
        </p>
      </div>
    </div>
  );
}
