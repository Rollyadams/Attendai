import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// ── DIRECT CONFIGURATION (jlsknoavpckqyjcxsomt) ──
const URL = "https://supabase.co";
const KEY = "sb_publishable_-EejwHhdJ7x660mftYhR_Q_o65wxc6J";
const supabase = createClient(URL, KEY);

// Office Coordinates for Geofencing (Lagos Example)
const OFFICE = { lat: 6.6018, lng: 3.3515, radius: 200 };

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard, camera, roster
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staff, setStaff] = useState([]);
  const videoRef = useRef(null);

  // 1. AUTH & BACK BUTTON LOGIC
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));

    // Fix for Android/Mobile Back Button
    window.history.pushState({ view: 'home' }, '');
    window.onpopstate = () => {
      if (view !== "dashboard") {
        setView("dashboard");
        window.history.pushState({ view: 'home' }, '');
      }
    };
    return () => subscription.unsubscribe();
  }, [view]);

  // 2. AUTHENTICATION HANDLERS
  const handleAuth = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    
    if (error) {
      alert("Auth Error: " + error.message);
    } else if (type === 'signup') {
      alert("Account Created! You can now login.");
    }
    setLoading(false);
  };

  // 3. ATTENDANCE & GEOFENCING
  const handleClockIn = async () => {
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
    if (!detection) return alert("Identity Error: Face not detected.");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, OFFICE.lat, OFFICE.lng);
      
      if (dist > OFFICE.radius) {
        return alert(`Geofence Error: You are ${Math.round(dist)}m away from the office.`);
      }
      
      const { error } = await supabase.from('attendance').insert([{ 
        user_id: session.user.id, 
        status: 'present',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }]);

      if (!error) {
        alert("Success! Attendance recorded.");
        setView("dashboard");
      }
    }, () => alert("Location access is required for attendance."));
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // 4. UI VIEWS
  if (!session) return (
    <div style={s.page}>
      <h1 style={s.brand}>AttendAI</h1>
      <p style={s.subText}>Secure AI Attendance System</p>
      <form onSubmit={(e) => handleAuth(e, 'login')} style={s.form}>
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={s.input} required />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={s.input} required />
        <button type="submit" style={s.btn} disabled={loading}>{loading ? "Connecting..." : "Login"}</button>
        <button type="button" onClick={(e) => handleAuth(e, 'signup')} style={s.secBtn}>Create New Account</button>
      </form>
    </div>
  );

  return (
    <div style={s.app}>
      <header style={s.header}>
        <b>AttendAI Dashboard</b>
        <button onClick={() => supabase.auth.signOut()} style={s.logout}>Sign Out</button>
      </header>
      
      <main style={s.main}>
        {view === "dashboard" ? (
          <div>
            <div style={s.stats}>
              <div style={s.card}>Present: 1</div>
              <div style={s.card}>Late: 0</div>
            </div>
            <button style={s.btn} onClick={() => setView("camera")}>Open Attendance Terminal</button>
            <div style={s.grid}>
              <div style={s.tile} onClick={() => setView("roster")}>Staff Roster</div>
              <div style={s.tile}>History Logs</div>
            </div>
          </div>
        ) : (
          <div style={s.cameraView}>
            <video ref={videoRef} autoPlay muted style={s.video} />
            <button style={s.btn} onClick={handleClockIn}>Verify & Clock In</button>
            <button onClick={() => setView("dashboard")} style={s.cancel}>Back to Dashboard</button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── STYLES (MOBILE OPTIMIZED) ──
const s = {
  page: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px' },
  brand: { color: '#1A56DB', fontSize: '36px', marginBottom: '4px', fontWeight: '800' },
  subText: { color: '#64748B', fontSize: '14px', marginBottom: '30px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '380px' },
  input: { padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' },
  secBtn: { background: 'none', border: 'none', color: '#1A56DB', cursor: 'pointer', fontSize: '13px', marginTop: '10px' },
  app: { height: '100vh', background: '#F1F5F9' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #E2E8F0', alignItems: 'center' },
  logout: { color: '#DC2626', border: 'none', background: 'none', fontWeight: 'bold' },
  main: { padding: '20px' },
  stats: { display: 'flex', gap: '10px', marginBottom: '20px' },
  card: { flex: 1, padding: '20px', background: 'white', borderRadius: '15px', textAlign: 'center', border: '1px solid #E2E8F0', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' },
  tile: { padding: '25px', background: 'white', borderRadius: '15px', textAlign: 'center', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: '600' },
  cameraView: { display: 'flex', flexDirection: 'column', gap: '15px' },
  video: { width: '100%', borderRadius: '20px', backgroundColor: '#000', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  cancel: { background: 'none', border: 'none', color: '#64748B', marginTop: '10px', fontWeight: '500' }
};
