// OAuth callback handler for Google authentication
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/vault/home"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if profile exists, create if not
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single()

      if (!profile) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email! as string,
          full_name: data.user.user_metadata.full_name || data.user.user_metadata.name || null as any,
          avatar_url: data.user.user_metadata.avatar_url || null as any,
        })
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to auth page if something went wrong
  return NextResponse.redirect(`${origin}/auth`)
}

