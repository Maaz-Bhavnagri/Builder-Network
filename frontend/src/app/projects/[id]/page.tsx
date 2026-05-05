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

  useEffect(() => {
    async function fetchProject() {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/projects/${projectId}`, {
          method: "GET",
          headers: {
            "x-clerk-user-id": user.id,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Project not found");
          }
          throw new Error("Failed to fetch project details");
        }

        const data = await response.json();
        setProject(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [isLoaded, isSignedIn, user, projectId]);

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
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">About the Builder</h3>
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
