import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MAHORAGA Trading Dashboard',
  description: 'Autonomous LLM-powered trading agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="dark bg-gray-950 text-white">
        {children}
      </body>
    </html>
  )
}
