import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to auth page
  return NextResponse.redirect(new URL("/auth", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"))
}

