"use client";

import { useState, useEffect } from 'react';

// Define the TypeScript structure for your notifications
interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
}

interface NotifyManProps {
  // We use this to force the component to reload data when a new message is sent
  refreshTrigger?: number; 
}

export default function NotifyMan({ refreshTrigger = 0 }: NotifyManProps) {
  const [history, setHistory] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch History Logic
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fast Delete Logic
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broadcast?")) return;
    
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Instantly remove it from the screen without reloading
        setHistory((prevHistory) => prevHistory.filter(item => item.id !== id)); 
      } else {
        alert("Failed to delete notification.");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // 3. Reload whenever the page opens OR whenever refreshTrigger changes
  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  if (isLoading) {
    return <div className="mt-8 text-gray-400 animate-pulse">Loading broadcast history...</div>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4 text-white">Recent Broadcasts</h3>
      
      {history.length === 0 ? (
        <p className="text-gray-500 italic">No recent broadcasts found.</p>
      ) : (
        <div className="space-y-3">
          {history.map((note) => (
            <div key={note.id} className="p-4 bg-gray-800 rounded-lg flex justify-between items-center border border-gray-700">
              <div>
                <p className="font-bold text-white">{note.title}</p>
                <p className="text-sm text-gray-400">{note.body}</p>
                <p className="text-xs text-gray-500 mt-1">{note.timestamp}</p>
              </div>
              
              {/* FAST DELETE BUTTON */}
              <button 
                onClick={() => handleDelete(note.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}