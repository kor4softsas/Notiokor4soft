-- Tabla para solicitudes de eliminación de canales
-- Requiere aprobación de TODOS los miembros del equipo

CREATE TABLE IF NOT EXISTS channel_delete_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approvals UUID[] DEFAULT '{}',
  rejections UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_channel_delete_requests_channel_id ON channel_delete_requests(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_delete_requests_status ON channel_delete_requests(status);

-- RLS (Row Level Security)
ALTER TABLE channel_delete_requests ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden ver las solicitudes
CREATE POLICY "Users can view delete requests" ON channel_delete_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Usuarios autenticados pueden crear solicitudes
CREATE POLICY "Users can create delete requests" ON channel_delete_requests
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

-- Política: Usuarios autenticados pueden actualizar solicitudes (para votar)
CREATE POLICY "Users can update delete requests" ON channel_delete_requests
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política: Solo el sistema puede eliminar solicitudes (cuando se aprueba o rechaza)
CREATE POLICY "Users can delete requests" ON channel_delete_requests
  FOR DELETE USING (auth.role() = 'authenticated');
