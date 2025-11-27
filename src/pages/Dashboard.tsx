import { useEffect } from 'react';
import { 
  FileText, 
  CheckSquare, 
  Bug, 
  Sparkles,
  TrendingUp,
  Clock,
  Users
} from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statsCards = [
  { label: 'Total Notas', icon: FileText, color: 'bg-blue-500', key: 'total' },
  { label: 'Tareas Pendientes', icon: CheckSquare, color: 'bg-yellow-500', key: 'tasks' },
  { label: 'Bugs Abiertos', icon: Bug, color: 'bg-red-500', key: 'bugs' },
  { label: 'Features', icon: Sparkles, color: 'bg-purple-500', key: 'features' },
];

export function Dashboard() {
  const { notes, fetchNotes, isLoading } = useNotesStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const stats = {
    total: notes.length,
    tasks: notes.filter(n => n.type === 'task' && n.status !== 'completed').length,
    bugs: notes.filter(n => n.type === 'bug' && n.status !== 'completed').length,
    features: notes.filter(n => n.type === 'feature').length,
  };

  const recentNotes = notes.slice(0, 5);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          ¡Hola, {user?.full_name?.split(' ')[0] || 'Usuario'}! 👋
        </h1>
        <p className="text-gray-400 mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat) => (
          <div
            key={stat.key}
            className="bg-[#181825] rounded-xl p-5 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats[stat.key as keyof typeof stats]}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-[#181825] rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock size={18} />
              Actividad Reciente
            </h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : recentNotes.length > 0 ? (
              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#1e1e2e] transition-colors cursor-pointer"
                  >
                    <div className={`p-2 rounded-lg ${
                      note.type === 'task' ? 'bg-yellow-500/20 text-yellow-400' :
                      note.type === 'bug' ? 'bg-red-500/20 text-red-400' :
                      note.type === 'feature' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {note.type === 'task' ? <CheckSquare size={18} /> :
                       note.type === 'bug' ? <Bug size={18} /> :
                       note.type === 'feature' ? <Sparkles size={18} /> :
                       <FileText size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{note.title}</p>
                      <p className="text-gray-500 text-sm">
                        {format(new Date(note.created_at), "d MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      note.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      note.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      note.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {note.status === 'completed' ? 'Completado' :
                       note.status === 'in_progress' ? 'En progreso' :
                       note.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>No hay notas recientes</p>
                <p className="text-sm mt-1">Crea tu primera nota para empezar</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Team Activity */}
          <div className="bg-[#181825] rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Users size={18} />
                Equipo
              </h2>
            </div>
            <div className="p-4">
              <p className="text-gray-400 text-sm text-center py-4">
                Conecta Supabase para ver la actividad del equipo
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-[#181825] rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <TrendingUp size={18} />
                Progreso Semanal
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Tareas completadas</span>
                    <span className="text-white">0/0</span>
                  </div>
                  <div className="h-2 bg-[#11111b] rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Bugs resueltos</span>
                    <span className="text-white">0/0</span>
                  </div>
                  <div className="h-2 bg-[#11111b] rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
