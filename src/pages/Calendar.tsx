import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckSquare,
  Bug,
  Sparkles,
  FileText,
  Plus,
  Video,
  UserPlus,
} from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { useMeetingsStore } from '../store/meetingsStore';
import { useTeamStore } from '../store/teamStore';
import { useAuthStore } from '../store/authStore';
import { Button, Modal, ModalBody, ModalFooter } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { Note, Meeting } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

const typeIcons: Record<string, any> = {
  task: CheckSquare,
  bug: Bug,
  feature: Sparkles,
  note: FileText,
};

const typeColors: Record<string, string> = {
  task: 'bg-yellow-500',
  bug: 'bg-red-500',
  feature: 'bg-purple-500',
  note: 'bg-blue-500',
};

const statusColors: Record<string, string> = {
  pending: 'border-l-yellow-500',
  in_progress: 'border-l-blue-500',
  completed: 'border-l-green-500',
  cancelled: 'border-l-gray-500',
};

export function Calendar() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notes, fetchNotes } = useNotesStore();
  const { meetings, fetchMeetings, createMeeting } = useMeetingsStore();
  const { members, fetchMembers } = useTeamStore();
  const toast = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
  });
  
  useEffect(() => {
    fetchNotes();
    fetchMeetings();
    fetchMembers();
  }, [fetchNotes, fetchMeetings, fetchMembers]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Agregar días del mes anterior para completar la primera semana
  const startDay = monthStart.getDay();
  const prefixDays = Array.from({ length: startDay }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (startDay - i));
    return date;
  });

  // Agregar días del mes siguiente para completar la última semana
  const endDay = monthEnd.getDay();
  const suffixDays = Array.from({ length: 6 - endDay }, (_, i) => {
    const date = new Date(monthEnd);
    date.setDate(date.getDate() + i + 1);
    return date;
  });

  const allDays = [...prefixDays, ...daysInMonth, ...suffixDays];

  // Agrupar notas por fecha
  const notesByDate = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    notes.forEach((note) => {
      if (note.due_date) {
        const dateKey = note.due_date;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(note);
      }
    });
    return grouped;
  }, [notes]);

  // Agrupar reuniones por fecha
  const meetingsByDate = useMemo(() => {
    const grouped: Record<string, Meeting[]> = {};
    meetings.forEach((meeting) => {
      if (meeting.scheduled_at) {
        const dateKey = format(new Date(meeting.scheduled_at), 'yyyy-MM-dd');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(meeting);
      }
    });
    return grouped;
  }, [meetings]);

  const getNotesForDate = (date: Date): Note[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return notesByDate[dateKey] || [];
  };

  const getMeetingsForDate = (date: Date): Meeting[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return meetingsByDate[dateKey] || [];
  };

  const selectedDateNotes = selectedDate ? getNotesForDate(selectedDate) : [];
  const selectedDateMeetings = selectedDate ? getMeetingsForDate(selectedDate) : [];

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const openNewMeetingModal = (date?: Date) => {
    const targetDate = date || selectedDate || new Date();
    const dateStr = format(targetDate, "yyyy-MM-dd'T'HH:mm");
    setNewMeeting(prev => ({ ...prev, scheduled_at: dateStr }));
    setShowNewMeeting(true);
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.scheduled_at) return;

    const { error } = await createMeeting({
      ...newMeeting,
      created_by: user?.id,
    }, selectedParticipants);

    if (error) {
      toast.show(error, 'error');
      return;
    }

    toast.show('Reunión creada correctamente', 'success');
    setShowNewMeeting(false);
    setNewMeeting({ title: '', description: '', scheduled_at: '', duration_minutes: 60 });
    setSelectedParticipants([]);
    fetchMeetings();
  };

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="flex h-full">
      {/* Calendario */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <CalendarIcon size={28} />
              Calendario
            </h1>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-[#1e1e2e] rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-white min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-[#1e1e2e] rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => openNewMeetingModal()}
              variant="secondary"
              leftIcon={<Video size={18} />}
            >
              Nueva Reunión
            </Button>
            <Button
              onClick={() => {
                const dateParam = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
                navigate(`/notes/new?date=${dateParam}&type=task`);
              }}
              leftIcon={<Plus size={18} />}
            >
              Nueva Tarea
            </Button>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grid del calendario */}
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, index) => {
            const dayNotes = getNotesForDate(day);
            const dayMeetings = getMeetingsForDate(day);
            const totalItems = dayNotes.length + dayMeetings.length;
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={() => navigate(`/notes/new?date=${format(day, 'yyyy-MM-dd')}&type=task`)}
                className={`
                  min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all
                  ${isCurrentMonth ? 'bg-[#181825]' : 'bg-[#11111b]'}
                  ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700 hover:border-gray-600'}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${!isCurrentMonth && 'text-gray-600'}
                  ${isCurrentMonth && !isTodayDate && 'text-gray-300'}
                  ${isTodayDate && 'text-blue-400'}
                `}>
                  <span className={`
                    inline-flex items-center justify-center w-7 h-7 rounded-full
                    ${isTodayDate && 'bg-blue-600 text-white'}
                  `}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {/* Reuniones */}
                  {dayMeetings.slice(0, 2).map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/meetings');
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate bg-green-500 bg-opacity-20 text-white hover:bg-opacity-30 transition-colors"
                    >
                      <Video size={10} />
                      <span className="truncate">{meeting.title}</span>
                    </div>
                  ))}
                  {/* Notas/Tareas */}
                  {dayNotes.slice(0, dayMeetings.length > 0 ? 1 : 3).map((note) => {
                    const Icon = typeIcons[note.type] || FileText;
                    return (
                      <div
                        key={note.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/notes/${note.id}`);
                        }}
                        className={`
                          flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate
                          ${typeColors[note.type]} bg-opacity-20 text-white
                          hover:bg-opacity-30 transition-colors
                        `}
                      >
                        <Icon size={10} />
                        <span className="truncate">{note.title}</span>
                      </div>
                    );
                  })}
                  {totalItems > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{totalItems - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar - Detalle del día seleccionado */}
      <div className="w-80 bg-[#181825] border-l border-gray-700 p-4 overflow-auto">
        <h3 className="text-lg font-semibold text-white mb-4">
          {selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : 'Selecciona un día'}
        </h3>

        {selectedDate && (
          <>
            {/* Botones de acción rápida */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => openNewMeetingModal(selectedDate)}
                size="sm"
                variant="secondary"
                leftIcon={<Video size={14} />}
                className="flex-1"
              >
                Reunión
              </Button>
              <Button
                onClick={() => navigate(`/notes/new?date=${format(selectedDate!, 'yyyy-MM-dd')}&type=task`)}
                size="sm"
                leftIcon={<Plus size={14} />}
                className="flex-1"
              >
                Tarea
              </Button>
            </div>

            {/* Reuniones del día */}
            {selectedDateMeetings.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Video size={14} />
                  Reuniones ({selectedDateMeetings.length})
                </h4>
                <div className="space-y-2">
                  {selectedDateMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => navigate('/meetings')}
                      className="p-3 bg-[#11111b] rounded-lg border-l-4 border-l-green-500 cursor-pointer hover:bg-[#1e1e2e] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-green-500 bg-opacity-20">
                          <Video size={16} className="text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm truncate">{meeting.title}</h4>
                          <p className="text-gray-500 text-xs mt-1">
                            {format(new Date(meeting.scheduled_at), 'HH:mm', { locale: es })} - {meeting.duration_minutes} min
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tareas del día */}
            {selectedDateNotes.length === 0 && selectedDateMeetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay eventos para este día</p>
              </div>
            ) : selectedDateNotes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <CheckSquare size={14} />
                  Tareas ({selectedDateNotes.length})
                </h4>
                <div className="space-y-3">
                  {selectedDateNotes.map((note) => {
                    const Icon = typeIcons[note.type] || FileText;
                    return (
                      <div
                        key={note.id}
                        onClick={() => navigate(`/notes/${note.id}`)}
                        className={`
                          p-3 bg-[#11111b] rounded-lg border-l-4 cursor-pointer
                          hover:bg-[#1e1e2e] transition-colors
                          ${statusColors[note.status]}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded ${typeColors[note.type]} bg-opacity-20`}>
                            <Icon size={16} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate">{note.title}</h4>
                            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`
                                px-2 py-0.5 rounded text-xs
                                ${note.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  note.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                  note.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-gray-500/20 text-gray-400'}
                              `}>
                                {note.status === 'completed' ? 'Completado' :
                                 note.status === 'in_progress' ? 'En progreso' :
                                 note.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                              </span>
                              {note.estimated_hours && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock size={12} />
                                  {note.estimated_hours}h
                                </span>
                              )}
                            </div>
                            {note.creator && (
                              <p className="text-xs text-gray-600 mt-1">
                                Creado por: {note.creator.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Nueva Reunión */}
      <Modal
        isOpen={showNewMeeting}
        onClose={() => setShowNewMeeting(false)}
        title="Nueva Reunión"
        size="lg"
      >
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Título *</label>
              <input
                type="text"
                id="meeting-title"
                name="meeting-title"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                placeholder="Ej: Daily Standup"
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Descripción</label>
              <textarea
                id="meeting-description"
                name="meeting-description"
                value={newMeeting.description}
                onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                placeholder="Detalles de la reunión..."
                rows={2}
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  id="meeting-datetime"
                  name="meeting-datetime"
                  value={newMeeting.scheduled_at}
                  onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_at: e.target.value })}
                  className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Duración (minutos)</label>
                <input
                  type="number"
                  id="meeting-duration"
                  name="meeting-duration"
                  min={5}
                  value={newMeeting.duration_minutes}
                  onChange={(e) => setNewMeeting({ ...newMeeting, duration_minutes: parseInt(e.target.value) || 60 })}
                  placeholder="60"
                  className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                <UserPlus size={16} />
                Invitar participantes
              </label>
              <div className="flex flex-wrap gap-2">
                {members.filter(m => m.id !== user?.id).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedParticipants.includes(member.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#11111b] text-gray-400 hover:bg-[#1e1e2e] hover:text-white'
                    }`}
                  >
                    {member.full_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowNewMeeting(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateMeeting}
            disabled={!newMeeting.title || !newMeeting.scheduled_at}
          >
            Crear Reunión
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
