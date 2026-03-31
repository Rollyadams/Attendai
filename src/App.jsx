import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from './supabase';

function App() {
  const videoRef = useRef();
  const [status, setStatus] = useState("Loading AI...");

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setStatus("AI Ready! Start Camera.");
      } catch (err) {
        setStatus("Error: AI models missing from public/models");
      }
    };
    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => { videoRef.current.srcObject = stream; })
      .catch(err => setStatus("Camera error: " + err.message));
  };

  const handleScan = async () => {
    setStatus("Scanning...");
    const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
    
    if (detections.length > 0) {
      // Logic to check your Supabase admin role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('employees').select('role').eq('auth_user_id', user.id).single();
        if (data?.role === 'admin') setStatus("Welcome, Admin Adamson!");
        else setStatus("Access Denied: Not an Admin.");
      } else {
        setStatus("Please log in first!");
      }
    } else {
      setStatus("No face detected.");
    }
  };

  return (
    <div style={{ textAlign: 'center', background: '#121212', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <h1>AttendAI Pro</h1>
      <p style={{ color: '#3ecf8e' }}>{status}</p>
      <video ref={videoRef} autoPlay muted width="100%" style={{ borderRadius: '10px', maxWidth: '400px' }} />
      <br />
      <button onClick={startVideo} style={{ margin: '10px', padding: '15px', background: '#3ecf8e', border: 'none', borderRadius: '5px', color: 'white' }}>
        1. Start Camera
      </button>
      <button onClick={handleScan} style={{ margin: '10px', padding: '15px', background: '#646cff', border: 'none', borderRadius: '5px', color: 'white' }}>
        2. Scan Face
      </button>
    </div>
  );
}

export default App;

