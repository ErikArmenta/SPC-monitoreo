'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import NeuInput from '@/components/ui/NeuInput'
import NeuButton from '@/components/ui/NeuButton'
import type { Rol } from '@/types'

function getRoleRedirect(rol: Rol): string {
  if (rol === 'inspector') return '/dashboard/captura'
  return '/dashboard'
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError)
      setSubmitting(false)
      return
    }

    // Fetch profile to verify activo status and get rol for redirect
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Credenciales incorrectas')
      setSubmitting(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol, activo')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.activo) {
      await supabase.auth.signOut()
      setError('Usuario desactivado')
      setSubmitting(false)
      return
    }

    router.push(getRoleRedirect(profile.rol as Rol))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm mx-auto flex flex-col items-center gap-6"
    >
      {/* Logo hexagonal */}
      <div className="mb-2">
        <svg
          width="96"
          height="108"
          viewBox="0 0 96 108"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="SPC Logo"
        >
          {/* Hexágono exterior (sombra suave) */}
          <polygon
            points="48,4 92,28 92,80 48,104 4,80 4,28"
            fill="#0d4a8f"
            opacity="0.25"
            transform="translate(2, 2)"
          />
          {/* Hexágono principal */}
          <polygon
            points="48,4 92,28 92,80 48,104 4,80 4,28"
            fill="#1565C0"
          />
          {/* Icono: gráfica de control estilizada */}
          <polyline
            points="22,68 34,52 44,60 56,38 66,46 76,30"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.9"
          />
          {/* Línea central (CL) */}
          <line
            x1="22"
            y1="54"
            x2="76"
            y2="54"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.5"
          />
          {/* Punto fuera de control (rojo) */}
          <circle cx="56" cy="38" r="4" fill="#F44336" opacity="0.95" />
        </svg>
      </div>

      {/* Título */}
      <div className="text-center">
        <h1 className="text-xl font-semibold text-[#2d3748] tracking-wide">
          Sistema SPC
        </h1>
        <p className="text-sm text-gray-500 mt-1">Control de Calidad en Tiempo Real</p>
      </div>

      {/* Tarjeta del formulario */}
      <div className="w-full neu-flat-lg p-8 flex flex-col gap-5">
        {/* Campo correo */}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Correo electrónico
          </label>
          <NeuInput
            id="email"
            type="email"
            placeholder="usuario@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={submitting}
          />
        </div>

        {/* Campo contraseña */}
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Contraseña
          </label>
          <NeuInput
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={submitting}
          />
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="neu-pressed rounded-[12px] px-4 py-2.5 text-sm text-[#F44336] font-medium text-center">
            {error}
          </div>
        )}

        {/* Botón ingresar */}
        <NeuButton
          type="submit"
          variant="primary"
          className="w-full py-3 text-base font-semibold mt-1"
          disabled={submitting}
        >
          {submitting ? 'Verificando...' : 'Ingresar'}
        </NeuButton>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-gray-400">
        Developed by Engineer Erik Armenta
      </p>
    </form>
  )
}
