import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

// Detectar si estamos en Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

interface UpdateInfo {
  version: string;
  date: string;
  body: string;
}

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    
    // Verificar actualizaciones al iniciar
    checkForUpdates();
    
    // Verificar cada 30 minutos
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    if (!isTauri || isChecking) return;
    
    setIsChecking(true);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      
      if (update) {
        setUpdateAvailable({
          version: update.version,
          date: update.date || '',
          body: update.body || 'Nueva versión disponible',
        });
        setDismissed(false);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    if (!isTauri || !updateAvailable) return;
    
    setIsDownloading(true);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      
      if (update) {
        // Descargar e instalar (automáticamente reinicia la app)
        await update.downloadAndInstall();
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      setIsDownloading(false);
    }
  };

  if (!isTauri || !updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl border border-blue-500/30 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Download size={18} />
                Nueva versión disponible
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                v{updateAvailable.version}
              </p>
              {updateAvailable.body && (
                <p className="text-blue-200 text-xs mt-2 line-clamp-2">
                  {updateAvailable.body}
                </p>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-blue-200 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>
          
          {isDownloading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-100">
              <RefreshCw size={14} className="animate-spin" />
              Descargando actualización...
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <button
                onClick={downloadAndInstall}
                className="flex-1 px-3 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Actualizar ahora
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-2 bg-blue-500/30 text-white rounded-lg text-sm hover:bg-blue-500/50 transition-colors"
              >
                Después
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
