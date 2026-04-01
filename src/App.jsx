import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const URL = "https://supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(URL, KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Simplified session check - NO async listeners to avoid deadlocks
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    checkSession();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Manual timeout: if no response in 10s, alert the user
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Network Timeout: Supabase is not responding. Try switching from Wi-Fi to Mobile Data.");
      }
    }, 10000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      clearTimeout(timer);
      if (error) throw error;
      setSession(data.session);
    } catch (err) {
      alert("Login Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert("Account Created! You can now Login.");
    } catch (err) {
      alert("Sign Up Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>AttendAI</h1>
        <form onSubmit={handleLogin} style={s.form}>
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={s.input} required />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={s.input} required />
          <button type="submit" style={s.btn} disabled={loading}>{loading ? "Connecting..." : "Login"}</button>
          <button type="button" onClick={handleSignUp} style={s.secBtn} disabled={loading}>Create New Account</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.dash}>
      <header style={s.header}>
        <b>AttendAI</b>
        <button onClick={async () => { await supabase.auth.signOut(); setSession(null); }} style={s.out}>Sign Out</button>
      </header>
      <div style={s.body}>
        <h2>System Online</h2>
        <p>Logged in as: {session.user.email}</p>
      </div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8', padding: '20px' },
  card: { background: 'white', padding: '40px 30px', borderRadius: '20px', width: '100%', maxWidth: '360px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  logo: { color: '#1A56DB', marginBottom: '25px', fontWeight: '800' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  secBtn: { padding: '10px', background: 'none', color: '#1A56DB', border: 'none', fontSize: '13px', cursor: 'pointer' },
  dash: { height: '100vh', background: '#F8FAFC' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE' },
  out: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  body: { padding: '40px', textAlign: 'center' }
};
