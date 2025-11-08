import { redirect } from "next/navigation"

export default function VaultHomePage() {
  // Redirect to the root vault view
  redirect("/vault")
}

