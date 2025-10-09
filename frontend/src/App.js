import React, { useState } from 'react';

function App() {
  const [message, setMessage] = useState('Click the button to get a message from the backend.');

  const fetchHelloWorld = async () => {
    setMessage('Loading...');
    try {
      // Nginx proxy akan meneruskan ini ke backend di http://doko_backend:8080/api/hello
      const response = await fetch('/api/hello');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage(`Failed to fetch message: ${error.message}`);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif', color: '#333' }}>
      <header>
        <h1>Frontend & Backend Interaction</h1>
        <p>This button will call the backend service.</p>
        <button 
          onClick={fetchHelloWorld}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white' }}
        >
          Get Hello World
        </button>
        <p style={{ marginTop: '20px', fontSize: '18px' }}>
          <strong>Backend says:</strong> 
          <span style={{ display: 'block', marginTop: '10px', padding: '15px', backgroundColor: '#f0f2f5', borderRadius: '5px' }}>
            {message}
          </span>
        </p>
      </header>
    </div>
  );
}

export default App;
