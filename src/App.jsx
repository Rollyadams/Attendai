import { useState, useEffect } from "react";
// Import the client you just shared
import { supabase } from "./supabaseClient"; 

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // 1. Listen for Auth Changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Auth Handler with Forced Timeout
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Safety Timeout: Stops the "Verifying" hang after 8 seconds
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Connection Timeout: Supabase is not responding. Check your internet connection or Vercel logs.");
      }
    }, 8000);

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      clearTimeout(timer);
      if (error) throw error;
      
      if (isSignUp && !data.session) {
        alert("Success! Check your email to confirm your account.");
      }
    } catch (err) {
      alert("Auth Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN VIEW ---
  if (!session) return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>AttendAI</h1>
        <p style={s.subText}>{isSignUp ? "Join our team" : "Sign in to continue"}</p>
        <form onSubmit={handleAuth} style={s.form}>
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={s.input} required />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={s.input} required />
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? "Verifying..." : (isSignUp ? "Sign Up" : "Login")}
          </button>
          <p onClick={() => { setIsSignUp(!isSignUp); setLoading(false); }} style={s.link}>
            {isSignUp ? "Back to Login" : "New user? Create Account"}
          </p>
        </form>
      </div>
    </div>
  );

  // --- DASHBOARD VIEW ---
  return (
    <div style={s.dash}>
      <header style={s.header}>
        <b>AttendAI</b>
        <button onClick={() => supabase.auth.signOut()} style={s.logout}>Sign Out</button>
      </header>
      <div style={s.body}>
        <h2>System Online ✅</h2>
        <p style={{marginTop:'10px', color:'#64748B'}}>Logged in as: {session.user.email}</p>
      </div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8', padding: '20px' },
  card: { background: 'white', padding: '40px 30px', borderRadius: '24px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  logo: { color: '#1A56DB', fontSize: '32px', marginBottom: '8px', fontWeight: '800' },
  subText: { color: '#64748B', fontSize: '14px', marginBottom: '30px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px', backgroundColor: '#F8FAFC' },
  btn: { padding: '16px', backgroundColor: '#1A56DB', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' },
  link: { color: '#1A56DB', fontSize: '13px', marginTop: '15px', cursor: 'pointer', fontWeight: '500' },
  dash: { height: '100vh', backgroundColor: '#F8FAFC' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', backgroundColor: '#FFF', borderBottom: '1px solid #E2E8F0' },
  logout: { color: '#DC2626', border: 'none', background: 'none', fontWeight: '600' },
  body: { padding: '40px', textAlign: 'center' }
};
