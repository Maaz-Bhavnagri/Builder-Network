'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  if (!isSignedIn) return null;

  const navLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Connections", href: "/connections" },
    { name: "Messages", href: "/chat" },
    { name: "Profile", href: "/profile" },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-indigo-600 tracking-tight">
                BuilderNetwork
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-indigo-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
      
      {/* Mobile menu (simplified) */}
      <div className="sm:hidden border-t border-gray-100 px-4 py-2 flex justify-around bg-gray-50">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={`text-xs font-medium ${
              pathname === link.href ? "text-indigo-600" : "text-gray-500"
            }`}
          >
            {link.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
