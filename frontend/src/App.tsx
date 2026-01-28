import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
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
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
