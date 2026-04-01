import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// ── HARDCODED CONFIG (Ensures Vercel connects immediately) ──
const SUPABASE_URL  = "https://supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // 1. SESSION CHECKER (The Gatekeeper)
  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for sign-in / sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. LOGIN LOGIC
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Session will update automatically via the listener above
    } catch (err) {
      alert("Login Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. LOGOUT LOGIC
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView("dashboard"); // Reset view for next user
  };

  // --- RENDER LOGIN IF NO SESSION ---
  if (!session) {
    return (
      <div style={styles.authPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.brand}>AttendAI</h1>
          <p style={styles.subtitle}>Sign in to continue</p>
          <form onSubmit={handleLogin} style={styles.form}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
              style={styles.input} 
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              style={styles.input} 
              required 
            />
            <button type="submit" style={styles.primaryBtn} disabled={loading}>
              {loading ? "Verifying..." : "Login"}
            </button>
            <p style={styles.forgotText} onClick={() => alert("Check your email for reset instructions.")}>
              Forgot Password?
            </p>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD IF LOGGED IN ---
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span style={styles.logoText}>AttendAI</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </header>
      
      <main style={styles.main}>
        {view === "dashboard" ? (
          <div style={styles.dashboard}>
             <h2>Welcome, {session.user.email}</h2>
             <div style={styles.statsRow}>
                <div style={styles.statBox}>Present: 0</div>
                <div style={styles.statBox}>Late: 0</div>
             </div>
             <button style={styles.primaryBtn} onClick={() => setView("camera")}>
               Start Clock In
             </button>
          </div>
        ) : (
          <div style={styles.cameraView}>
            <video ref={videoRef} autoPlay muted style={styles.video} />
            <button style={styles.primaryBtn} onClick={() => setView("dashboard")}>
              Verify Face (Demo)
            </button>
            <button onClick={() => setView("dashboard")} style={styles.cancelBtn}>Cancel</button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── STYLES (Keep it simple and mobile-friendly) ──
const styles = {
  authPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8', padding: '20px' },
  loginCard: { backgroundColor: '#FFF', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center' },
  brand: { color: '#1A56DB', fontSize: '28px', marginBottom: '5px' },
  subtitle: { color: '#64748B', fontSize: '14px', marginBottom: '25px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '16px', outline: 'none' },
  primaryBtn: { padding: '16px', backgroundColor: '#1A56DB', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
  forgotText: { color: '#1A56DB', fontSize: '13px', marginTop: '10px', cursor: 'pointer' },
  app: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' },
  header: { padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderBottom: '1px solid #E2E8F0' },
  logoText: { fontWeight: 'bold', color: '#1A56DB' },
  logoutBtn: { background: 'none', border: 'none', color: '#DC2626', fontWeight: '600' },
  main: { padding: '20px', flex: 1 },
  statsRow: { display: 'flex', gap: '10px', margin: '20px 0' },
  statBox: { flex: 1, padding: '20px', backgroundColor: '#FFF', borderRadius: '15px', border: '1px solid #E2E8F0', textAlign: 'center' },
  cameraView: { display: 'flex', flexDirection: 'column', gap: '15px' },
  video: { width: '100%', borderRadius: '20px', backgroundColor: '#000' },
  cancelBtn: { border: 'none', background: 'none', color: '#64748B', fontWeight: '500' }
};
