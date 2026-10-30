import { NavLink, Outlet, Link } from "react-router-dom";
import { BarChart3, ClipboardList, FileText, LayoutDashboard, LogOut, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/admin/signalements", label: "Signalements", icon: ClipboardList, end: false },
  { to: "/admin/analyse", label: "Analyse", icon: BarChart3, end: false },
  { to: "/admin/formulaire", label: "Formulaire", icon: FileText, end: false },
];

export function AdminLayout() {
  const { admin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">ProjetEmma</p>
            <p className="text-[11px] text-slate-500">Administration</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <Link
            to="/"
            className="mb-2 block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Formulaire public
          </Link>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="truncate text-xs font-semibold text-slate-700">
              {admin?.name ?? "Administrateur"}
            </p>
            <p className="truncate text-[11px] text-slate-500">{admin?.email}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/admin" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-slate-900">ProjetEmma</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Quitter
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-500"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
