import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// ── VERIFIED CONFIG ──
const SUPABASE_URL  = "https://supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc2tub2F2cGNrcXlqY3hzb210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzIxMjMsImV4cCI6MjA5MDQ2ODEyM30.Gv_JuxMrV39VEkDs46kWi9rzvb-_vVNhHGEruYni_-0";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard, camera, roster, history
  const [dataList, setDataList] = useState([]);
  const [stats, setStats] = useState({ present: 0, late: 0 });
  const videoRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));

    // Handle back button to return to dashboard
    window.onpopstate = () => {
      if (view !== "dashboard") setView("dashboard");
    };
  }, [view]);

  // Fetch Stats & Logs
  useEffect(() => {
    if (session) fetchStats();
  }, [session, view]);

  const fetchStats = async () => {
    const { data } = await supabase.from('attendance').select('*');
    if (data) {
      setStats({
        present: data.filter(d => d.status === 'present').length,
        late: data.filter(d => d.status === 'late').length
      });
      if (view === "history") setDataList(data);
    }
  };

  const fetchRoster = async () => {
    setView("roster");
    const { data } = await supabase.from('staff').select('*');
    if (data) setDataList(data);
  };

  return (
    <div style={s.app}>
      <header style={s.header}>
        <b>AttendAI</b>
        <button onClick={() => supabase.auth.signOut()} style={s.logout}>Sign Out</button>
      </header>
      
      <main style={s.main}>
        {view === "dashboard" && (
          <div>
            <div style={s.stats}>
              <div style={s.card}>Present: {stats.present}</div>
              <div style={s.card}>Late: {stats.late}</div>
            </div>
            <button style={s.btn} onClick={() => setView("camera")}>Open Attendance Camera</button>
            <div style={s.grid}>
                <div style={s.tile} onClick={fetchRoster}>Staff Roster</div>
                <div style={s.tile} onClick={() => setView("history")}>History Logs</div>
            </div>
          </div>
        )}

        {(view === "roster" || view === "history") && (
          <div style={s.listView}>
            <h3>{view === "roster" ? "Staff Roster" : "Attendance History"}</h3>
            <div style={s.listContainer}>
              {dataList.length > 0 ? dataList.map((item, i) => (
                <div key={i} style={s.listItem}>
                  {view === "roster" ? item.full_name : `${item.status} at ${new Date(item.created_at).toLocaleTimeString()}`}
                </div>
              )) : <p>No records found.</p>}
            </div>
            <button style={s.cancel} onClick={() => setView("dashboard")}>Back</button>
          </div>
        )}

        {view === "camera" && (
          <div style={s.cameraView}>
            <video ref={videoRef} autoPlay muted style={s.video} />
            <button style={s.cancel} onClick={() => setView("dashboard")}>Cancel</button>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  app: { height: '100vh', background: '#F1F5F9', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'white', borderBottom: '1px solid #EEE', alignItems: 'center' },
  logout: { color: 'red', border: 'none', background: 'none', fontWeight: 'bold' },
  main: { padding: '20px' },
  stats: { display: 'flex', gap: '10px', marginBottom: '20px' },
  card: { flex: 1, padding: '25px', background: 'white', borderRadius: '15px', textAlign: 'center', border: '1px solid #E2E8F0', fontWeight: 'bold', fontSize: '18px' },
  btn: { width: '100%', padding: '16px', background: '#1A56DB', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  tile: { padding: '25px', background: 'white', borderRadius: '15px', textAlign: 'center', border: '1px solid #E2E8F0', fontSize: '14px', color: '#64748B' },
  listView: { background: 'white', padding: '20px', borderRadius: '15px' },
  listContainer: { marginTop: '15px', maxHeight: '300px', overflowY: 'auto' },
  listItem: { padding: '10px', borderBottom: '1px solid #F1F5F9' },
  cameraView: { display: 'flex', flexDirection: 'column', gap: '15px' },
  video: { width: '100%', borderRadius: '15px', backgroundColor: 'black' },
  cancel: { background: 'none', border: 'none', color: '#64748B', marginTop: '15px', width: '100%' }
};
