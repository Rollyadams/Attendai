import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── NEW PROJECT CONFIG ──
const URL = "https://supabase.co";
const KEY = "sb_publishable_-EejwHhdJ7x660mftYhR_Q_o65wxc6J";
const supabase = createClient(URL, KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    // Safety Timeout: Stops the "Connecting" hang after 5s
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Network Block: Your mobile network is preventing the connection to Supabase. Try switching to Wi-Fi or a VPN.");
      }
    }, 5000);

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      clearTimeout(timer);
      if (error) throw error;
      
      if (isSignUp && !data.session) alert("Account Created! Check email (or disable 'Confirm Email' in Supabase)");
    } catch (err) {
      alert("System Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return (
    <div style={s.page}>
      <h1 style={s.brand}>AttendAI</h1>
      <p style={s.sub}>Secure AI Attendance System</p>
      <form onSubmit={handleAuth} style={s.form}>
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={s.input} required />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={s.input} required />
        <button type="submit" style={s.btn} disabled={loading}>{loading ? "Connecting..." : (isSignUp ? "Create Account" : "Login")}</button>
        <p onClick={() => { setIsSignUp(!isSignUp); setLoading(false); }} style={s.link}>
          {isSignUp ? "Already have an account? Login" : "Create New Account"}
        </p>
      </form>
    </div>
  );

  return (
    <div style={s.dash}>
      <header style={s.head}><b>AttendAI</b><button onClick={() => supabase.auth.signOut()} style={s.out}>Sign Out</button></header>
      <div style={s.body}><h2>Welcome back!</h2><p>{session.user.email}</p></div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px' },
  brand: { color: '#1A56DB', fontSize: '32px', fontWeight: '800', marginBottom: '5px' },
  sub: { color: '#64748B', fontSize: '14px', marginBottom: '25px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '350px' },
  input: { padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' },
  link: { color: '#1A56DB', fontSize: '13px', marginTop: '10px', textAlign: 'center', cursor: 'pointer' },
  dash: { height: '100vh', background: '#F1F5F9' },
  head: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #E2E8F0' },
  out: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  body: { padding: '40px', textAlign: 'center' }
};
