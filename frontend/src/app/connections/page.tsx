'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ConnectionsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [incoming, setIncoming] = useState<any[]>([]);
  const [accepted, setAccepted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function fetchConnections() {
    if (!user) return;
    try {
      const [reqRes, connRes] = await Promise.all([
        fetch(`${apiUrl}/connections/requests`, { headers: { "x-clerk-user-id": user.id } }),
        fetch(`${apiUrl}/connections`, { headers: { "x-clerk-user-id": user.id } }),
      ]);

      if (!reqRes.ok || !connRes.ok) throw new Error("Failed to fetch connections.");

      setIncoming(await reqRes.json());
      setAccepted(await connRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    fetchConnections();
  }, [isLoaded, isSignedIn, user]);

  async function respondToRequest(connectionId: string, action: "accept" | "reject") {
    if (!user) return;
    setActionLoading(connectionId);
    try {
      const res = await fetch(`${apiUrl}/connections/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-clerk-user-id": user.id },
        body: JSON.stringify({ connection_id: connectionId, action }),
      });
      if (!res.ok) throw new Error("Failed to respond.");
      await fetchConnections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading connections...</p>
      </div>
    );
  }

  if (!isSignedIn) return null;

  const myDbId = accepted.length > 0 || incoming.length > 0 ? user.id : null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Connections</h1>
            <p className="text-gray-500 mt-1">Manage your network and incoming requests.</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
            ← Dashboard
          </Link>
        </div>

        {error && <p className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">{error}</p>}

        {/* Incoming Requests */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            Incoming Requests
            {incoming.length > 0 && (
              <span className="text-sm bg-blue-600 text-white rounded-full px-2.5 py-0.5 font-medium">{incoming.length}</span>
            )}
          </h2>
          {incoming.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
              No incoming requests right now.
            </div>
          ) : (
            <div className="space-y-4">
              {incoming.map((conn) => (
                <div key={conn.id} className="bg-white border border-gray-200 rounded-xl p-5 flex justify-between items-center shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{conn.sender.name || "Anonymous"}</h3>
                    <p className="text-gray-500 text-sm">{conn.sender.bio || "No bio"}</p>
                    {conn.sender.skills && conn.sender.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {conn.sender.skills.map((s: string, i: number) => (
                          <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => respondToRequest(conn.id, "accept")}
                      disabled={actionLoading === conn.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === conn.id ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => respondToRequest(conn.id, "reject")}
                      disabled={actionLoading === conn.id}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === conn.id ? "..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Connections */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Connections</h2>
          {accepted.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
              No connections yet. Go to your project matches to connect with builders!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accepted.map((conn) => {
                const other = conn.sender_id === user.id ? conn.receiver : conn.sender;
                return (
                  <div key={conn.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(other.name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{other.name || "Anonymous"}</h3>
                        <p className="text-gray-500 text-sm mt-0.5">{other.bio || "No bio"}</p>
                        {other.skills && other.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {other.skills.map((s: string, i: number) => (
                              <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
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
