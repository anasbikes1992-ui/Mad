import { Toaster } from 'react-hot-toast'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgb(18 32 58)',
            color: '#f8fafc',
            border: '1px solid rgb(30 51 90)',
          },
        }}
      />
    </>
  )
}
