import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient"; // Uses your hardcoded client
import * as faceapi from "face-api.js";

// OFFICE COORDINATES (Update these for your Geofence)
const OFFICE_LAT = 6.6018; 
const OFFICE_LNG = 3.3515;
const MAX_DISTANCE = 200; // Meters

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard, camera, roster, forgot
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const videoRef = useRef(null);

  // ── 1. AUTH & BACK BUTTON LOGIC ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));

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

  // ── 2. ACTIONS ──
  const handleAuth = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = type === 'login' 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (type === 'signup') alert("Account Created! You can now login.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
    if (!detection) return alert("Identity verification failed: Face not detected.");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
      if (dist > MAX_DISTANCE) return alert(`Geofence Error: You are ${Math.round(dist)}m away from the office.`);
      
      const { error } = await supabase.from('attendance').insert([{ user_id: session.user.id, status: 'present' }]);
      if (!error) { alert("Clock-in successful!"); setView("dashboard"); }
    }, () => alert("Location access required."));
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // ── 3. VIEWS ──
  if (!session) return (
    <div style={s.authPage}>
      <h1 style={s.logo}>AttendAI</h1>
      <form onSubmit={(e) => handleAuth(e, 'login')} style={s.form}>
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={s.input} required />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={s.input} required />
        <button type="submit" style={s.btn} disabled={loading}>{loading ? "Connecting..." : "Login"}</button>
        <button type="button" onClick={(e) => handleAuth(e, 'signup')} style={s.secBtn}>Create Account</button>
      </form>
    </div>
  );

  return (
    <div style={s.app}>
      <header style={s.header}><b>AttendAI</b><button onClick={() => supabase.auth.signOut()} style={s.logout}>Sign Out</button></header>
      <main style={s.main}>
        {view === "dashboard" ? (
          <div>
            <div style={s.stats}>
              <div style={s.card}>Present: 1</div>
              <div style={s.card}>Late: 0</div>
            </div>
            <button style={s.btn} onClick={() => setView("camera")}>Clock In</button>
            <div style={s.grid}>
              <div style={s.tile}>Staff</div>
              <div style={s.tile}>Records</div>
            </div>
          </div>
        ) : (
          <div style={s.cameraView}>
            <video ref={videoRef} autoPlay muted style={s.video} />
            <button style={s.btn} onClick={handleClockIn}>Verify & Clock In</button>
            <button onClick={() => setView("dashboard")} style={s.cancel}>Back</button>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  authPage: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '20px' },
  logo: { color: '#1A56DB', fontSize: '32px', marginBottom: '20px', fontWeight: '800' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '350px' },
  input: { padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '15px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  secBtn: { background: 'none', border: 'none', color: '#1A56DB', fontSize: '13px', cursor: 'pointer' },
  app: { height: '100vh', backgroundColor: '#F0F4F8' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'white', borderBottom: '1px solid #EEE' },
  logout: { color: 'red', border: 'none', background: 'none', fontWeight: '600' },
  main: { padding: '20px' },
  stats: { display: 'flex', gap: '10px', marginBottom: '20px' },
  card: { flex: 1, padding: '20px', background: 'white', borderRadius: '15px', textAlign: 'center', border: '1px solid #E2E8F0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' },
  tile: { padding: '20px', background: 'white', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' },
  cameraView: { display: 'flex', flexDirection: 'column', gap: '15px' },
  video: { width: '100%', borderRadius: '15px', backgroundColor: 'black' },
  cancel: { background: 'none', border: 'none', color: '#64748B', marginTop: '10px' }
};
