import { redirect } from "next/navigation";

// Setup gating happens in `src/proxy.ts`; by the time we reach this
// page we know the wizard is finished. Send the user to the dashboard.
export default function HomePage(): never {
  redirect("/dashboard");
}
