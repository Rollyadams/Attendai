import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; 

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // 1. Session Gatekeeper
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Auth Handler with Hard Timeout
  const handleAuth = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    
    // Safety Timeout: Stops the "Connecting..." hang after 5 seconds
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Network Timeout: Your mobile data or Wi-Fi is blocking the connection to Supabase.");
      }
    }, 5000);

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      clearTimeout(timeout);
      if (error) throw error;
      
      if (isSignUp && !data.session) {
        alert("Account Created! Check your email for a confirmation link.");
      }
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
        <p style={s.sub}>{isSignUp ? "Join the team" : "Sign in to continue"}</p>
        <form onSubmit={handleAuth} style={s.form}>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={e => setEmail(e.target.value)} 
            style={s.input} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={e => setPassword(e.target.value)} 
            style={s.input} 
            required 
          />
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? "Connecting..." : (isSignUp ? "Sign Up" : "Login")}
          </button>
          <p onClick={() => { setIsSignUp(!isSignUp); setLoading(false); }} style={s.link}>
            {isSignUp ? "Back to Login" : "New user? Create Account"}
          </p>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.dash}>
      <header style={s.header}>
        <b>AttendAI</b>
        <button onClick={() => supabase.auth.signOut()} style={s.logout}>Sign Out</button>
      </header>
      <div style={s.body}>
        <h2>Welcome back!</h2>
        <p style={{marginTop:'10px', color:'#64748B'}}>{session.user.email}</p>
      </div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '20px' },
  card: { background: 'white', padding: '40px 25px', borderRadius: '24px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' },
  logo: { color: '#1A56DB', fontSize: '36px', marginBottom: '10px', fontWeight: '800' },
  sub: { color: '#94A3B8', fontSize: '14px', marginBottom: '30px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  // FIXED INPUT FOR LONG EMAILS
  input: { padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px', backgroundColor: '#F1F5F9', width: '100%', outline: 'none' },
  btn: { padding: '18px', backgroundColor: '#1A56DB', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', marginTop: '10px' },
  link: { color: '#1A56DB', fontSize: '13px', marginTop: '15px', cursor: 'pointer', fontWeight: '600' },
  dash: { height: '100vh', backgroundColor: '#F8FAFC' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', backgroundColor: '#FFF', borderBottom: '1px solid #E2E8F0' },
  logout: { color: '#DC2626', border: 'none', background: 'none', fontWeight: '600' },
  body: { padding: '40px', textAlign: 'center' }
};
