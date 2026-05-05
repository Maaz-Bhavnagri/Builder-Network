'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ChatPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("user_id");

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function fetchConversations() {
      if (!isLoaded || !isSignedIn || !user) return;
      try {
        const res = await fetch(`${apiUrl}/conversations`, {
          headers: { "x-clerk-user-id": user.id }
        });
        if (!res.ok) throw new Error("Failed to fetch conversations");
        const data = await res.json();
        setConversations(data);

        // If user_id is in query params, try to select that user
        if (initialUserId) {
          const conv = data.find((c: any) => c.user.id === initialUserId);
          if (conv) {
            setSelectedUser(conv.user);
          } else {
            // If not in conversations, they might be a new connection with no messages yet
            // Fetch connection to verify? For now, we'll just try to find them in data or wait.
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, [isLoaded, isSignedIn, user, initialUserId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedUser && user) {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`${apiUrl}/messages/${selectedUser.id}`, {
            headers: { "x-clerk-user-id": user.id }
          });
          if (res.ok) {
            const data = await res.json();
            setMessages(data);
          }
        } catch (err) {
          console.error("Failed to poll messages", err);
        }
      };

      fetchMessages();
      interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [selectedUser, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !user) return;

    const content = newMessage;
    setNewMessage("");

    try {
      const res = await fetch(`${apiUrl}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clerk-user-id": user.id
        },
        body: JSON.stringify({
          receiver_id: selectedUser.id,
          content: content
        })
      });

      if (!res.ok) throw new Error("Failed to send message");
      const sentMsg = await res.json();
      setMessages((prev) => [...prev, sentMsg]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading chat...</p>
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        </div>
        <Link href="/connections" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          My Connections
        </Link>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Conversations</p>
          </div>
          <div className="divide-y divide-gray-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 italic text-sm">
                No active chats yet.
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.user.id}
                  onClick={() => setSelectedUser(conv.user)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex gap-3 items-center ${selectedUser?.id === conv.user.id ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''}`}
                >
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                    {(conv.user.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="font-bold text-gray-900 truncate">{conv.user.name || "Anonymous"}</p>
                      {conv.last_message && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(conv.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.last_message ? conv.last_message.content : "No messages yet"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 bg-white">
                <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {(selectedUser.name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{selectedUser.name || "Anonymous"}</h2>
                  <p className="text-xs text-green-500 font-medium">Connected</p>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                    <div className="p-4 bg-white rounded-full shadow-sm">💬</div>
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          msg.sender_id === user.id
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.sender_id === user.id ? 'text-indigo-200' : 'text-gray-400'
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="h-10 w-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-gray-50/50">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl shadow-sm mb-4">👋</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Messages</h2>
              <p className="max-w-xs">Select a user from the sidebar to start a conversation with your connections.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
