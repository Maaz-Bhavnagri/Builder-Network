'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const { isLoaded, isSignedIn, user } = useUser();
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Connection state
  const [connStatus, setConnStatus] = useState<string>("none"); // none | pending | accepted
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function fetchData() {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        // Fetch project
        const projRes = await fetch(`${apiUrl}/projects/${projectId}`, {
          method: "GET",
          headers: {
            "x-clerk-user-id": user.id,
          },
        });

        if (!projRes.ok) {
          if (projRes.status === 404) {
            throw new Error("Project not found");
          }
          throw new Error("Failed to fetch project details");
        }

        const projectData = await projRes.json();
        setProject(projectData);

        // Fetch connection status if not owner
        if (projectData.owner_id !== user.id) {
          const [connRes, sentRes] = await Promise.all([
            fetch(`${apiUrl}/connections`, { headers: { "x-clerk-user-id": user.id } }),
            fetch(`${apiUrl}/connections/sent`, { headers: { "x-clerk-user-id": user.id } }),
          ]);

          if (connRes.ok && sentRes.ok) {
            const acceptedConns = await connRes.json();
            const sentReqs = await sentRes.json();

            const isAccepted = acceptedConns.some((c: any) => 
              c.sender_id === projectData.owner_id || c.receiver_id === projectData.owner_id
            );
            
            if (isAccepted) {
              setConnStatus("accepted");
            } else {
              const isPending = sentReqs.some((c: any) => c.receiver_id === projectData.owner_id);
              if (isPending) {
                setConnStatus("pending");
              }
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isLoaded, isSignedIn, user, projectId]);

  async function handleConnect() {
    if (!user || !project) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/connections/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-clerk-user-id": user.id },
        body: JSON.stringify({ receiver_id: project.owner_id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to send request");
      }
      setConnStatus("pending");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (!isSignedIn) return null;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 text-center">
          <p className="text-red-500 text-xl font-semibold mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const isOwner = project.owner_id === user.id;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <Link href="/dashboard" className="text-blue-600 hover:underline inline-flex items-center">
            &larr; Back to Dashboard
          </Link>
          
          <div className="flex gap-3">
            <Link 
              href={`/projects/${project.id}/matches`}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
              Find Similar Projects
            </Link>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
          <div className="p-8 border-b border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 capitalize">
                {project.stage}
              </span>
            </div>
            
            <p className="text-gray-700 text-lg whitespace-pre-wrap mb-6">{project.description}</p>
            
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag: string, index: number) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="mt-6 text-sm text-gray-500">
              Created on {new Date(project.created_at).toLocaleDateString()}
            </div>
          </div>
          
          {project.owner && (
            <div className="bg-gray-50 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">About the Builder</h3>
                {!isOwner && (
                  <div>
                    {connStatus === "accepted" ? (
                      <span className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">✓ Connected</span>
                    ) : connStatus === "pending" ? (
                      <span className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">⏳ Pending</span>
                    ) : (
                      <button
                        onClick={handleConnect}
                        disabled={actionLoading}
                        className="text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? "Sending..." : "Connect"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {(project.owner.name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {project.owner.name || "Anonymous Builder"}
                    {isOwner && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">You</span>}
                  </h4>
                  <p className="text-gray-600 mt-1">{project.owner.bio || "No bio provided."}</p>
                  
                  {project.owner.skills && project.owner.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {project.owner.skills.map((skill: string, index: number) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

