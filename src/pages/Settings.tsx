import { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Mail,
  Lock,
  Camera,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function Settings() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    avatar_url: user?.avatar_url || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Estado para actualizaciones
  const [updateState, setUpdateState] = useState<{
    checking: boolean;
    downloading: boolean;
    available: boolean;
    version: string | null;
    error: string | null;
  }>({
    checking: false,
    downloading: false,
    available: false,
    version: null,
    error: null,
  });

  const currentVersion = '0.6.1';
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const checkForUpdates = async () => {
    if (!isTauri) {
      setUpdateState(prev => ({ ...prev, error: 'Las actualizaciones solo funcionan en la app de escritorio' }));
      return;
    }

    setUpdateState(prev => ({ ...prev, checking: true, error: null }));
    
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      
      if (update) {
        setUpdateState(prev => ({
          ...prev,
          checking: false,
          available: true,
          version: update.version,
        }));
      } else {
        setUpdateState(prev => ({
          ...prev,
          checking: false,
          available: false,
          version: null,
        }));
        showMessage('success', 'Ya tienes la última versión');
      }
    } catch (error: any) {
      console.error('Error checking updates:', error);
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        error: error.message || 'Error al verificar actualizaciones',
      }));
    }
  };

  const downloadAndInstall = async () => {
    if (!isTauri) return;

    setUpdateState(prev => ({ ...prev, downloading: true, error: null }));
    
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');
      const update = await check();
      
      if (update) {
        showMessage('success', 'Descargando actualización...');
        
        let downloaded = 0;
        let contentLength = 0;
        
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              console.log(`Iniciando descarga: ${contentLength} bytes`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              console.log(`Descargado: ${downloaded}/${contentLength}`);
              break;
            case 'Finished':
              console.log('Descarga completada');
              break;
          }
        });
        
        showMessage('success', 'Actualización instalada. Reiniciando...');
        await relaunch();
      }
    } catch (error: any) {
      console.error('Error downloading update:', error);
      const errorMsg = error.message || error.toString() || 'Error desconocido';
      setUpdateState(prev => ({
        ...prev,
        downloading: false,
        error: `Error: ${errorMsg}`,
      }));
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        // Modo demo - actualizar localmente
        setUser({ ...user!, full_name: profileData.full_name });
        showMessage('success', 'Perfil actualizado correctamente');
        setIsLoading(false);
        return;
      }

      // Actualizar perfil en Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Actualizar email si cambió
      if (profileData.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email,
        });
        if (emailError) throw emailError;
      }

      setUser({ ...user!, full_name: profileData.full_name, avatar_url: profileData.avatar_url });
      showMessage('success', 'Perfil actualizado correctamente');
    } catch (error: any) {
      showMessage('error', error.message || 'Error al actualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      showMessage('error', 'Las contraseñas no coinciden');
      return;
    }

    if (passwordData.new_password.length < 6) {
      showMessage('error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        showMessage('success', 'Contraseña actualizada (modo demo)');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password,
      });

      if (error) throw error;

      showMessage('success', 'Contraseña actualizada correctamente');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      showMessage('error', error.message || 'Error al actualizar contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Solo se permiten imágenes');
      return;
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showMessage('error', 'La imagen no debe superar 2MB');
      return;
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        // Modo demo - usar URL local
        const url = URL.createObjectURL(file);
        setProfileData({ ...profileData, avatar_url: url });
        showMessage('success', 'Imagen actualizada (modo demo)');
        setIsLoading(false);
        return;
      }

      // Subir a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfileData({ ...profileData, avatar_url: urlData.publicUrl });
      showMessage('success', 'Imagen subida correctamente. Guarda los cambios.');
    } catch (error: any) {
      showMessage('error', error.message || 'Error al subir imagen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <SettingsIcon size={28} />
          Configuración
        </h1>
        <p className="text-gray-400 mt-1">Administra tu perfil y preferencias</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 mb-6 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-[#181825] rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <User size={20} />
          Mi Perfil
        </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div 
                onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold cursor-pointer overflow-hidden group"
              >
                {profileData.avatar_url ? (
                  <img 
                    src={profileData.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.full_name?.charAt(0) || 'U'
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-white font-medium">Foto de perfil</p>
              <p className="text-gray-500 text-sm">JPG, PNG o GIF. Máximo 2MB.</p>
              <button
                type="button"
                onClick={handleAvatarClick}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Cambiar imagen
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Nombre completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Tu nombre"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Guardar cambios
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-[#181825] rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Lock size={20} />
          Cambiar Contraseña
        </h2>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          {/* Current Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Contraseña actual</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Nueva contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Confirmar nueva contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !passwordData.new_password}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Lock size={20} />
            )}
            Actualizar contraseña
          </button>
        </form>
      </div>

      {/* Updates Section */}
      <div className="bg-[#181825] rounded-xl border border-gray-700 p-6 mt-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Download size={20} />
          Actualizaciones
        </h2>

        <div className="space-y-4">
          {/* Current Version */}
          <div className="flex items-center justify-between p-4 bg-[#11111b] rounded-lg">
            <div>
              <p className="text-white font-medium">Versión actual</p>
              <p className="text-gray-500 text-sm">Notes Kor4soft</p>
            </div>
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium">
              v{currentVersion}
            </span>
          </div>

          {/* Update Status */}
          {updateState.error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <AlertCircle size={20} />
              {updateState.error}
            </div>
          )}

          {updateState.available && updateState.version && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Sparkles size={20} className="text-green-400" />
              <div className="flex-1">
                <p className="text-green-400 font-medium">¡Nueva versión disponible!</p>
                <p className="text-green-300/70 text-sm">Versión {updateState.version}</p>
              </div>
              <button
                onClick={downloadAndInstall}
                disabled={updateState.downloading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {updateState.downloading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Descargando...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Actualizar
                  </>
                )}
              </button>
            </div>
          )}

          {/* Check for Updates Button */}
          <button
            onClick={checkForUpdates}
            disabled={updateState.checking || updateState.downloading}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#11111b] hover:bg-[#1e1e2e] border border-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {updateState.checking ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Buscar actualizaciones
              </>
            )}
          </button>

          <p className="text-gray-500 text-xs text-center">
            Las actualizaciones se descargan e instalan automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
