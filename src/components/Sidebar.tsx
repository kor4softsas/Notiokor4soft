import { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  FileText,
  Video,
  Users,
  Settings,
  LogOut,
  Plus,
  MessageSquare,
  Kanban,
  DollarSign,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { NotificationsDropdown } from './NotificationsDropdown';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/notes', icon: ClipboardList, label: 'Gestión' },
  { to: '/kanban', icon: Kanban, label: 'Kanban' },
  { to: '/calendar', icon: Calendar, label: 'Calendario' },
  { to: '/meetings', icon: Video, label: 'Reuniones' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/expenses', icon: DollarSign, label: 'Gastos' },
  { to: '/notepad', icon: FileText, label: 'Notepad' },
  { to: '/team', icon: Users, label: 'Equipo' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { hasUnreadMessages, unreadCount, checkUnreadMessages, subscribeToAllMessages, markAsRead } = useChatStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar mensajes no leídos al montar y suscribirse a nuevos
  useEffect(() => {
    checkUnreadMessages();
    const unsubscribe = subscribeToAllMessages();
    return () => unsubscribe();
  }, [checkUnreadMessages, subscribeToAllMessages]);

  // Marcar como leído cuando el usuario está en /chat
  useEffect(() => {
    if (location.pathname === '/chat') {
      markAsRead();
    }
  }, [location.pathname, markAsRead]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#181825] border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <img src="/Logo.svg" alt="Kor4Soft" className="h-10" />
          <div>
            <h1 className="text-lg font-bold text-blue-400">Kor4Soft Notes</h1>
            <p className="text-xs text-gray-500">Sistema de seguimiento</p>
          </div>
        </div>
      </div>

      {/* User info + Notifications */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <NotificationsDropdown />
        </div>
      </div>

      {/* Quick action */}
      <div className="p-4">
        <NavLink
          to="/notes/new"
          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Nueva Nota
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const isChat = item.to === '/chat';
          const showBadge = isChat && hasUnreadMessages;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1e1e2e]'
                }`
              }
            >
              <div className="relative">
                <item.icon size={20} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="flex-1">{item.label}</span>
              {showBadge && unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-[#1e1e2e] transition-colors w-full"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
