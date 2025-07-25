import { redirect } from "next/navigation";

// Force dynamic rendering to prevent SSR issues
export const dynamic = "force-dynamic";

export default function HomePage() {
  redirect("/dashboard");
}
