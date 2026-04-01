import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── HARDCODED CONFIG (Ensures guaranteed connection on Vercel) ──
const URL = "https://supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(URL, KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 10-second safety timeout
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Connection Timed Out: Check if your network blocks 'supabase.co'. Try Mobile Data.");
      }
    }, 10000);

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      clearTimeout(timer);
      if (error) throw error;
      if (isSignUp && !data.session) alert("Account created! Check your email if confirmation is on.");
    } catch (err) {
      alert("Auth Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>AttendAI</h1>
        <form onSubmit={handleAuth} style={s.form}>
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={s.in} required />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={s.in} required />
          <button type="submit" style={s.btn} disabled={loading}>{loading ? "Connecting..." : (isSignUp ? "Sign Up" : "Login")}</button>
          <p onClick={() => setIsSignUp(!isSignUp)} style={s.link}>{isSignUp ? "Back to Login" : "New user? Create Account"}</p>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.dash}>
      <header style={s.header}><b>AttendAI</b><button onClick={() => supabase.auth.signOut()} style={s.out}>Sign Out</button></header>
      <div style={s.body}><h2>Logged In! ✅</h2><p>{session.user.email}</p></div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8', padding: '20px' },
  card: { background: 'white', padding: '40px 30px', borderRadius: '24px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  logo: { color: '#1A56DB', marginBottom: '25px', fontWeight: '800', fontSize: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  in: { padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' },
  link: { color: '#1A56DB', cursor: 'pointer', marginTop: '10px', fontSize: '13px' },
  dash: { height: '100vh', background: '#F8FAFC' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE' },
  out: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  body: { padding: '40px', textAlign: 'center' }
};
