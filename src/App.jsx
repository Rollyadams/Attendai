import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// Uses Vite environment variables for Vercel deployment
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const OFFICE_LAT = 6.6018; 
const OFFICE_LNG = 3.3515;

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));

    window.history.pushState({ view: 'home' }, '');
    window.onpopstate = () => {
      if (view !== "dashboard") {
        setView("dashboard");
        window.history.pushState({ view: 'home' }, '');
      }
    };
  }, [view]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login Failed: " + error.message);
  };

  const handleClockIn = async () => {
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
    if (!detection) return alert("Identity not verified!");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { error } = await supabase.from('attendance').insert([
        { user_id: session.user.id, status: 'present', lat: pos.coords.latitude, lng: pos.coords.longitude }
      ]);
      if (!error) { alert("Clock-in Successful!"); setView("dashboard"); }
    });
  };

  if (!session) return (
    <div style={styles.auth}>
      <h1 style={{color: '#1A56DB'}}>AttendAI Login</h1>
      <form onSubmit={handleLogin} style={styles.form}>
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={styles.input} />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={styles.input} />
        <button type="submit" style={styles.btn}>Login</button>
      </form>
    </div>
  );

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <b>AttendAI</b>
        <button onClick={() => supabase.auth.signOut()} style={styles.logout}>Logout</button>
      </header>
      {view === "dashboard" ? (
        <div style={styles.main}>
          <button style={styles.btn} onClick={() => setView("camera")}>Start Clock In</button>
        </div>
      ) : (
        <div style={styles.camera}>
          <video ref={videoRef} autoPlay muted style={styles.video} />
          <button style={styles.btn} onClick={handleClockIn}>Verify & Submit</button>
          <button onClick={() => setView("dashboard")} style={styles.cancel}>Back</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  auth: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #DDD' },
  btn: { padding: '15px', backgroundColor: '#1A56DB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  app: { backgroundColor: '#F0F4F8', height: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #EEE' },
  logout: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  main: { padding: '20px' },
  camera: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  video: { width: '100%', borderRadius: '10px', backgroundColor: 'black' },
  cancel: { color: '#666', border: 'none', background: 'none', marginTop: '10px' }
};
