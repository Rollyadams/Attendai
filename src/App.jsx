import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// ── NEW PROJECT CONFIG (Directly linked to jlsknoavpckqyjcxsomt) ──
const URL = "https://supabase.co";
const KEY = "sb_publishable_-EejwHhdJ7x660mftYhR_Q_o65wxc6J";
const supabase = createClient(URL, KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard, camera
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // 1. Auth & Back Button Logic
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

  // 2. Auth Handlers
  const handleAuth = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = type === 'login' 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      
      if (error) throw error;
      if (type === 'signup' && !data.session) alert("Account Created! You can now login.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. UI Views
  if (!session) return (
    <div style={s.authPage}>
      <h1 style={s.brand}>AttendAI</h1>
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
          </div>
        ) : (
          <div style={s.cameraView}>
            <video ref={videoRef} autoPlay muted style={s.video} />
            <button style={s.btn} onClick={() => alert("Verification logic ready...")}>Verify Face</button>
            <button onClick={() => setView("dashboard")} style={s.cancel}>Back to Dashboard</button>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  authPage: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px' },
  brand: { color: '#1A56DB', fontSize: '36px', marginBottom: '24px', fontWeight: '800' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '350px' },
  input: { padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  secBtn: { background: 'none', border: 'none', color: '#1A56DB', cursor: 'pointer', fontSize: '13px', marginTop: '10px' },
  app: { height: '100vh', background: '#F1F5F9' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE' },
  logout: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  main: { padding: '20px' },
  stats: { display: 'flex', gap: '10px', marginBottom: '20px' },
  card: { flex: 1, padding: '20px', background: 'white', borderRadius: '15px', textAlign: 'center', border: '1px solid #E2E8F0' },
  cameraView: { display: 'flex', flexDirection: 'column', gap: '15px' },
  video: { width: '100%', borderRadius: '15px', backgroundColor: 'black' },
  cancel: { background: 'none', border: 'none', color: '#64748B', marginTop: '10px' }
};
