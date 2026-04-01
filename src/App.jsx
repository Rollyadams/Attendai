import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// ── EXACT CONFIG FROM YOUR NEW PROJECT ──
const SUPABASE_URL  = "https://jlsknoavpckqyjcxsomt.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc2tub2F2cGNrcXlqY3hzb210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzIxMjMsImV4cCI6MjA5MDY0ODEyM30.Gv_JuxMrV39VEkDs46kWi9rzvb-_vVNhHGEruYni_-0";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// VERIFIED VERCEL URL: https://attendai-x2rb.vercel.app/

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard, camera, roster
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const videoRef = useRef(null);

  // 1. SESSION & MOBILE BACK BUTTON FIX
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));

    window.history.pushState({ view: 'home' }, '');
    window.onpopstate = () => {
      if (view !== "dashboard") {
        setView("dashboard");
        window.history.pushState({ view: 'home' }, '');
      }
    };
    return () => subscription.unsubscribe();
  }, [view]);

  // 2. AUTH HANDLER
  const handleAuth = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = type === 'login' 
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
      
      if (error) throw error;
      if (type === 'signup') alert("Account created! You can now login.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. UI RENDERING
  if (!session) return (
    <div style={s.page}>
      <h1 style={s.brand}>AttendAI</h1>
      <p style={s.subText}>Secure AI Attendance</p>
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
        <b>AttendAI</b>
        <button onClick={() => supabase.auth.signOut()} style={s.logout}>Sign Out</button>
      </header>
      <main style={s.main}>
        {view === "dashboard" ? (
          <div>
            <div style={s.stats}>
              <div style={s.card}>Present: 1</div>
              <div style={s.card}>Late: 0</div>
            </div>
            <button style={s.btn} onClick={() => setView("camera")}>Open Attendance Camera</button>
            <div style={s.grid}>
                <div style={s.tile} onClick={() => setView("roster")}>Staff Roster</div>
                <div style={s.tile}>History Logs</div>
            </div>
          </div>
        ) : (
          <div style={s.cameraView}>
            <video ref={videoRef} autoPlay muted style={s.video} />
            <button onClick={() => setView("dashboard")} style={s.cancel}>Back to Dashboard</button>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px' },
  brand: { color: '#1A56DB', fontSize: '32px', marginBottom: '4px', fontWeight: '800' },
  subText: { color: '#64748B', fontSize: '14px', marginBottom: '30px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '380px' },
  input: { padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' },
  secBtn: { background: 'none', border: 'none', color: '#1A56DB', cursor: 'pointer', fontSize: '13px', marginTop: '10px' },
  app: { height: '100vh', background: '#F1F5F9' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE', alignItems: 'center' },
  logout: { color: '#DC2626', border: 'none', background: 'none', fontWeight: 'bold' },
  main: { padding: '20px' },
  stats: { display: 'flex', gap: '10px', marginBottom: '20px' },
  card: { flex: 1, padding: '20px', background: 'white', borderRadius: '15px', textAlign: 'center', border: '1px solid #E2E8F0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' },
  tile: { padding: '20px', background: 'white', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0', fontSize: '13px' },
  cameraView: { display: 'flex', flexDirection: 'column', gap: '15px' },
  video: { width: '100%', borderRadius: '15px', backgroundColor: 'black' },
  cancel: { background: 'none', border: 'none', color: '#64748B', marginTop: '10px', fontWeight: '500' }
};
