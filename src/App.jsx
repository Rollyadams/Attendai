import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// STRATEGY: Hardcode keys to eliminate Vercel Env Var issues
const URL = "https://supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(URL, KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    // Basic session check without async logic inside the listener to avoid deadlocks
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("Starting Auth Request...");

    // 15-second safety timer
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Connection Timed Out. Check if your internet provider blocks Supabase.");
      }
    }, 15000);

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email: form.email, password: form.password })
        : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });

      clearTimeout(timer);
      if (error) throw error;
      if (isSignUp && !data.session) alert("Account created! Check your email if 'Confirm Email' is still on.");
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
          <input type="email" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} style={s.input} required />
          <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} style={s.input} required />
          <button type="submit" style={s.btn} disabled={loading}>{loading ? "Verifying..." : (isSignUp ? "Create Account" : "Login")}</button>
          <p onClick={() => setIsSignUp(!isSignUp)} style={s.link}>{isSignUp ? "Back to Login" : "New? Register here"}</p>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.dash}>
      <div style={s.header}><b>AttendAI</b><button onClick={() => supabase.auth.signOut()} style={s.out}>Sign Out</button></div>
      <div style={s.body}><h2>Dashboard Active</h2><p>{session.user.email}</p></div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  card: { background: 'white', padding: '40px', borderRadius: '20px', width: '340px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  logo: { color: '#1A56DB', marginBottom: '20px', fontWeight: '800' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' },
  btn: { padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700' },
  link: { fontSize: '13px', color: '#1A56DB', cursor: 'pointer', marginTop: '10px' },
  dash: { height: '100vh', background: '#F8FAFC' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE' },
  out: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  body: { padding: '40px', textAlign: 'center' }
};
