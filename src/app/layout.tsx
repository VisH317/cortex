import type { Metadata } from "next"
import "./globals.css"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Activity, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "MedVault - AI Medical Records",
  description: "AI-powered medical records management for doctors",
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
      <body className="antialiased">
        {user && (
          <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur-lg dark:border-white/10 dark:bg-black/80">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
              <Link href="/" className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <span className="text-xl font-bold">MedVault</span>
              </Link>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
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
