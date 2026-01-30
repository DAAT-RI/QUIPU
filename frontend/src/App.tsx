import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminRoute } from '@/components/admin/AdminRoute'
import { Layout } from '@/components/layout/Layout'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { Clientes } from '@/pages/admin/Clientes'
import { ClienteNuevo } from '@/pages/admin/ClienteNuevo'
import { ClienteEditar } from '@/pages/admin/ClienteEditar'
import StakeholderAliases from '@/pages/admin/StakeholderAliases'
import Usuarios from '@/pages/admin/Usuarios'
import { Dashboard } from '@/pages/Dashboard'
import { Declaraciones } from '@/pages/Declaraciones'
import { DeclaracionDetalle } from '@/pages/DeclaracionDetalle'
import { BuscarPromesas } from '@/pages/BuscarPromesas'
import { Candidatos } from '@/pages/Candidatos'
import { CandidatoDetalle } from '@/pages/CandidatoDetalle'
import { Partidos } from '@/pages/Partidos'
import { PartidoDetalle } from '@/pages/PartidoDetalle'
import { Categorias } from '@/pages/Categorias'
import { CategoriaDetalle } from '@/pages/CategoriaDetalle'
import { Comparar } from '@/pages/Comparar'
import { MapaElectoral } from '@/pages/MapaElectoral'
import Login from '@/pages/Login'

// Scroll to top on route change (compatible with BrowserRouter)
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/declaraciones" element={<Declaraciones />} />
                <Route path="/declaraciones/:id" element={<DeclaracionDetalle />} />
                <Route path="/buscar" element={<BuscarPromesas />} />
                <Route path="/candidatos" element={<Candidatos />} />
                <Route path="/candidatos/:id" element={<CandidatoDetalle />} />
                <Route path="/partidos" element={<Partidos />} />
                <Route path="/partidos/:id" element={<PartidoDetalle />} />
                <Route path="/categorias" element={<Categorias />} />
                <Route path="/categorias/:nombre" element={<CategoriaDetalle />} />
                <Route path="/comparar" element={<Comparar />} />
                <Route path="/mapa" element={<MapaElectoral />} />
              </Route>
            </Route>

            {/* Rutas de administración (solo superadmin) */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="clientes/nuevo" element={<ClienteNuevo />} />
                <Route path="clientes/:id" element={<ClienteEditar />} />
                <Route path="aliases" element={<StakeholderAliases />} />
                <Route path="usuarios" element={<Usuarios />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

