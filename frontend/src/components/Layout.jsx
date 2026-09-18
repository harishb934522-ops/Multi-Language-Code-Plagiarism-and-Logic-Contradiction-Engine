import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { Sun, Moon, Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function Layout({ children, role }) {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    signOut(() => navigate('/choose-role'));
  };

  const navItems = [
    { name: 'Dashboard', path: role === 'tutor' ? '/tutor-dashboard' : '/student-dashboard', icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200 flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-[var(--color-surface-hover)]">
            <Menu size={24} />
          </button>
          <span className="font-bold text-lg">CodeEngine</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-[var(--color-surface-hover)]">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-[var(--color-border)]">
            <span className="font-bold text-xl hidden md:block">CodeEngine</span>
            <span className="font-bold text-xl md:hidden">Menu</span>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 -mr-2 rounded-md hover:bg-[var(--color-surface-hover)]">
              <X size={24} />
            </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path || (location.pathname.startsWith(item.path) && location.pathname !== item.path && item.path !== '/tutor-dashboard' && item.path !== '/student-dashboard');
              // More precise active state logic for dashboard
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-[var(--color-accent)] text-white' 
                      : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-[var(--color-border)] space-y-4">
            <div className="hidden md:flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">Theme</span>
              <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-[var(--color-surface-hover)] bg-[var(--color-bg)]">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
            <div className="hidden md:flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">Account</span>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--color-bg)]">
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
