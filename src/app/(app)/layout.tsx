import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <Nav user={session.user} />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
