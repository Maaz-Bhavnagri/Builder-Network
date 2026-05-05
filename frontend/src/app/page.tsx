import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-white">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center text-gray-900">
          Welcome to Auth System
        </h1>
        <p className="text-center text-gray-600 max-w-2xl text-lg">
          A full-stack authentication and user synchronization system using Next.js, Clerk, FastAPI, and PostgreSQL.
        </p>
        
        <div className="flex gap-4 mt-8">
          <Link href="/sign-in" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
            Sign In
          </Link>
          <Link href="/sign-up" className="px-6 py-3 bg-gray-100 text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-200 transition font-medium">
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
