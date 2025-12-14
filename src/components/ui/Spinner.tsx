interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizes[size]} border-blue-500/30 border-t-blue-500 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Cargando"
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function LoadingScreen({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#11111b] flex flex-col items-center justify-center">
      <Spinner size="xl" />
      <p className="mt-4 text-gray-400">{message}</p>
    </div>
  );
}