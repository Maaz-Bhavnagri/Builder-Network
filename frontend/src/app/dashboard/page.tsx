'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [dbUser, setDbUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectMatches, setProjectMatches] = useState<any[]>([]);
  const [userMatches, setUserMatches] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function fetchData() {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        // 1. Sync & Fetch Profile
        const meRes = await fetch(`${apiUrl}/me`, {
          headers: { "x-clerk-user-id": user.id }
        });
        if (!meRes.ok) throw new Error("Failed to load profile.");
        const profile = await meRes.json();
        setDbUser(profile);

        // Redirect to profile setup if missing bio/skills
        if (!profile.bio || (profile.skills && profile.skills.length === 0)) {
          // router.push("/profile"); // Optional: uncomment if you want forced redirect
        }

        // 2. Fetch My Projects
        const projRes = await fetch(`${apiUrl}/projects/my`, {
          headers: { "x-clerk-user-id": user.id }
        });
        const myProjects = projRes.ok ? await projRes.json() : [];
        setProjects(myProjects);

        // 3. Fetch Matches (if user has at least one project)
        if (myProjects.length > 0) {
          const latestProjId = myProjects[0].id;
          const [pmRes, umRes] = await Promise.all([
            fetch(`${apiUrl}/matches/projects/${latestProjId}`, { headers: { "x-clerk-user-id": user.id } }),
            fetch(`${apiUrl}/matches/users/${latestProjId}`, { headers: { "x-clerk-user-id": user.id } })
          ]);
          if (pmRes.ok) setProjectMatches((await pmRes.json()).slice(0, 5));
          if (umRes.ok) setUserMatches((await umRes.json()).slice(0, 5));
        }

        // 4. Fetch Connection Requests
        const reqRes = await fetch(`${apiUrl}/connections/requests`, {
          headers: { "x-clerk-user-id": user.id }
        });
        if (reqRes.ok) setRequests(await reqRes.json());

        // 5. Fetch Recent Conversations
        const convRes = await fetch(`${apiUrl}/conversations`, {
          headers: { "x-clerk-user-id": user.id }
        });
        if (convRes.ok) setConversations((await convRes.json()).slice(0, 3));

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isLoaded, isSignedIn, user]);

  const handleRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await fetch(`${apiUrl}/connections/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-clerk-user-id": user?.id || "" },
        body: JSON.stringify({ connection_id: requestId, status })
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        if (status === 'accepted') {
          // Refresh conversations to show new one maybe?
          const convRes = await fetch(`${apiUrl}/conversations`, {
            headers: { "x-clerk-user-id": user?.id || "" }
          });
          if (convRes.ok) setConversations((await convRes.json()).slice(0, 3));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header / Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {(dbUser?.name || user.fullName || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Welcome, {dbUser?.name || user.fullName}!</h1>
                  <p className="text-gray-500">Building something great today?</p>
                </div>
              </div>
              <Link href="/profile" className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                Edit Profile
              </Link>
            </div>
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed">{dbUser?.bio || "No bio set yet. Tell us about yourself!"}</p>
              {dbUser?.skills && dbUser.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {dbUser.skills.map((skill: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold uppercase tracking-wider">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats / Active Chats */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Chats</h3>
            <div className="flex-1 space-y-3">
              {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="text-2xl mb-2">💬</div>
                  <p className="text-sm text-gray-400 italic">No messages yet.</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <Link 
                    key={conv.user.id} 
                    href={`/chat?user_id=${conv.user.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                  >
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      {(conv.user.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm truncate">{conv.user.name || "Anonymous"}</p>
                      <p className="text-xs text-gray-500 truncate">{conv.last_message?.content || "Click to chat"}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <Link href="/chat" className="mt-4 text-center text-xs font-bold text-indigo-600 hover:underline">
              View all messages &rarr;
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: Projects & Matches */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* My Projects */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
                <Link href="/create-project" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95">
                  + Create New
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">You haven't posted any projects yet.</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">Sharing what you're building is the best way to find collaborators and get feedback.</p>
                  <Link href="/create-project" className="text-indigo-600 font-bold hover:underline">
                    Get started now &rarr;
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="group p-6 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                          {project.stage}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-6 h-10">{project.description}</p>
                      <div className="flex gap-2 mb-6">
                        {project.tags?.slice(0, 3).map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px] font-medium">#{tag}</span>
                        ))}
                      </div>
                      <div className="flex gap-2 border-t border-gray-50 pt-4">
                        <Link href={`/projects/${project.id}`} className="flex-1 text-center py-2 text-xs font-bold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">Details</Link>
                        <Link href={`/projects/${project.id}/matches`} className="flex-1 text-center py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Matches</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Suggested Matches */}
            {projects.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Discover Opportunities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Suggested Projects */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Recommended Projects</h3>
                    {projectMatches.length === 0 ? (
                      <p className="text-sm text-gray-400 italic bg-white p-6 rounded-2xl border border-gray-100">No matching projects found.</p>
                    ) : (
                      projectMatches.map((m) => (
                        <Link key={m.project.id} href={`/projects/${m.project.id}`} className="block p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow group">
                          <h4 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors truncate">{m.project.title}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase">{m.project.stage}</span>
                            <span className="text-[10px] text-gray-400 font-medium">{m.score}% Match</span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>

                  {/* Suggested Builders */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Relevant Builders</h3>
                    {userMatches.length === 0 ? (
                      <p className="text-sm text-gray-400 italic bg-white p-6 rounded-2xl border border-gray-100">No matching builders found.</p>
                    ) : (
                      userMatches.map((m) => (
                        <div key={m.user.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                              {(m.user.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">{m.user.name || "Anonymous"}</p>
                              <p className="text-[10px] text-gray-400 truncate">{m.user.skills?.join(", ")}</p>
                            </div>
                          </div>
                          <Link href={`/chat?user_id=${m.user.id}`} className="text-[10px] font-bold text-indigo-600 hover:underline">Message</Link>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar: Connection Requests */}
          <div className="space-y-8">
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Connection Requests</h3>
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2 grayscale opacity-50">🤝</div>
                  <p className="text-xs text-gray-400 font-medium">No new requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {(req.sender.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{req.sender.name || "Anonymous"}</p>
                          <p className="text-[10px] text-gray-500 truncate">{req.sender.bio || "No bio"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRespond(req.id, 'accepted')}
                          className="flex-1 py-2 text-[10px] font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleRespond(req.id, 'rejected')}
                          className="flex-1 py-2 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/connections" className="mt-6 block text-center text-xs font-bold text-indigo-600 hover:underline">
                Manage Network &rarr;
              </Link>
            </section>

            {/* Engagement Card */}
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
              <h4 className="font-bold mb-2">Build Together</h4>
              <p className="text-xs text-indigo-100 mb-4 leading-relaxed">
                Connecting with other builders is the fastest way to accelerate your project. 
                Complete your profile to get 2x more relevant matches.
              </p>
              <Link href="/profile" className="inline-block px-4 py-2 bg-white text-indigo-600 text-[10px] font-bold rounded-lg hover:bg-indigo-50 transition-colors">
                Complete Profile
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
