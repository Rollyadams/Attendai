import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

const SUPABASE_URL  = "https://supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGd5eWVicnhmbGp2eG9zbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODY5OTAsImV4cCI6MjA5MDQ2Mjk5MH0.jLlBqe2PKTMQZ6U66Z5JcK36HDKYuEFTqco3qUXk4Ns";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Update these to your actual office location
const OFFICE_LAT = 6.6018; 
const OFFICE_LNG = 3.3515;
const MAX_DISTANCE_METERS = 200;

export default function App() {
  const [view, setView] = useState("dashboard"); // dashboard, camera, roster
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [staff, setStaff] = useState([]);
  const videoRef = useRef(null);

  // --- 1. BACK BUTTON FIX ---
  useEffect(() => {
    window.history.pushState({ view: 'dashboard' }, '');
    window.onpopstate = (e) => {
      if (view !== "dashboard") {
        setView("dashboard");
        window.history.pushState({ view: 'dashboard' }, ''); 
      }
    };
  }, [view]);

  // --- 2. INITIALIZE ---
  useEffect(() => {
    const load = async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models')
      ]);
      setModelsLoaded(true);
      fetchStaff();
    };
    load();
  }, []);

  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('*');
    if (data) setStaff(data);
  };

  // --- 3. GEOFENCING LOGIC ---
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleClockIn = async () => {
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
    if (!detection) return alert("Face not recognized!");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
      
      if (dist > MAX_DISTANCE_METERS) {
        return alert(`Too far! You are ${Math.round(dist)}m away from the office.`);
      }

      const { error } = await supabase.from('attendance').insert([{
        user_name: "Admin",
        status: "present",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }]);

      if (!error) {
        alert("Success!");
        setView("dashboard");
      }
    });
  };

  return (
    <div style={styles.app}>
      {view === "dashboard" && (
        <div style={styles.main}>
          <h1 style={styles.title}>AttendAI</h1>
          <div style={styles.statsRow}>
            <div style={styles.statItem}>Present: 1</div>
            <div style={styles.statItem}>Late: 0</div>
          </div>
          <button style={styles.mainBtn} onClick={() => setView("camera")}>Clock In</button>
          <div style={styles.grid}>
            <div style={styles.tile} onClick={() => setView("roster")}>Staff</div>
            <div style={styles.tile}>Records</div>
          </div>
        </div>
      )}

      {view === "camera" && (
        <div style={styles.cameraView}>
          <video ref={videoRef} autoPlay muted style={styles.video} onPlay={() => console.log("Video playing")}/>
          <button style={styles.mainBtn} onClick={handleClockIn}>Verify Face</button>
          <button style={styles.cancelBtn} onClick={() => setView("dashboard")}>Cancel</button>
        </div>
      )}

      {view === "roster" && (
        <div style={styles.rosterView}>
          <h2>Staff Roster</h2>
          {staff.map(s => <div key={s.id} style={styles.staffRow}>{s.full_name}</div>)}
          <button style={styles.cancelBtn} onClick={() => setView("dashboard")}>Back</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  app: { fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#F0F4F8', height: '100vh' },
  title: { textAlign: 'center', color: '#1A56DB' },
  statsRow: { display: 'flex', gap: '10px', marginBottom: '20px' },
  statItem: { flex: 1, padding: '15px', backgroundColor: '#FFF', borderRadius: '10px', textAlign: 'center' },
  mainBtn: { width: '100%', padding: '15px', backgroundColor: '#1A56DB', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' },
  tile: { padding: '20px', backgroundColor: '#FFF', borderRadius: '10px', textAlign: 'center', border: '1px solid #E2E8F0' },
  cameraView: { display: 'flex', flexDirection: 'column', gap: '10px' },
  video: { width: '100%', borderRadius: '15px', backgroundColor: '#000' },
  rosterView: { backgroundColor: '#FFF', padding: '20px', borderRadius: '15px' },
  staffRow: { padding: '10px', borderBottom: '1px solid #EEE' },
  cancelBtn: { marginTop: '10px', background: 'none', border: 'none', color: '#64748B', width: '100%' }
};
