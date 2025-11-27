import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Bug,
  Sparkles,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useTeamStore } from '../store/teamStore';
import { useNotesStore } from '../store/notesStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const typeIcons: Record<string, any> = {
  note: FileText,
  task: CheckSquare,
  bug: Bug,
  feature: Sparkles,
};

const typeColors: Record<string, string> = {
  note: 'text-blue-400',
  task: 'text-yellow-400',
  bug: 'text-red-400',
  feature: 'text-purple-400',
};

export function Team() {
  const navigate = useNavigate();
  const { members, fetchMembers, isLoading } = useTeamStore();
  const { notes, fetchNotes } = useNotesStore();

  useEffect(() => {
    fetchMembers();
    fetchNotes();
  }, [fetchMembers, fetchNotes]);

  // Obtener última actividad de cada usuario
  const getMemberStats = (memberId: string) => {
    const memberNotes = notes.filter(n => n.created_by === memberId);
    const lastNote = memberNotes[0]; // Ya están ordenadas por fecha desc
    const totalNotes = memberNotes.length;
    const pendingTasks = memberNotes.filter(n => n.type === 'task' && n.status === 'pending').length;
    const completedTasks = memberNotes.filter(n => n.status === 'completed').length;
    
    return { lastNote, totalNotes, pendingTasks, completedTasks };
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Users size={28} />
          Equipo
        </h1>
        <p className="text-gray-400 mt-1">
          {members.length} miembro{members.length !== 1 ? 's' : ''} del equipo
        </p>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => {
          const stats = getMemberStats(member.id);
          const LastIcon = stats.lastNote ? typeIcons[stats.lastNote.type] || FileText : null;

          return (
            <div
              key={member.id}
              className="bg-[#181825] rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Header del card */}
              <div className="p-5 border-b border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                    {member.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{member.full_name}</h3>
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <Mail size={14} />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1">
                      <Calendar size={12} />
                      <span>
                        Desde {format(new Date(member.created_at || new Date()), "MMM yyyy", { locale: es })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x divide-gray-700 bg-[#11111b]">
                <div className="p-3 text-center">
                  <p className="text-xl font-bold text-white">{stats.totalNotes}</p>
                  <p className="text-xs text-gray-500">Creadas</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-xl font-bold text-yellow-400">{stats.pendingTasks}</p>
                  <p className="text-xs text-gray-500">Pendientes</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-xl font-bold text-green-400">{stats.completedTasks}</p>
                  <p className="text-xs text-gray-500">Completadas</p>
                </div>
              </div>

              {/* Última actividad */}
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Clock size={12} />
                  Última actividad
                </p>
                {stats.lastNote ? (
                  <div
                    onClick={() => navigate(`/notes/${stats.lastNote.id}`)}
                    className="flex items-center gap-3 p-3 bg-[#11111b] rounded-lg hover:bg-[#1e1e2e] cursor-pointer transition-colors"
                  >
                    {LastIcon && <LastIcon size={18} className={typeColors[stats.lastNote.type]} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{stats.lastNote.title}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(stats.lastNote.created_at), "d MMM 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-3">
                    Sin actividad reciente
                  </p>
                )}
              </div>

              {/* Badge de rol */}
              <div className="px-4 pb-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  member.role === 'admin' 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {member.role === 'admin' ? 'Administrador' : 'Desarrollador'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {members.length === 0 && (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No hay miembros</h3>
          <p className="text-gray-500">
            Los usuarios aparecerán aquí cuando se registren.
          </p>
        </div>
      )}
    </div>
  );
}
