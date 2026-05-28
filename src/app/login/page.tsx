import LoginForm from '@/components/forms/LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#e0e5ec] flex items-center justify-center px-4 py-12">
      <LoginForm />
    </main>
  )
}
