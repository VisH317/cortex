import type { Metadata } from "next"
import "./globals.css"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Activity, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Cortex - Your Doctor's Second Brain",
  description: "AI-powered medical records that think with you. Instant insights, intelligent search, and research at your fingertips.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className="antialiased bg-gradient-to-br from-blue-50 via-white to-orange-50">
        {user && (
          <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg shadow-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
              <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-105">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-orange-500 shadow-md">
                  <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">Cortex</span>
              </Link>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-medium">
                  {user.email}
                </span>
                <form action="/auth/signout" method="post">
                  <Button variant="outline" size="sm" className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>
          </header>
        )}
        {children}
      </body>
    </html>
  )
}
