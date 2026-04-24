'use client';

import { useState } from 'react';
// ⚠️ Adjust this import path to point to your project's Firebase lib file
import { db, auth } from '../lib/firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function FirestoreIndexTester() {
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to add logs to the UI
  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const testFirestoreQuery = async () => {
    setIsLoading(true);
    setLogs([]);
    setErrorMessage(null);

    try {
      // 1. Authenticate to bypass 'Missing permissions' rules
      addLog('Logging in to bypass security rules...');
      // ⚠️ PUT A VALID TEST USER EMAIL AND PASSWORD HERE
      await signInWithEmailAndPassword(auth, "test@email.com", "yourpassword");
      addLog('Logged in successfully!');

      // 2. Run the exact published query from Arday Caawiye
      addLog('Running the exact query...');
      const examsRef = collection(db, 'exams');
      
      const q = query(
        examsRef,
        where('grade', '==', 'Form 4'),
        where('region', '==', 'Somaliland'),
        where('isAnswer', '!=', true),
        orderBy('year', 'desc')
      );

      await getDocs(q);
      addLog('✅ Query succeeded! No index is missing.');

    } catch (error: any) {
      addLog('🔥 FIREBASE ERROR TRIGGERED:');
      setErrorMessage(error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>Firestore Index Link Generator</h2>
      
      <button 
        onClick={testFirestoreQuery} 
        disabled={isLoading}
        style={{ padding: '10px 20px', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        {isLoading ? 'Running Test...' : 'Run Query & Get Index Link'}
      </button>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Process Logs:</h3>
        {logs.map((log, i) => (
          <p key={i} style={{ margin: '5px 0', fontSize: '14px' }}>{log}</p>
        ))}
        
        {errorMessage && (
          <div style={{ marginTop: '15px', padding: '15px', background: '#ffebee', color: '#c62828', borderRadius: '5px', wordWrap: 'break-word' }}>
            <strong>Raw Error:</strong><br /><br />
            {/* Using dangerouslySetInnerHTML so the Firebase URL becomes a clickable link if it exists */}
            <div dangerouslySetInnerHTML={{ 
              __html: errorMessage.replace(/(https:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: blue; text-decoration: underline;">$1</a>') 
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
