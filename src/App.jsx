import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// 1. CONFIG (Using your provided Supabase credentials)
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function App() {
  // Navigation & UI State
  const [view, setView] = useState("dashboard"); 
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, flags: 0 });
  const [logs, setLogs] = useState([]);
  
  // Logic State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  // 2. INITIALIZATION: Load AI Models & Fetch Data
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        fetchData();
        setLoading(false);
      } catch (err) {
        console.error("AI Models failed to load. Check /public/models folder.", err);
      }
    };
    init();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('attendance').select('*').order('created_at', { ascending: false });
    if (data) {
      setLogs(data);
      setStats({
        present: data.filter(d => d.status === 'present').length,
        late: data.filter(d => d.status === 'late').length,
        absent: 0,
        flags: data.filter(d => d.ai_flag === true).length
      });
    }
  };

  // 3. CORE ACTION: CLOCK IN
  const handleClockIn = async () => {
    if (!videoRef.current) return;
    
    // A. Detect Face
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
    
    if (!detection) {
      alert("⚠️ Identity Verification Failed: No face detected.");
      return;
    }

    // B. Get Geolocation
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      // C. Save to Supabase
      const { error } = await supabase.from('attendance').insert([{
        user_name: "Adamson Rolayo", 
        status: new Date().getHours() >= 9 ? "late" : "present",
        lat: latitude,
        lng: longitude,
        ai_flag: false // Logic: set to true if face descriptor doesn't match DB
      }]);

      if (!error) {
        alert("✅ Clock-in Successful!");
        closeCamera();
        fetchData();
        setView("dashboard");
      }
    }, () => alert("Location access required for attendance."));
  };

  const openCamera = async () => {
    setIsCameraOpen(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const closeCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setIsCameraOpen(false);
  };

  if (loading) return <div style={s.loader}>Loading AttendAI...</div>;

  return (
    <div style={s.container}>
      {/* HEADER */}
      <header style={s.header}>
        <span style={s.menuBtn}>☰</span>
        <h1 style={s.title}>Dashboard Overview</h1>
        <div style={s.onlineDot}></div>
      </header>

      {view === "dashboard" ? (
        <main style={s.main}>
          <p style={s.dateText}>{new Date().toDateString().toUpperCase()}</p>
          <h2 style={s.sectionHeader}>Attendance Overview</h2>

          {/* STATS GRID (Matches your UI) */}
          <div style={s.statsGrid}>
            <StatCard label="Present" val={stats.present} sub="of 1 staff" color="#EBF5FF" tColor="#1A56DB" />
            <StatCard label="Late" val={stats.late} sub="today" color="#FFF9E6" tColor="#D97706" />
            <StatCard label="Absent" val={stats.absent} sub="no check-in" color="#FEEBEB" tColor="#DC2626" />
            <StatCard label="AI Flags" val={stats.flags} sub="buddy punch" color="#E6FFFA" tColor="#059669" />
          </div>

          <h3 style={s.label}>QUICK ACTIONS</h3>
          <div style={s.actions}>
            <button onClick={() => { setView("clockin"); openCamera(); }} style={s.actionBtn}>📷<br/>Clock In</button>
            <button style={s.actionBtn}>👥<br/>Staff</button>
            <button style={s.actionBtn}>📋<br/>Records</button>
            <button style={s.actionBtn}>📍<br/>Overrides</button>
          </div>

          <h3 style={s.label}>LIVE FEED 🔴</h3>
          <div style={s.feed}>
            {logs.map((log, i) => (
              <div key={i} style={s.feedItem}>
                <span><b>{log.user_name}</b> - {log.status}</span>
                <span style={s.time}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            ))}
          </div>
        </main>
      ) : (
        /* CAMERA VIEW */
        <div style={s.cameraOverlay}>
          <div style={s.videoBox}>
            <video ref={videoRef} autoPlay muted style={s.video} />
            <div style={s.scannerLine}></div>
          </div>
          <button onClick={handleClockIn} style={s.primaryBtn}>Verify & Clock In</button>
          <button onClick={() => { closeCamera(); setView("dashboard"); }} style={s.cancelBtn}>Cancel</button>
        </div>
      )}

      {/* FOOTER NAV */}
      <footer style={s.footer}>
        <div onClick={() => setView("dashboard")} style={view === "dashboard" ? s.navActive : s.nav}>🏠<br/>Home</div>
        <div onClick={() => { setView("clockin"); openCamera(); }} style={s.nav}>📷<br/>Clock In</div>
        <div style={s.nav}>📋<br/>Records</div>
        <div style={s.nav}>⚙️<br/>Settings</div>
      </footer>
    </div>
  );
}

// Sub-Component
const StatCard = ({ label, val, sub, color, tColor }) => (
  <div style={{ ...s.card, backgroundColor: color }}>
    <p style={s.cardLabel}>{label.toUpperCase()}</p>
    <h2 style={{ ...s.cardVal, color: tColor }}>{val}</h2>
    <p style={s.cardSub}>{sub}</p>
  </div>
);

// STYLES
const s = {
  container: { fontFamily: 'Inter, sans-serif', backgroundColor: '#F8FAFC', height: '100vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: '#FFF', borderBottom: '1px solid #E2E8F0', alignItems: 'center' },
  title: { fontSize: '16px', fontWeight: '700' },
  onlineDot: { width: '10px', height: '10px', backgroundColor: '#10B981', borderRadius: '50%' },
  main: { padding: '20px', flex: 1, overflowY: 'auto' },
  dateText: { fontSize: '10px', color: '#94A3B8', textAlign: 'center', marginBottom: '5px' },
  sectionHeader: { fontSize: '20px', textAlign: 'center', marginBottom: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' },
  card: { padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' },
  cardLabel: { fontSize: '10px', color: '#64748B' },
  cardVal: { fontSize: '28px', margin: '5px 0' },
  cardSub: { fontSize: '10px', color: '#94A3B8' },
  label: { fontSize: '11px', color: '#94A3B8', margin: '15px 0 10px' },
  actions: { display: 'flex', justifyContent: 'space-between', gap: '10px' },
  actionBtn: { flex: 1, backgroundColor: '#FFF', border: '1px solid #E2E8F0', padding: '12px 5px', borderRadius: '10px', fontSize: '10px', cursor: 'pointer' },
  feed: { backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '10px' },
  feedItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' },
  time: { color: '#94A3B8', fontSize: '11px' },
  footer: { display: 'flex', justifyContent: 'space-around', padding: '15px', backgroundColor: '#FFF', borderTop: '1px solid #E2E8F0' },
  nav: { textAlign: 'center', fontSize: '10px', color: '#94A3B8', cursor: 'pointer' },
  navActive: { textAlign: 'center', fontSize: '10px', color: '#1A56DB', fontWeight: 'bold' },
  cameraOverlay: { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  videoBox: { width: '100%', borderRadius: '20px', overflow: 'hidden', position: 'relative', border: '4px solid white', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  video: { width: '100%', display: 'block' },
  primaryBtn: { width: '100%', padding: '15px', backgroundColor: '#1A56DB', color: '#FFF', border: 'none', borderRadius: '12px', marginTop: '20px', fontWeight: 'bold' },
  cancelBtn: { marginTop: '15px', border: 'none', background: 'none', color: '#64748B' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }
};
