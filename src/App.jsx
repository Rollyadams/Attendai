import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Safety Timeout: If it takes > 10s, something is blocking the network
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Connection Timeout: Your network or a browser extension is blocking Supabase.");
      }
    }, 10000);

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      clearTimeout(timeout);
      if (error) throw error;
      
      if (isSignUp && !data.session) alert("Account created! Please check your email.");
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
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={s.input} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={s.input} required />
          <button type="submit" style={s.btn} disabled={loading}>{loading ? "Connecting..." : (isSignUp ? "Create Account" : "Login")}</button>
          <p onClick={() => setIsSignUp(!isSignUp)} style={s.link}>{isSignUp ? "Already have an account? Login" : "New user? Sign Up"}</p>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.dash}>
      <header style={s.head}><b>AttendAI</b><button onClick={() => supabase.auth.signOut()} style={s.out}>Sign Out</button></header>
      <div style={s.body}><h2>Welcome!</h2><p>{session.user.email}</p></div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8' },
  card: { background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '350px', textAlign: 'center' },
  logo: { color: '#1A56DB', marginBottom: '20px', fontWeight: '800' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '16px' },
  btn: { padding: '15px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px' },
  link: { fontSize: '13px', color: '#1A56DB', cursor: 'pointer', marginTop: '10px' },
  dash: { height: '100vh', background: '#F8FAFC' },
  head: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE' },
  out: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  body: { padding: '40px', textAlign: 'center' }
};
