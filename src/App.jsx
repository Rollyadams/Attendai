import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

const SUPABASE_URL  = "https://supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function App() {
  const [session, setSession] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      if (isSignUp) alert("Check your email for the confirmation link!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div style={s.authPage}>
        <div style={s.card}>
          <h1 style={s.brand}>AttendAI</h1>
          <p style={s.sub}>{isSignUp ? "Create your account" : "Sign in to continue"}</p>
          <form onSubmit={handleAuth} style={s.form}>
            <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={s.input} required />
            <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={s.input} required />
            <button type="submit" style={s.btn} disabled={loading}>{loading ? "Verifying..." : (isSignUp ? "Sign Up" : "Login")}</button>
            <p onClick={() => setIsSignUp(!isSignUp)} style={s.link}>{isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <b>AttendAI Dashboard</b>
        <button onClick={() => supabase.auth.signOut()} style={s.logout}>Sign Out</button>
      </header>
      <div style={s.content}>
        <h2>Welcome, {session.user.email}</h2>
        <p>Your AI Attendance system is ready.</p>
      </div>
    </div>
  );
}

const s = {
  authPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8', padding: '20px' },
  card: { backgroundColor: '#FFF', padding: '40px 30px', borderRadius: '24px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' },
  brand: { color: '#1A56DB', fontSize: '32px', marginBottom: '8px', fontWeight: '800' },
  sub: { color: '#64748B', fontSize: '14px', marginBottom: '30px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px', backgroundColor: '#F8FAFC' },
  btn: { padding: '16px', backgroundColor: '#1A56DB', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' },
  link: { color: '#1A56DB', fontSize: '13px', marginTop: '15px', cursor: 'pointer', fontWeight: '500' },
  app: { height: '100vh', backgroundColor: '#F8FAFC' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', backgroundColor: '#FFF', borderBottom: '1px solid #E2E8F0' },
  logout: { color: '#DC2626', border: 'none', background: 'none', fontWeight: '600' },
  content: { padding: '30px', textAlign: 'center' }
};
