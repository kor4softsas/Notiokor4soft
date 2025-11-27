# Kor4Soft Notes 📝

Aplicación de notas y seguimiento de desarrollo para equipos. Permite a los desarrolladores documentar tareas, bugs, features y cambios de código con sincronización en tiempo real.

## 🚀 Características

- ✅ **Multiplataforma**: Linux y Windows
- 🔐 **Autenticación**: Sistema de usuarios con Supabase
- 🔄 **Sincronización en tiempo real**: Cambios instantáneos entre usuarios
- 📊 **Dashboard**: Vista general del progreso del equipo
- 🏷️ **Tipos de notas**: Tareas, Bugs, Features, Notas generales
- 🎯 **Prioridades y estados**: Organiza el trabajo eficientemente
- 🌙 **Tema oscuro**: Diseño moderno y cómodo para la vista

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (para compilar Tauri)
- Dependencias del sistema (Linux):
  ```bash
  sudo apt-get install libwebkit2gtk-4.1-dev librsvg2-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev libgtk-3-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
  ```

## 🛠️ Configuración

### 1. Clonar e instalar dependencias

```bash
cd NotionKor4Soft
npm install
```

### 2. Configurar Supabase (Base de datos)

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
4. Copia las credenciales desde **Settings > API**

### 3. Variables de entorno

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Ejecutar en desarrollo

```bash
# Solo frontend (web)
npm run dev

# App nativa con Tauri
npm run tauri dev
```

### 5. Compilar para producción

```bash
# Linux
npm run tauri build

# Windows (desde Windows)
npm run tauri build
```

## 📁 Estructura del Proyecto

```
NotionKor4Soft/
├── src/                    # Código React
│   ├── components/         # Componentes reutilizables
│   ├── pages/              # Páginas de la app
│   ├── store/              # Estado global (Zustand)
│   └── lib/                # Utilidades y configuración
├── src-tauri/              # Código Rust (Tauri)
├── supabase/               # Esquema de base de datos
└── public/                 # Assets estáticos
```

## 🤝 Equipo

Desarrollado por Kor4Soft
