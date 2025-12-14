import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/ui';
import { useToast } from '../hooks/useToast';

export function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.show('Las contraseñas no coinciden', 'error');
      return;
    }

    if (password.length < 6) {
      toast.show('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    setIsLoading(true);
    const { error } = await register(email, password, fullName);
    
    if (error) {
      toast.show(error, 'error');
      setIsLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/Logo.svg" alt="Kor4Soft" className="h-40 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-blue-400">Kor4Soft Notes</h1>
          <p className="text-gray-500 mt-2">Crea tu cuenta</p>
        </div>

        {/* Form */}
        <div className="bg-[#181825] rounded-2xl p-8 shadow-xl border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Registro</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User size={20} />}
              placeholder="Tu nombre"
              required
            />

            <Input
              type="email"
              label="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={20} />}
              placeholder="tu@email.com"
              required
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={20} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
              placeholder="••••••••"
              helperText="Mínimo 6 caracteres"
              required
            />

            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock size={20} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              isLoading={isLoading}
              leftIcon={<UserPlus size={20} />}
              className="w-full"
            >
              Crear Cuenta
            </Button>
          </form>

          <p className="text-center text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
              Iniciar Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
