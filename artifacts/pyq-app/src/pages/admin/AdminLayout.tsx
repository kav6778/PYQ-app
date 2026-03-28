import { Link, useRoute } from "wouter";
import { BookOpen, LayoutDashboard, Upload, LogOut, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const [active] = useRoute(href);
  const [subActive] = useRoute(`${href}/:rest*`);
  const isActive = active || (href !== "/admin" && subActive);

  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`}>
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0d0d14] flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/10 flex flex-col bg-black/30 flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Admin Portal</div>
              <div className="text-gray-500 text-xs">{user?.username}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/admin" label="Dashboard" icon={LayoutDashboard} />
          <NavItem href="/admin/upload" label="Upload PDF" icon={Upload} />
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
