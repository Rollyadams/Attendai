import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// Initialize Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Office Coordinates (Lagos, Nigeria based on your screenshot)
const OFFICE_LAT = 6.6018;
const OFFICE_LNG = 3.3515;

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const videoRef = useRef(null);

  // 1. Initialize Auth and AI Models
  useEffect(() => {
    const initApp = async () => {
      // Check Auth Session
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      // Load AI Models from /public/models
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models")
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load AI models:", err);
      }
      setLoading(false);
    };

    initApp();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // 2. Camera Management
  useEffect(() => {
    let stream = null;
    if (view === "camera" && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then((s) => {
          stream = s;
          videoRef.current.srcObject = s;
        })
        .catch((err) => alert("Camera access denied: " + err.message));
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [view]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login Failed: " + error.message);
  };

  const handleClockIn = async () => {
    if (!modelsLoaded) return alert("AI is still warming up...");

    // AI Recognition
    const detection = await faceapi.detectSingleFace(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions()
    );

    if (!detection) {
      alert("Face not recognized. Please center your face in the frame.");
      return;
    }

    // Geolocation Verification
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Simple Distance Check
        const dist = Math.sqrt(
          Math.pow(latitude - OFFICE_LAT, 2) + Math.pow(longitude - OFFICE_LNG, 2)
        );

        // 0.01 is roughly 1.1km radius
        if (dist > 0.01) {
          alert("Error: You must be at the office to clock in!");
          return;
        }

        const { error } = await supabase.from("attendance").insert([
          {
            user_id: session.user.id,
            status: "present",
            lat: latitude,
            lng: longitude,
          },
        ]);

        if (!error) {
          alert("Check-in successful, Adamson!");
          setView("dashboard");
        } else {
          alert("Database Error: " + error.message);
        }
      },
      (err) => alert("Please enable GPS to verify your location.")
    );
  };

  if (loading) return <div style={styles.center}>Loading AttendAI...</div>;

  if (!session) return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <h1 style={{ color: "#1A56DB", marginBottom: "10px" }}>AttendAI</h1>
        <p style={{ color: "#64748B", marginBottom: "20px" }}>Staff Portal</p>
        <form onSubmit={handleLogin} style={styles.form}>
          <input type="email" placeholder="Email Address" onChange={e => setEmail(e.target.value)} style={styles.input} required />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={styles.input} required />
          <button type="submit" style={styles.loginBtn}>Sign In</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <span style={{ fontWeight: "bold", fontSize: "1.2rem" }}>AttendAI</span>
        <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>Logout</button>
      </header>

      {view === "dashboard" ? (
        <div style={styles.content}>
          <h2 style={{ marginBottom: "20px" }}>Dashboard Overview</h2>
          <div style={styles.statsGrid}>
            <div style={{ ...styles.statCard, backgroundColor: "#EBF5FF" }}>
              <span style={{ fontSize: "2rem" }}>✅</span>
              <p>PRESENT</p>
              <h3>1</h3>
            </div>
            <div style={{ ...styles.statCard, backgroundColor: "#FFFBEB" }}>
              <span style={{ fontSize: "2rem" }}>⏰</span>
              <p>LATE</p>
              <h3>0</h3>
            </div>
          </div>
          <button style={styles.clockInBtn} onClick={() => setView("camera")}>
            📸 Open Camera to Clock In
          </button>
        </div>
      ) : (
        <div style={styles.cameraView}>
          <div style={styles.videoWrapper}>
            <video ref={videoRef} autoPlay muted playsInline style={styles.video} />
            <div style={styles.overlay}></div>
          </div>
          <button style={styles.clockInBtn} onClick={handleClockIn}>Verify Identity</button>
          <button onClick={() => setView("dashboard")} style={styles.cancelBtn}>Cancel</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  center: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" },
  authPage: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  authCard: { padding: "40px", backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", textAlign: "center", width: "100%", maxWidth: "400px" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  input: { padding: "14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "1rem" },
  loginBtn: { padding: "14px", backgroundColor: "#1A56DB", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
  appContainer: { minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", backgroundColor: "white", borderBottom: "1px solid #E2E8F0" },
  logoutBtn: { color: "#EF4444", background: "none", border: "none", fontWeight: "bold", cursor: "pointer" },
  content: { padding: "20px" },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "30px" },
  statCard: { padding: "20px", borderRadius: "12px", textAlign: "center", border: "1px solid #E2E8F0" },
  clockInBtn: { width: "100%", padding: "18px", backgroundColor: "#10B981", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1.1rem", cursor: "pointer" },
  cameraView: { padding: "20px", textAlign: "center" },
  videoWrapper: { position: "relative", marginBottom: "20px", borderRadius: "16px", overflow: "hidden", backgroundColor: "#000" },
  video: { width: "100%", display: "block" },
  overlay: { position: "absolute", top: "10%", left: "10%", right: "10%", bottom: "10%", border: "2px dashed rgba(255,255,255,0.5)", borderRadius: "50%" },
  cancelBtn: { marginTop: "20px", background: "none", border: "none", color: "#64748B", cursor: "pointer" }
};