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

  // Connection state: map of user DB id -> "none" | "pending" | "accepted"
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function fetchMatches() {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        const [projRes, userRes, connRes, sentRes] = await Promise.all([
          fetch(`${apiUrl}/matches/projects/${projectId}`, { headers: { "x-clerk-user-id": user.id } }),
          fetch(`${apiUrl}/matches/users/${projectId}`, { headers: { "x-clerk-user-id": user.id } }),
          fetch(`${apiUrl}/connections`, { headers: { "x-clerk-user-id": user.id } }),
          fetch(`${apiUrl}/connections/sent`, { headers: { "x-clerk-user-id": user.id } }),
        ]);

        if (!projRes.ok || !userRes.ok) throw new Error("Failed to fetch matches");

        const [projData, userData] = await Promise.all([projRes.json(), userRes.json()]);
        setProjectMatches(projData);
        setUserMatches(userData);

        // Build connection status map
        const statusMap: Record<string, string> = {};
        if (connRes.ok) {
          const conns = await connRes.json();
          conns.forEach((c: any) => {
            const otherId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
            statusMap[otherId] = "accepted";
          });
        }
        if (sentRes.ok) {
          const sent = await sentRes.json();
          sent.forEach((c: any) => {
            if (!statusMap[c.receiver_id]) statusMap[c.receiver_id] = "pending";
          });
        }
        setConnectionStatus(statusMap);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [isLoaded, isSignedIn, user, projectId]);

  async function handleConnect(receiverId: string) {
    if (!user) return;
    setConnectingId(receiverId);
    try {
      const res = await fetch(`${apiUrl}/connections/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-clerk-user-id": user.id },
        body: JSON.stringify({ receiver_id: receiverId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to send request");
      }
      setConnectionStatus((prev) => ({ ...prev, [receiverId]: "pending" }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConnectingId(null);
    }
  }

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
          <div className="flex gap-3">
            <Link href="/connections" className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
              My Connections
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
              Dashboard
            </Link>
          </div>
        </div>

        {error && <p className="text-red-500 bg-red-50 border border-red-200 p-4 rounded-lg">{error}</p>}

        {/* Similar Projects */}
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
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link href={`/projects/${match.project.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center">
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Relevant Users */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Relevant Users</h2>
          {userMatches.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 rounded-xl border border-gray-100">No relevant users found yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userMatches.map((match: any) => {
                const status = connectionStatus[match.user.id] || "none";
                return (
                  <div key={match.user.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-bl-lg border-b border-l border-green-100">
                      Score: {match.score}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 pr-16 mb-1">{match.user.name || "Anonymous User"}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{match.user.bio || "No bio available."}</p>
                    {match.user.skills && match.user.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 mb-4">
                        {match.user.skills.map((skill: string, i: number) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-800 border border-green-100">{skill}</span>
                        ))}
                      </div>
                    )}
                    {/* Connect Button */}
                    <div className="pt-3 border-t border-gray-100">
                      {status === "accepted" ? (
                        <span className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">✓ Connected</span>
                      ) : status === "pending" ? (
                        <span className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">⏳ Pending</span>
                      ) : (
                        <button
                          onClick={() => handleConnect(match.user.id)}
                          disabled={connectingId === match.user.id}
                          className="text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                        >
                          {connectingId === match.user.id ? "Sending..." : "Connect"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
