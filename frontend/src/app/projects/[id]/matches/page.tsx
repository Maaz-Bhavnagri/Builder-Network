'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function ProjectMatches({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const { isLoaded, isSignedIn, user } = useUser();
  const [projectMatches, setProjectMatches] = useState<any[]>([]);
  const [userMatches, setUserMatches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        const [projRes, userRes] = await Promise.all([
          fetch(`${apiUrl}/matches/projects/${projectId}`, {
            headers: { "x-clerk-user-id": user.id }
          }),
          fetch(`${apiUrl}/matches/users/${projectId}`, {
            headers: { "x-clerk-user-id": user.id }
          })
        ]);

        if (!projRes.ok || !userRes.ok) {
          throw new Error("Failed to fetch matches");
        }

        const projData = await projRes.json();
        const userData = await userRes.json();

        setProjectMatches(projData);
        setUserMatches(userData);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [isLoaded, isSignedIn, user, projectId]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading matches...</p>
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">People building similar things</h1>
            <p className="text-gray-600 mt-1">Here are some projects and users that match your new project.</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
            Back to Dashboard
          </Link>
        </div>

        {error && <p className="text-red-500">{error}</p>}

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Similar Projects</h2>
          {projectMatches.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 rounded-xl border border-gray-100">No similar projects found yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectMatches.map((match: any) => (
                <div key={match.project.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-bl-lg border-b border-l border-blue-100">
                    Score: {match.score}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 pr-16 mb-2 truncate">{match.project.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4">{match.project.description}</p>
                  
                  {match.project.tags && match.project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {match.project.tags.map((tag: string, i: number) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                      href={`/projects/${match.project.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Relevant Users</h2>
          {userMatches.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 rounded-xl border border-gray-100">No relevant users found yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userMatches.map((match: any) => (
                <div key={match.user.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-bl-lg border-b border-l border-green-100">
                    Score: {match.score}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 pr-16 mb-1">{match.user.name || "Anonymous User"}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{match.user.bio || "No bio available."}</p>
                  
                  {match.user.skills && match.user.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {match.user.skills.map((skill: string, i: number) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-800 border border-green-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
