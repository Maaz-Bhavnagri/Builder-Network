'use client';

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [dbUser, setDbUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        // 1. Sync User
        const syncResponse = await fetch(`${apiUrl}/users/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerk_id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || "",
          }),
        });

        if (!syncResponse.ok) {
          throw new Error("Failed to sync user with database.");
        }

        // 2. Fetch User from /me endpoint
        const meResponse = await fetch(`${apiUrl}/me`, {
          method: "GET",
          headers: {
            "x-clerk-user-id": user.id,
          },
        });

        if (!meResponse.ok) {
          throw new Error("Failed to fetch user from /me endpoint.");
        }

        const data = await meResponse.json();
        setDbUser(data);

        // 3. Fetch User's Projects
        const projectsResponse = await fetch(`${apiUrl}/projects/my`, {
          method: "GET",
          headers: {
            "x-clerk-user-id": user.id,
          },
        });

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          setProjects(projectsData);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Handled by middleware
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <div className="flex items-center gap-3">
              <Link
                href="/connections"
                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                My Connections
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
          
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-2">Welcome, {user.fullName}!</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">My Projects</h2>
            <Link
              href="/create-project"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Project
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first project.</p>
              <Link
                href="/create-project"
                className="text-blue-600 font-medium hover:underline"
              >
                Create Project &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-900 truncate pr-2">{project.title}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {project.stage}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                    {project.description}
                  </p>
                  
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag: string, index: number) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 flex-1 text-center py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/projects/${project.id}/matches`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex-1 text-center py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                      Find Matches
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
