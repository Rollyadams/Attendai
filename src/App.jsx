import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// ── CONFIG ──
const SUPABASE_URL  = "https://supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const OFFICE_LAT = 6.6018; 
const OFFICE_LNG = 3.3515;
const MAX_DISTANCE = 200; // meters

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard, camera, roster, forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // 1. AUTH & BACK BUTTON LOGIC
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));

    window.history.pushState({ view: 'home' }, '');
    window.onpopstate = () => {
      if (view !== "dashboard") {
        setView("dashboard");
        window.history.pushState({ view: 'home' }, '');
      }
    };
  }, [view]);

  // 2. ACTIONS
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    alert(error ? error.message : "Reset link sent to your email!");
    setView("dashboard");
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const handleClockIn = async () => {
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
    if (!detection) return alert("Face not detected!");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
      if (dist > MAX_DISTANCE) return alert(`Too far! ${Math.round(dist)}m away.`);
      
      await supabase.from('attendance').insert([{ user_id: session.user.id, status: 'present' }]);
      alert("Clocked in!");
      setView("dashboard");
    });
  };

  // 3. RENDER LOGIC
  if (!session && view !== "forgot") {
    return (
      <div style={styles.authPage}>
        <h1 style={styles.brand}>AttendAI</h1>
        <form onSubmit={handleLogin} style={styles.form}>
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={styles.input} required />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={styles.input} required />
          <button type="submit" style={styles.primaryBtn} disabled={loading}>{loading ? "Loading..." : "Login"}</button>
          <p onClick={() => setView("forgot")} style={styles.link}>Forgot Password?</p>
        </form>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div style={styles.authPage}>
        <h2>Reset Password</h2>
        <input type="email" placeholder="Enter your email" onChange={e => setEmail(e.target.value)} style={styles.input} />
        <button onClick={handleResetPassword} style={styles.primaryBtn}>Send Reset Link</button>
        <p onClick={() => setView("dashboard")} style={styles.link}>Back to Login</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span>AttendAI</span>
        <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>Logout</button>
      </header>

      {view === "dashboard" ? (
        <div style={styles.main}>
          <div style={styles.stats}>
            <div style={styles.statBox}>Present: 1</div>
            <div style={styles.statBox}>Late: 0</div>
          </div>
          <button style={styles.primaryBtn} onClick={() => setView("camera")}>Clock In</button>
          <div style={styles.grid}>
            <div style={styles.tile} onClick={() => setView("roster")}>Staff</div>
            <div style={styles.tile}>Records</div>
          </div>
        </div>
      ) : (
        <div style={styles.cameraView}>
          <video ref={videoRef} autoPlay muted style={styles.video} />
          <button style={styles.primaryBtn} onClick={handleClockIn}>Verify Identity</button>
          <button onClick={() => setView("dashboard")} style={styles.cancelBtn}>Cancel</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  authPage: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '20px' },
  brand: { color: '#1A56DB', fontSize: '32px', marginBottom: '20px' },
  form: { width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '16px' },
  primaryBtn: { padding: '15px', backgroundColor: '#1A56DB', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  link: { color: '#1A56DB', cursor: 'pointer', marginTop: '10px', textAlign: 'center', fontSize: '14px' },
  app: { backgroundColor: '#F0F4F8', height: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0' },
  logoutBtn: { background: 'none', border: 'none', color: '#DC2626', fontWeight: 'bold' },
  main: { padding: '20px' },
  stats: { display: 'flex', gap: '10px', marginBottom: '20px' },
  statBox: { flex: 1, padding: '20px', backgroundColor: 'white', borderRadius: '10px', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' },
  tile: { padding: '20px', backgroundColor: 'white', borderRadius: '10px', textAlign: 'center', border: '1px solid #E2E8F0' },
  cameraView: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
  video: { width: '100%', borderRadius: '15px', backgroundColor: 'black' },
  cancelBtn: { background: 'none', border: 'none', color: '#64748B' }
};
