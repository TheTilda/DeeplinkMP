import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  Link2, PlusCircle, BarChart3, Settings, LogOut, Zap,
  ChevronRight, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import CreateLink from './pages/CreateLink';
import LinkAnalytics from './pages/LinkAnalytics';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import SettingsPage from './pages/Settings';

const NAV = [
  { path: '/',          label: 'Ссылки',     icon: Link2,      end: true },
  { path: '/create',    label: 'Создать',    icon: PlusCircle, end: false },
  { path: '/analytics', label: 'Аналитика',  icon: BarChart3,  end: false },
  { path: '/settings',  label: 'Настройки',  icon: Settings,   end: false },
];

function Sidebar({ onClose }) {
  const { username, logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-base leading-none">DeepLinker</span>
            <div className="text-[10px] text-brand-600 font-medium mt-0.5">marketplace links</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ path, label, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span>{label}</span>
            {path === '/create' && (
              <span className="ml-auto">
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{username}</div>
            <div className="text-xs text-gray-400">Администратор</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-600 mt-0.5"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span>Выйти</span>
        </button>
      </div>
    </div>
  );
}

function Shell() {
  const { isAuth, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-subtle">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md animate-pulse">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <p className="text-sm text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuth) return <Login />;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-subtle">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 xl:w-64 shrink-0 flex-col border-r border-gray-100 bg-white">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-white shadow-modal animate-slide-up">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-gray-100 bg-white shrink-0">
          <button onClick={() => setMobileOpen(true)} className="btn-icon btn-ghost">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
            <span className="font-bold text-gray-900">DeepLinker</span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8 animate-fade-in">
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/create"    element={<CreateLink />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/links/:id" element={<LinkAnalytics />} />
              <Route path="/settings"  element={<SettingsPage />} />
              <Route path="*"          element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
