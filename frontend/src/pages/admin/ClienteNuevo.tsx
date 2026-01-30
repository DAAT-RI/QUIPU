import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ClienteNuevo() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [contactoEmail, setContactoEmail] = useState('')
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('quipu_clientes')
        .insert({
          nombre,
          contacto_email: contactoEmail || null,
          activo: true,
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clientes'] })
      navigate('/admin/clientes')
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre es requerido')
      return
    }

    createMutation.mutate()
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/admin/clientes"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Clientes
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Nuevo Cliente</h1>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre del Cliente *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-4 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Ej: APESEG"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Email de Contacto
          </label>
          <input
            type="email"
            value={contactoEmail}
            onChange={(e) => setContactoEmail(e.target.value)}
            className="w-full px-4 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="contacto@empresa.com"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear Cliente'}
          </button>
          <Link
            to="/admin/clientes"
            className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
