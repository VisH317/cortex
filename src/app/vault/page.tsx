import { redirect } from "next/navigation"

export default function VaultRootPage() {
  // Redirect to homepage - /vault should not be a standalone page
  redirect("/")
}
