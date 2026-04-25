'use client';

import { useState } from 'react';

export default function FirestoreIndexHelper() {
  const [rawError, setRawError] = useState('');
  const [projectId, setProjectId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  // The exact indexes required by your exams.dart logic
  const requiredIndexes = [
    {
      name: "Exams Base Query",
      fields: "grade (Ascending), region (Ascending), isAnswer (Ascending), year (Descending)"
    },
    {
      name: "Exams Subject Query",
      fields: "grade (Ascending), region (Ascending), subjectId (Ascending), isAnswer (Ascending), year (Descending)"
    }
  ];

  const handleExtractLink = () => {
    if (!rawError) return;
    
    // Regex to catch the Firebase console link inside the Flutter error dump
    const urlRegex = /(https:\/\/console\.firebase\.google\.com[^\s]+)/g;
    const match = rawError.match(urlRegex);
    
    if (match && match.length > 0) {
      setGeneratedLink(match[0]);
    } else {
      setGeneratedLink('No valid Firebase index URL found in the text.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-800 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold mb-2">Firestore Index Link Generator</h1>
        <p className="text-gray-500 mb-8">
          Paste the raw terminal error to extract the direct 1-click index generation link.
        </p>

        {/* URL Extractor Section */}
        <div className="space-y-4 mb-10">
          <label className="block text-sm font-semibold">
            Paste Flutter Console Error Here:
          </label>
          <textarea
            className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
            placeholder="Paste the error containing 'https://console.firebase.google.com/v1/r/project/...'"
            value={rawError}
            onChange={(e) => setRawError(e.target.value)}
          />
          <button
            onClick={handleExtractLink}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Extract Clickable Link
          </button>

          {generatedLink && (
            <div className={`p-4 rounded-xl break-all ${generatedLink.startsWith('http') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {generatedLink.startsWith('http') ? (
                <a 
                  href={generatedLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 font-medium hover:underline flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  Click here to build the index in Firebase
                </a>
              ) : (
                <span className="text-red-600">{generatedLink}</span>
              )}
            </div>
          )}
        </div>

        <hr className="mb-8 border-gray-100" />

        {/* Required Indexes Reference */}
        <div>
          <h2 className="text-lg font-bold mb-4">Required Indexes for exams.dart</h2>
          <div className="grid gap-4">
            {requiredIndexes.map((idx, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-semibold mb-1">{idx.name}</h3>
                <code className="text-sm text-pink-600 bg-pink-50 px-2 py-1 rounded">
                  {idx.fields}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
