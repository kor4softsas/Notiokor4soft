import { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Mail,
  Lock,
  Camera,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Button, Card, CardBody } from '../components/ui';
import { useToast } from '../hooks/useToast';

export function Settings() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
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


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        setUser({ ...user!, full_name: profileData.full_name });
        toast.show('Perfil actualizado correctamente', 'success');
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
      toast.show('Perfil actualizado correctamente', 'success');
    } catch (error: any) {
      toast.show(error.message || 'Error al actualizar perfil', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.show('Las contraseñas no coinciden', 'error');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.show('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        toast.show('Contraseña actualizada (modo demo)', 'success');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password,
      });

      if (error) throw error;

      toast.show('Contraseña actualizada correctamente', 'success');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toast.show(error.message || 'Error al actualizar contraseña', 'error');
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
      toast.show('Solo se permiten imágenes', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.show('La imagen no debe superar 2MB', 'error');
      return;
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        // Modo demo - usar URL local
        const url = URL.createObjectURL(file);
        setProfileData({ ...profileData, avatar_url: url });
        toast.show('Imagen actualizada (modo demo)', 'success');
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
      toast.show('Imagen subida correctamente. Guarda los cambios.', 'success');
    } catch (error: any) {
      toast.show(error.message || 'Error al subir imagen', 'error');
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

      {/* Profile Section */}
      <Card className="mb-6">
        <CardBody>
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
                autoComplete="name"
                id="full-name"
                name="full-name"
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
                autoComplete="email"
                id="email"
                name="email"
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
          >
            Guardar cambios
          </Button>
        </form>
        </CardBody>
      </Card>

      {/* Password Section */}
      <Card className="mb-6">
        <CardBody>
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
                autoComplete="current-password"
                id="current-password"
                name="current-password"
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
                autoComplete="new-password"
                id="new-password"
                name="new-password"
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
                autoComplete="new-password"
                id="confirm-password"
                name="confirm-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!passwordData.new_password}
          >
            Actualizar contraseña
          </Button>
        </form>
        </CardBody>
      </Card>
    </div>
  );
}
