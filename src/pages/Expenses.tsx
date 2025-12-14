import { useEffect, useState } from 'react';
import {
  Plus,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  Building2,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { useExpensesStore } from '../store/expensesStore';
import { useAuthStore } from '../store/authStore';
import { Expense } from '../lib/supabase';
import { ConfirmModal } from '../components/ConfirmModal';
import { Button, Spinner, Modal, ModalBody, ModalFooter, Card } from '../components/ui';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

const paymentMethods = [
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: Building2 },
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'check', label: 'Cheque', icon: DollarSign },
  { value: 'other', label: 'Otro', icon: DollarSign },
];

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  approved: { label: 'Aprobado', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  paid: { label: 'Pagado', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

export function Expenses() {
  useAuthStore();
  const { expenses, categories, isLoading, fetchExpenses, fetchCategories, createExpense, updateExpense, deleteExpense } = useExpensesStore();

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'custom'>('month');
  const [activeMenu, setActiveMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Eliminar categorías duplicadas
  const uniqueCategories = categories.filter((cat, index, self) =>
    index === self.findIndex(c => c.name.toLowerCase() === cat.name.toLowerCase())
  );

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'COP',
    category_id: '',
    vendor: '',
    invoice_number: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'card' as Expense['payment_method'],
    notes: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, [fetchCategories, fetchExpenses]);

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      currency: 'USD',
      category_id: '',
      vendor: '',
      invoice_number: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'card',
      notes: '',
    });
    setEditingExpense(null);
  };

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description,
        amount: expense.amount.toLocaleString('es-CO'),
        currency: expense.currency,
        category_id: expense.category_id || '',
        vendor: expense.vendor || '',
        invoice_number: expense.invoice_number || '',
        expense_date: expense.expense_date,
        payment_method: expense.payment_method || 'card',
        notes: expense.notes || '',
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const expenseData = {
      ...formData,
      amount: parseInt(formData.amount.replace(/\./g, ''), 10) || 0,
      category_id: formData.category_id || undefined,
    };

    if (editingExpense) {
      await updateExpense(editingExpense.id, expenseData);
    } else {
      await createExpense(expenseData);
    }

    setShowModal(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteModal.id) {
      await deleteExpense(deleteModal.id);
    }
    setDeleteModal({ isOpen: false, id: null });
  };

  // Filtrar gastos
  const filteredExpenses = expenses.filter(expense => {
    // Búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!expense.description.toLowerCase().includes(search) &&
          !expense.vendor?.toLowerCase().includes(search)) {
        return false;
      }
    }
    
    // Categoría
    if (categoryFilter && expense.category_id !== categoryFilter) return false;
    
    // Estado
    if (statusFilter && expense.status !== statusFilter) return false;
    
    // Fecha (mes actual por defecto)
    if (dateFilter === 'month') {
      const expenseDate = parseISO(expense.expense_date);
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      if (!isWithinInterval(expenseDate, { start: monthStart, end: monthEnd })) {
        return false;
      }
    }
    
    return true;
  });

  // Calcular totales
  const totals = {
    month: filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    pending: filteredExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
    paid: filteredExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0),
  };

  const formatCurrency = (amount: number, currency: string = 'COP') => {
    if (currency === 'COP') {
      return '$ ' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount);
    }
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign size={28} className="text-blue-400" />
            Gastos Empresariales
          </h1>
          <p className="text-gray-400 mt-1">Registra y gestiona los gastos de la empresa</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          leftIcon={<Plus size={20} />}
        >
          Nuevo Gasto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total del Mes</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totals.month)}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp size={24} className="text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pendientes</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totals.pending)}</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Clock size={24} className="text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pagados</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totals.paid)}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <CheckCircle size={24} className="text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            id="search-expenses"
            name="search-expenses"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar gastos..."
            className="w-full bg-[#181825] border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category filter */}
        <select
          id="filter-category"
          name="filter-category"
          value={categoryFilter || ''}
          onChange={(e) => setCategoryFilter(e.target.value || null)}
          className="bg-[#181825] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Todas las categorías</option>
          {uniqueCategories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          id="filter-status"
          name="filter-status"
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="bg-[#181825] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="paid">Pagado</option>
          <option value="rejected">Rechazado</option>
        </select>

        {/* Date filter */}
        <select
          id="filter-date"
          name="filter-date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as any)}
          className="bg-[#181825] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="month">Este mes</option>
          <option value="all">Todo el tiempo</option>
        </select>
      </div>

      {/* Expenses Table - Desktop */}
      <div className="hidden lg:block bg-[#181825] rounded-xl border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-400 font-medium">Descripción</th>
                <th className="text-left p-4 text-gray-400 font-medium">Categoría</th>
                <th className="text-left p-4 text-gray-400 font-medium">Fecha</th>
                <th className="text-right p-4 text-gray-400 font-medium">Monto</th>
                <th className="text-left p-4 text-gray-400 font-medium">Estado</th>
                <th className="text-left p-4 text-gray-400 font-medium">Creado por</th>
                <th className="text-right p-4 text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <Spinner size="lg" className="mx-auto" />
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No hay gastos registrados
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => {
                  const status = statusConfig[expense.status];
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr 
                      key={expense.id} 
                      className="border-b border-gray-700/50 hover:bg-[#1e1e2e] transition-colors cursor-pointer"
                      onClick={() => setViewingExpense(expense)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{expense.description}</p>
                          {expense.vendor && (
                            <p className="text-gray-500 text-sm">{expense.vendor}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {expense.category ? (
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm"
                            style={{ backgroundColor: `${expense.category.color}20`, color: expense.category.color }}
                          >
                            {expense.category.icon} {expense.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-300">
                        {format(parseISO(expense.expense_date), "d MMM yyyy", { locale: es })}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-white font-semibold">
                          {formatCurrency(expense.amount, expense.currency)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">
                        {expense.creator?.full_name || '-'}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveMenu(activeMenu?.id === expense.id ? null : { id: expense.id, x: rect.right, y: rect.top });
                            }}
                            className="p-2 rounded-lg hover:bg-[#11111b] text-gray-400 hover:text-white transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses Cards - Mobile */}
      <div className="lg:hidden space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No hay gastos registrados
          </Card>
        ) : (
          filteredExpenses.map(expense => {
            const status = statusConfig[expense.status];
            const StatusIcon = status.icon;
            
            return (
              <Card key={expense.id} className="p-4" hover>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{expense.description}</h3>
                    {expense.vendor && (
                      <p className="text-gray-500 text-sm">{expense.vendor}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveMenu(activeMenu?.id === expense.id ? null : { id: expense.id, x: rect.right, y: rect.top });
                    }}
                    className="p-2 rounded-lg hover:bg-[#11111b] text-gray-400"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Monto</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Estado</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Fecha</span>
                    <span className="text-gray-300 text-sm">
                      {format(parseISO(expense.expense_date), "d MMM yyyy", { locale: es })}
                    </span>
                  </div>
                  
                  {expense.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Categoría</span>
                      <span 
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm"
                        style={{ backgroundColor: `${expense.category.color}20`, color: expense.category.color }}
                      >
                        {expense.category.icon} {expense.category.name}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Menú de acciones flotante */}
      {activeMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setActiveMenu(null)}
          />
          <div 
            className="fixed bg-[#1e1e2e] border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[160px]"
            style={{ 
              top: activeMenu.y, 
              left: activeMenu.x - 160,
            }}
          >
            {(() => {
              const expense = expenses.find(e => e.id === activeMenu.id);
              if (!expense) return null;
              return (
                <>
                  <button
                    onClick={() => {
                      setViewingExpense(expense);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#181825]"
                  >
                    <Eye size={14} />
                    Ver detalles
                  </button>
                  <button
                    onClick={() => {
                      handleOpenModal(expense);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#181825]"
                  >
                    <Edit size={14} />
                    Editar
                  </button>
                  {expense.status === 'pending' ? (
                    <button
                      onClick={async () => {
                        await updateExpense(expense.id, { status: 'paid' });
                        setActiveMenu(null);
                        fetchExpenses();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-400 hover:bg-[#181825]"
                    >
                      <CheckCircle size={14} />
                      Marcar Pagado
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await updateExpense(expense.id, { status: 'pending' });
                        setActiveMenu(null);
                        fetchExpenses();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-[#181825]"
                    >
                      <Clock size={14} />
                      Marcar Pendiente
                    </button>
                  )}
                  <div className="border-t border-gray-700 my-1" />
                  <button
                    onClick={() => {
                      setDeleteModal({ isOpen: true, id: expense.id });
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-[#181825]"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Modal de crear/editar */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
              {/* Descripción */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Descripción *</label>
                <input
                  type="text"
                  id="expense-description"
                  name="expense-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Licencia de software"
                  required
                />
              </div>

              {/* Monto y Moneda */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Monto *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      id="expense-amount"
                      name="expense-amount"
                      value={formData.amount}
                      onChange={(e) => {
                        // Solo permitir números y formatear con puntos
                        const value = e.target.value.replace(/\D/g, '');
                        const formatted = value ? parseInt(value, 10).toLocaleString('es-CO') : '';
                        setFormData({ ...formData, amount: formatted });
                      }}
                      className="w-full bg-[#11111b] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="10.000"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Moneda</label>
                  <select
                    id="expense-currency"
                    name="expense-currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="COP">COP ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="MXN">MXN ($)</option>
                  </select>
                </div>
              </div>

              {/* Categoría */}
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-2">Categoría</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-left flex items-center justify-between"
                >
                  <span>
                    {formData.category_id 
                      ? (() => {
                          const cat = categories.find(c => c.id === formData.category_id);
                          return cat ? `${cat.icon} ${cat.name}` : 'Seleccionar categoría';
                        })()
                      : 'Seleccionar categoría'
                    }
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCategoryDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-[#1e1e2e] border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, category_id: '' });
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-400 hover:bg-[#181825] transition-colors"
                      >
                        Sin categoría
                      </button>
                      {uniqueCategories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, category_id: cat.id });
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left hover:bg-[#181825] transition-colors flex items-center gap-2 ${formData.category_id === cat.id ? 'bg-blue-500/20 text-blue-400' : 'text-white'}`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Proveedor y Factura */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Proveedor</label>
                  <input
                    type="text"
                    id="expense-vendor"
                    name="expense-vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">N° Factura</label>
                  <input
                    type="text"
                    id="expense-invoice"
                    name="expense-invoice"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Fecha y Método de pago */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Fecha *</label>
                  <input
                    type="date"
                    id="expense-date"
                    name="expense-date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Método de pago</label>
                  <select
                    id="expense-payment-method"
                    name="expense-payment-method"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                    className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    {paymentMethods.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Notas adicionales..."
                />
              </div>

          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowModal(false); resetForm(); }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingExpense ? 'Guardar Cambios' : 'Registrar Gasto'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal de detalles del gasto */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewingExpense(null)}>
          <div 
            className="bg-[#181825] rounded-xl border border-gray-700 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Detalle del Gasto</h2>
              <button
                onClick={() => setViewingExpense(null)}
                className="p-2 rounded-lg hover:bg-[#1e1e2e] text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Descripción</p>
                <p className="text-white font-medium text-lg">{viewingExpense.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Monto</p>
                  <p className="text-white font-bold text-xl">{formatCurrency(viewingExpense.amount, viewingExpense.currency)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Estado</p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-medium ${statusConfig[viewingExpense.status].color}`}>
                    {statusConfig[viewingExpense.status].label}
                  </span>
                </div>
              </div>

              {viewingExpense.category && (
                <div>
                  <p className="text-gray-400 text-sm">Categoría</p>
                  <span 
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm"
                    style={{ backgroundColor: `${viewingExpense.category.color}20`, color: viewingExpense.category.color }}
                  >
                    {viewingExpense.category.icon} {viewingExpense.category.name}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Fecha</p>
                  <p className="text-white">{format(parseISO(viewingExpense.expense_date), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                {viewingExpense.payment_method && (
                  <div>
                    <p className="text-gray-400 text-sm">Método de pago</p>
                    <p className="text-white capitalize">{viewingExpense.payment_method === 'card' ? 'Tarjeta' : viewingExpense.payment_method === 'cash' ? 'Efectivo' : viewingExpense.payment_method === 'transfer' ? 'Transferencia' : viewingExpense.payment_method}</p>
                  </div>
                )}
              </div>

              {viewingExpense.vendor && (
                <div>
                  <p className="text-gray-400 text-sm">Proveedor</p>
                  <p className="text-white">{viewingExpense.vendor}</p>
                </div>
              )}

              {viewingExpense.invoice_number && (
                <div>
                  <p className="text-gray-400 text-sm">N° Factura</p>
                  <p className="text-white">{viewingExpense.invoice_number}</p>
                </div>
              )}

              {viewingExpense.notes && (
                <div>
                  <p className="text-gray-400 text-sm">Notas</p>
                  <p className="text-gray-300">{viewingExpense.notes}</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  handleOpenModal(viewingExpense);
                  setViewingExpense(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                Editar
              </button>
              {viewingExpense.status === 'pending' && (
                <button
                  onClick={async () => {
                    await updateExpense(viewingExpense.id, { status: 'paid' });
                    setViewingExpense(null);
                    fetchExpenses();
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Marcar Pagado
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Eliminar Gasto"
        message="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
      />
    </div>
  );
}
