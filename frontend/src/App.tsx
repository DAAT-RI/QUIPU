import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminRoute } from '@/components/admin/AdminRoute'
import { Layout } from '@/components/layout/Layout'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { Clientes } from '@/pages/admin/Clientes'
import { ClienteNuevo } from '@/pages/admin/ClienteNuevo'
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
})

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
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
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
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
