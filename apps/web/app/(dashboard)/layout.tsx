import { Toaster } from 'react-hot-toast'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgb(18 32 58)',
            color: '#f8fafc',
            border: '1px solid rgb(30 51 90)',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#C9A84C', secondary: '#0E192D' } },
        }}
      />
    </div>
  )
}
