import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { Rol } from '@/types'

// Rutas que requieren autenticación
const PROTECTED_PREFIX = '/dashboard'

// Rutas con restricción de rol específica
const ROLE_RESTRICTED: { path: string; allowedRoles: Rol[] }[] = [
  { path: '/dashboard/usuarios', allowedRoles: ['super_admin'] },
  { path: '/dashboard/captura', allowedRoles: ['inspector'] },
  { path: '/dashboard/spc', allowedRoles: ['admin', 'super_admin', 'supervisor'] },
  { path: '/dashboard/alarmas', allowedRoles: ['admin', 'super_admin', 'supervisor'] },
  { path: '/dashboard/configuracion', allowedRoles: ['admin', 'super_admin'] },
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Refrescar la sesión y obtener el usuario
  const { supabaseResponse, user } = await updateSession(request)

  const isProtected = pathname.startsWith(PROTECTED_PREFIX)
  const isLoginPage = pathname === '/login'

  // Usuario autenticado intentando acceder a /login → redirigir al dashboard
  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Ruta protegida sin sesión → redirigir a /login
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verificar restricciones de rol en rutas específicas
  if (isProtected && user) {
    const restricted = ROLE_RESTRICTED.find(({ path }) =>
      pathname.startsWith(path)
    )

    if (restricted) {
      // Necesitamos el perfil del usuario para conocer su rol.
      // Usamos la misma respuesta de Supabase (ya tiene la sesión refrescada).
      const { createServerClient } = await import('@supabase/ssr')

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll() {
              // Las cookies ya fueron gestionadas por updateSession
            },
          },
        }
      )

      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

      const userRol = profile?.rol as Rol | undefined

      if (!userRol || !restricted.allowedRoles.includes(userRol)) {
        // Redirigir al dashboard principal si no tiene el rol requerido
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Ejecutar middleware en todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos con extensión (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
