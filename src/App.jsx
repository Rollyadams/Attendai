import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// STRATEGY: Direct connection using your specific project keys
const URL = "https://supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(URL, KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Simple check on load only to avoid background deadlocks
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  const handleAction = async (type) => {
    setLoading(true);
    console.log(`Starting ${type}...`);

    // Safety Timeout: Prevents the "Connecting" hang
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Connection Timed Out: Your network might be blocking Supabase. Try switching to Mobile Data/Wi-Fi.");
      }
    }, 10000);

    try {
      const { data, error } = type === 'login' 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      clearTimeout(timer);
      if (error) throw error;
      
      if (type === 'signup' && !data.session) {
        alert("Account Created! Now click 'Login' to enter.");
      } else {
        setSession(data.session);
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
        <div style={s.form}>
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={s.input} />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={s.input} />
          <button onClick={() => handleAction('login')} style={s.btn} disabled={loading}>
            {loading ? "Connecting..." : "Login"}
          </button>
          <button onClick={() => handleAction('signup')} style={s.secBtn} disabled={loading}>
            Create New Account
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.dash}>
      <h2>Welcome!</h2>
      <p>{session.user.email}</p>
      <button onClick={async () => { await supabase.auth.signOut(); setSession(null); }}>Sign Out</button>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  card: { background: 'white', padding: '30px', borderRadius: '20px', width: '320px', textAlign: 'center' },
  logo: { color: '#1A56DB', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #DDD' },
  btn: { padding: '14px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  secBtn: { background: 'none', border: 'none', color: '#1A56DB', fontSize: '13px', cursor: 'pointer' },
  dash: { padding: '40px', textAlign: 'center' }
};
