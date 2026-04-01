import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── GUARANTEED CONFIG (Hardcoded for your project) ──
const SUPABASE_URL  = "https://supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // 1. Listen for Auth Changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // 2. Auth Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      
      if (isSignUp && !data.session) {
        alert("Success! Check your email to confirm your account.");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── AUTH VIEW ──
  if (!session) return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>AttendAI</h1>
        <p style={s.sub}>{isSignUp ? "Create your account" : "Sign in to continue"}</p>
        <form onSubmit={handleAuth} style={s.form}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={s.input} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={s.input} required />
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? "Connecting..." : (isSignUp ? "Sign Up" : "Login")}
          </button>
          <p onClick={() => setIsSignUp(!isSignUp)} style={s.link}>
            {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </p>
        </form>
      </div>
    </div>
  );

  // ── LOGGED IN VIEW ──
  return (
    <div style={s.dash}>
      <header style={s.head}>
        <b>AttendAI</b>
        <button onClick={() => supabase.auth.signOut()} style={s.out}>Sign Out</button>
      </header>
      <div style={s.body}>
        <h2>Welcome back!</h2>
        <p style={{marginTop:'10px', color:'#64748B'}}>{session.user.email}</p>
        <div style={s.statGrid}>
          <div style={s.stat}>Present: 0</div>
          <div style={s.stat}>Late: 0</div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8', padding: '20px' },
  card: { background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '100%', maxWidth: '380px', textAlign: 'center' },
  logo: { color: '#1A56DB', marginBottom: '8px', fontWeight: '800', fontSize: '32px' },
  sub: { color: '#64748B', fontSize: '14px', marginBottom: '30px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' },
  link: { fontSize: '13px', color: '#1A56DB', cursor: 'pointer', marginTop: '10px' },
  dash: { height: '100vh', background: '#F8FAFC' },
  head: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE' },
  out: { color: '#DC2626', border: 'none', background: 'none', fontWeight: 'bold' },
  body: { padding: '30px', textAlign: 'center' },
  statGrid: { display: 'flex', gap: '10px', marginTop: '20px' },
  stat: { flex: 1, padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }
};
