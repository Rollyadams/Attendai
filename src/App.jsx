import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── NEW PROJECT CONFIG (jlsknoavpckqyjcxsomt) ──
const URL = "https://supabase.co";
const KEY = "sb_publishable_-EejwHhdJ7x660mftYhR_Q_o65wxc6J";
const supabase = createClient(URL, KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Safety Timeout: Stops the "Connecting" hang after 5s
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Connection Timeout: Your network (MTN/Airtel) might be blocking Supabase. Try switching to Wi-Fi.");
      }
    }, 5000);

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email: form.email, password: form.password })
        : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });

      clearTimeout(timer);
      if (error) throw error;
      if (isSignUp && !data.session) alert("Account Created! You can now log in.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>AttendAI</h1>
        <form onSubmit={handleAuth} style={s.form}>
          <input type="email" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} style={s.input} required />
          <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} style={s.input} required />
          <button type="submit" style={s.btn} disabled={loading}>{loading ? "Connecting..." : (isSignUp ? "Sign Up" : "Login")}</button>
          <p onClick={() => setIsSignUp(!isSignUp)} style={s.link}>{isSignUp ? "Already have an account? Login" : "New user? Create Account"}</p>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.dash}>
      <header style={s.head}><b>AttendAI</b><button onClick={() => supabase.auth.signOut()} style={s.out}>Logout</button></header>
      <div style={s.body}><h2>Welcome back!</h2><p>{session.user.email}</p></div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  card: { background: 'white', padding: '40px', borderRadius: '24px', width: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  logo: { color: '#1A56DB', marginBottom: '20px', fontWeight: '800' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  link: { fontSize: '13px', color: '#1A56DB', cursor: 'pointer', marginTop: '10px' },
  dash: { height: '100vh', background: '#F8FAFC' },
  head: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE' },
  out: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  body: { padding: '40px', textAlign: 'center' }
};
