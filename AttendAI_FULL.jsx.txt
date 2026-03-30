/**
 * AttendAI — Full App (React + Vite)
 * Integrations: Supabase · face-api.js · Geolocation API
 *
 * SETUP:
 *  npm install @supabase/supabase-js
 *  npm install face-api.js
 *
 * face-api.js models — download and place at /public/models/:
 *   https://github.com/justadudewhohacks/face-api.js/tree/master/weights
 *   Required files:
 *     tiny_face_detector_model-*
 *     face_landmark_68_model-*
 *     face_recognition_model-*
 *
 * Then update SUPABASE_URL and SUPABASE_ANON below.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import * as faceapi from "face-api.js";

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL  = "https://zwxgyyebrxfljvxosnuu.supabase.co";
const SUPABASE_ANON = "sb_publishable_PJ7DK6Rq8hyqgxIFgCED9w_w1LYzeEf";
const MODELS_PATH   = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights"; // face-api.js model weights in /public/models/

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── FONTS + CSS ─────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');`;

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#0d0f12; --bg2:#141720; --bg3:#1c2030; --bg4:#242840;
  --border:rgba(255,255,255,0.07);
  --teal:#00e5c4; --teal-dim:rgba(0,229,196,0.12); --teal-glow:rgba(0,229,196,0.25);
  --amber:#f5a623; --amber-dim:rgba(245,166,35,0.12);
  --red:#ff4d6d; --red-dim:rgba(255,77,109,0.12);
  --green:#2ecc71; --green-dim:rgba(46,204,113,0.12);
  --text:#e8eaf0; --text2:#8b90a4; --text3:#555a72;
  --display:'Syne',sans-serif; --body:'DM Sans',sans-serif;
}
body { background:var(--bg); color:var(--text); font-family:var(--body); }
.app { display:flex; height:100vh; overflow:hidden; font-family:var(--body); }

/* SIDEBAR */
.sidebar { width:240px; flex-shrink:0; background:var(--bg2); border-right:1px solid var(--border); display:flex; flex-direction:column; }
.sidebar-logo { padding:24px 20px 20px; border-bottom:1px solid var(--border); }
.sidebar-logo .brand { font-family:var(--display); font-size:18px; font-weight:800; color:var(--teal); letter-spacing:-0.5px; }
.sidebar-logo .brand span { color:var(--text); }
.sidebar-logo .tagline { font-size:10px; color:var(--text3); margin-top:2px; letter-spacing:1.5px; text-transform:uppercase; }
.sidebar-role { margin:16px 20px; background:var(--bg3); border-radius:10px; padding:10px 12px; display:flex; align-items:center; gap:10px; border:1px solid var(--border); }
.role-avatar { width:32px; height:32px; border-radius:8px; background:var(--teal-dim); border:1px solid var(--teal); display:flex; align-items:center; justify-content:center; font-size:14px; }
.role-info .name { font-size:13px; font-weight:600; }
.role-info .role { font-size:10px; color:var(--teal); text-transform:uppercase; letter-spacing:1px; }
.sidebar-nav { flex:1; padding:8px 12px; overflow-y:auto; }
.nav-section-label { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--text3); padding:12px 8px 6px; font-weight:600; }
.nav-item { display:flex; align-items:center; gap:10px; padding:10px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; color:var(--text2); transition:all 0.15s; margin-bottom:2px; border:1px solid transparent; }
.nav-item:hover { background:var(--bg3); color:var(--text); }
.nav-item.active { background:var(--teal-dim); color:var(--teal); border-color:rgba(0,229,196,0.2); }
.nav-item .icon { font-size:16px; width:20px; text-align:center; }
.nav-badge { margin-left:auto; background:var(--red); color:white; font-size:10px; font-weight:700; padding:1px 6px; border-radius:20px; }
.sidebar-bottom { padding:16px 12px; border-top:1px solid var(--border); }

/* MAIN */
.main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
.topbar { height:60px; background:var(--bg2); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 28px; gap:16px; flex-shrink:0; }
.topbar-title { font-family:var(--display); font-size:16px; font-weight:700; flex:1; }
.topbar-time { font-size:12px; color:var(--text2); }
.topbar-dot { width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 8px var(--green); animation:pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
.content { flex:1; overflow-y:auto; padding:28px; }

/* CARDS */
.card { background:var(--bg2); border:1px solid var(--border); border-radius:14px; padding:20px; }
.card-title { font-family:var(--display); font-size:13px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-bottom:16px; }

/* STAT CARDS */
.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
.stat-card { background:var(--bg2); border:1px solid var(--border); border-radius:14px; padding:20px; position:relative; overflow:hidden; }
.stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
.stat-card.teal::before { background:var(--teal); }
.stat-card.amber::before { background:var(--amber); }
.stat-card.red::before { background:var(--red); }
.stat-card.green::before { background:var(--green); }
.stat-label { font-size:11px; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:10px; }
.stat-value { font-family:var(--display); font-size:32px; font-weight:800; line-height:1; }
.stat-value.teal{color:var(--teal)}.stat-value.amber{color:var(--amber)}.stat-value.red{color:var(--red)}.stat-value.green{color:var(--green)}
.stat-sub { font-size:11px; color:var(--text3); margin-top:6px; }

/* LAYOUTS */
.grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
.grid-3-2 { display:grid; grid-template-columns:1.6fr 1fr; gap:20px; margin-bottom:20px; }

/* TABLE */
.table { width:100%; border-collapse:collapse; }
.table th { text-align:left; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--text3); padding:10px 12px; border-bottom:1px solid var(--border); font-weight:600; }
.table td { padding:12px; border-bottom:1px solid rgba(255,255,255,0.04); font-size:13px; }
.table tr:hover td { background:rgba(255,255,255,0.02); }
.table tr:last-child td { border-bottom:none; }

/* BADGES */
.badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:600; padding:3px 8px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; }
.badge.present{background:var(--green-dim);color:var(--green)}
.badge.late{background:var(--amber-dim);color:var(--amber)}
.badge.absent{background:var(--red-dim);color:var(--red)}
.badge.flagged{background:var(--red-dim);color:var(--red);border:1px solid rgba(255,77,109,0.3)}

/* BUTTONS */
.btn { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:10px; font-size:13px; font-weight:600; font-family:var(--body); cursor:pointer; border:none; transition:all 0.15s; }
.btn:disabled { opacity:0.5; cursor:not-allowed; }
.btn-primary { background:var(--teal); color:#0d0f12; }
.btn-primary:hover:not(:disabled) { background:#00ffda; box-shadow:0 0 20px var(--teal-glow); }
.btn-ghost { background:var(--bg3); color:var(--text); border:1px solid var(--border); }
.btn-ghost:hover:not(:disabled) { border-color:var(--teal); color:var(--teal); }
.btn-danger { background:var(--red-dim); color:var(--red); border:1px solid rgba(255,77,109,0.3); }
.btn-amber { background:var(--amber-dim); color:var(--amber); border:1px solid rgba(245,166,35,0.3); }

/* AVATAR */
.avatar { width:34px; height:34px; border-radius:10px; background:var(--bg4); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; border:1px solid var(--border); flex-shrink:0; overflow:hidden; }
.avatar img { width:100%; height:100%; object-fit:cover; }

/* FORMS */
.form-group { margin-bottom:18px; }
.form-label { font-size:11px; color:var(--text2); letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; display:block; }
.form-input { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px 14px; color:var(--text); font-family:var(--body); font-size:14px; outline:none; transition:border-color 0.2s; }
.form-input:focus { border-color:var(--teal); }
.form-select { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px 14px; color:var(--text); font-family:var(--body); font-size:14px; outline:none; cursor:pointer; }

/* LOGIN */
.login-wrap { display:flex; align-items:center; justify-content:center; min-height:100vh; background:var(--bg); background-image:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,229,196,0.06) 0%,transparent 70%); }
.login-card { background:var(--bg2); border:1px solid var(--border); border-radius:20px; padding:44px 40px; width:420px; }
.login-logo { font-family:var(--display); font-size:28px; font-weight:800; color:var(--teal); margin-bottom:4px; }
.login-logo span { color:var(--text); }
.login-sub { font-size:13px; color:var(--text2); margin-bottom:36px; }

/* CLOCK-IN */
.clockin-wrap { display:flex; align-items:center; justify-content:center; min-height:calc(100vh - 60px); }
.clockin-card { background:var(--bg2); border:1px solid var(--border); border-radius:20px; padding:40px; width:520px; }
.clockin-title { font-family:var(--display); font-size:22px; font-weight:800; margin-bottom:6px; text-align:center; }
.clockin-sub { color:var(--text2); font-size:13px; margin-bottom:24px; text-align:center; }
.video-frame { width:280px; height:280px; border-radius:50%; border:2px dashed var(--teal); margin:0 auto 24px; position:relative; overflow:hidden; background:var(--bg3); display:flex; align-items:center; justify-content:center; }
.video-frame video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
.video-frame canvas { position:absolute; top:0; left:0; width:100%; height:100%; transform:scaleX(-1); }
.face-ring { position:absolute; inset:-6px; border-radius:50%; border:3px solid transparent; border-top-color:var(--teal); animation:spin 1.2s linear infinite; pointer-events:none; z-index:10; }
@keyframes spin { to{transform:rotate(360deg)} }
.scan-line { position:absolute; width:100%; height:2px; background:linear-gradient(90deg,transparent,var(--teal),transparent); animation:scanAnim 2s ease-in-out infinite; pointer-events:none; z-index:10; }
@keyframes scanAnim { 0%{top:0}50%{top:100%}100%{top:0} }
.check-row { display:flex; align-items:center; gap:10px; background:var(--bg3); border-radius:10px; padding:12px 16px; margin-bottom:8px; font-size:13px; }
.check-icon { font-size:16px; }
.check-label { flex:1; }
.check-status.ok { color:var(--green); font-weight:600; font-size:12px; }
.check-status.fail { color:var(--red); font-weight:600; font-size:12px; }
.check-status.checking { color:var(--amber); font-size:12px; animation:pulse 1s infinite; }
.check-status.idle { color:var(--text3); font-size:12px; }

/* AI FLAG */
.ai-flag { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px; background:linear-gradient(135deg,rgba(245,166,35,0.2),rgba(255,77,109,0.2)); border:1px solid rgba(245,166,35,0.4); color:var(--amber); text-transform:uppercase; letter-spacing:0.5px; }

/* PROGRESS */
.progress-bar { background:var(--bg4); border-radius:4px; height:6px; overflow:hidden; }
.progress-fill { height:100%; border-radius:4px; background:var(--teal); transition:width 0.5s ease; }

/* MISC */
.tabs { display:flex; gap:6px; margin-bottom:20px; }
.tab { padding:8px 16px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid var(--border); background:var(--bg3); color:var(--text2); transition:all 0.15s; font-family:var(--body); }
.tab.active { background:var(--teal-dim); color:var(--teal); border-color:rgba(0,229,196,0.3); }
.live-dot { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--green); font-weight:600; }
.live-dot::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--green); animation:pulse 1.5s infinite; }
.empty { text-align:center; padding:40px; color:var(--text3); }
.empty .icon { font-size:40px; margin-bottom:12px; }
.error-box { background:var(--red-dim); border:1px solid rgba(255,77,109,0.3); border-radius:10px; padding:12px 16px; color:var(--red); font-size:13px; margin-bottom:16px; }
.success-box { background:var(--green-dim); border:1px solid rgba(46,204,113,0.3); border-radius:10px; padding:12px 16px; color:var(--green); font-size:13px; margin-bottom:16px; }
.info-box { background:var(--teal-dim); border:1px solid rgba(0,229,196,0.2); border-radius:10px; padding:12px 16px; color:var(--teal); font-size:13px; margin-bottom:16px; }
.spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,0.2); border-top-color:var(--teal); border-radius:50%; animation:spin 0.7s linear infinite; }
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:4px}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn 0.3s ease}
.shift-pill{display:inline-block;font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:var(--bg4);color:var(--text2);border:1px solid var(--border)}
.search-bar{display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 14px}
.search-bar input{background:none;border:none;outline:none;color:var(--text);font-family:var(--body);font-size:13px;flex:1}
.search-bar input::placeholder{color:var(--text3)}
`;

// ── GPS UTILS ────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = d => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getGPS() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) { rej(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e => rej(e),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// ── FACE-API UTILS ───────────────────────────────────────────
let faceModelsLoaded = false;

async function loadFaceModels() {
  if (faceModelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
  ]);
  faceModelsLoaded = true;
}

const FACE_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

async function detectFaceDescriptor(videoOrImg) {
  const result = await faceapi
    .detectSingleFace(videoOrImg, FACE_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result || null;
}

// Euclidean distance — 0.0 = same person, >0.6 = different
function faceDistance(d1, d2) {
  return faceapi.euclideanDistance(d1, d2);
}

// ── CLOCK WIDGET ─────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return <span>{t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>;
}

// ── LOGIN SCREEN ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (authError) throw authError;

      // Fetch employee profile
      const { data: emp, error: empError } = await supabase
        .from("employees")
        .select("*, departments(name), shifts(name,start_time,end_time,grace_mins)")
        .eq("auth_user_id", data.user.id)
        .single();
      if (empError) throw new Error("Employee profile not found. Contact admin.");

      onLogin(emp);
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap fade-in">
      <div className="login-card">
        <div className="login-logo">Attend<span>AI</span></div>
        <div className="login-sub">AI-Powered Workforce Attendance Platform</div>
        {error && <div className="error-box">⚠ {error}</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        </div>
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={handleLogin} disabled={loading}>
          {loading ? <><span className="spinner"/>&nbsp;Signing in…</> : "Sign In →"}
        </button>
        <div style={{textAlign:"center",marginTop:20,fontSize:12,color:"var(--text3)"}}>
          AttendAI · Secured with Supabase Auth
        </div>
      </div>
    </div>
  );
}

// ── FACE ENROLLMENT SCREEN ───────────────────────────────────
function FaceEnrollmentScreen({ employee, onEnrolled }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [stage, setStage]     = useState("intro");   // intro | camera | capturing | saving | done
  const [error, setError]     = useState("");
  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true)).catch(e => setError("Failed to load AI models: " + e.message));
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width:640, height:480 } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStage("camera");
    } catch (e) {
      setError("Camera access denied. Please allow camera permission.");
    }
  };

  const captureSelfie = async () => {
    setStage("capturing");
    setError("");
    try {
      const result = await detectFaceDescriptor(videoRef.current);
      if (!result) { setError("No face detected. Make sure your face is clearly visible."); setStage("camera"); return; }

      setStage("saving");

      // Capture photo as blob
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85));

      // Upload photo to Supabase Storage
      const path = `enrollments/${employee.id}/face.jpg`;
      const { error: upErr } = await supabase.storage.from("face-photos").upload(path, blob, { upsert:true, contentType:"image/jpeg" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("face-photos").getPublicUrl(path);

      // Save descriptor to DB
      const { error: dbErr } = await supabase.from("employees").update({
        face_descriptor: Array.from(result.descriptor),
        face_photo_url:  urlData.publicUrl,
        face_enrolled:   true,
        face_enrolled_at: new Date().toISOString(),
      }).eq("id", employee.id);
      if (dbErr) throw dbErr;

      streamRef.current.getTracks().forEach(t => t.stop());
      setStage("done");
      setTimeout(() => onEnrolled({ ...employee, face_enrolled: true }), 1500);
    } catch (e) {
      setError("Enrollment failed: " + e.message);
      setStage("camera");
    }
  };

  return (
    <div className="clockin-wrap fade-in">
      <div className="clockin-card">
        <div className="clockin-title">Face Enrollment</div>
        <div className="clockin-sub">First login detected — set up your face ID to enable AI check-in</div>

        {error && <div className="error-box">⚠ {error}</div>}

        <div className="video-frame">
          <video ref={videoRef} muted playsInline style={{display: stage==="intro"||stage==="done"?"none":"block"}} />
          {(stage==="capturing"||stage==="saving") && <div className="face-ring"/>}
          {(stage==="capturing"||stage==="saving") && <div className="scan-line"/>}
          {(stage==="intro"||stage==="done") && (
            <div style={{fontSize:64}}>{stage==="done"?"✅":"👤"}</div>
          )}
        </div>

        {stage==="intro" && (
          <>
            <div className="info-box">📸 You'll take a selfie to enroll your face. This is used for AI verification on every clock-in. Your data is stored securely.</div>
            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={startCamera} disabled={!modelsReady}>
              {modelsReady ? "Start Camera →" : <><span className="spinner"/>&nbsp;Loading AI Models…</>}
            </button>
          </>
        )}
        {stage==="camera" && (
          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",fontSize:15,padding:14}} onClick={captureSelfie}>
            📸 Capture Selfie
          </button>
        )}
        {stage==="capturing" && <div style={{textAlign:"center",color:"var(--amber)"}}>🔍 Detecting face…</div>}
        {stage==="saving"    && <div style={{textAlign:"center",color:"var(--teal)"}}>💾 Saving to secure database…</div>}
        {stage==="done"      && <div className="success-box" style={{textAlign:"center"}}>✓ Face enrolled successfully! Loading your dashboard…</div>}
      </div>
    </div>
  );
}

// ── CLOCK-IN SCREEN ───────────────────────────────────────────
function ClockInScreen({ employee, settings }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const [stage, setStage]   = useState("idle");
  const [checks, setChecks] = useState({ face:"idle", gps:"idle", buddy:"idle" });
  const [result, setResult] = useState(null);
  const [error, setError]   = useState("");
  const [todayRecord, setTodayRecord] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [clockedOut, setClockedOut] = useState(false);

  useEffect(() => {
    // Check if already clocked in today
    const today = new Date().toISOString().slice(0,10);
    supabase.from("clock_ins").select("*").eq("employee_id", employee.id).eq("work_date", today).maybeSingle()
      .then(({data}) => { if (data) setTodayRecord(data); });
    loadFaceModels();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [employee.id]);

  const startScan = async () => {
    setError(""); setStage("scanning");
    setChecks({ face:"checking", gps:"checking", buddy:"checking" });

    try {
      // 1. Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"user", width:640, height:480 } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // 2. GPS check (parallel)
      let gpsData = null;
      try {
        const pos = await getGPS();
        const dist = Math.round(haversine(settings.office_lat, settings.office_lng, pos.lat, pos.lng));
        const within = dist <= settings.geofence_radius_m;
        gpsData = { lat: pos.lat, lng: pos.lng, distance_m: dist, within, status: within?"on_site":"outside_fence" };
        setChecks(c => ({...c, gps: within ? "ok" : "warn"}));
      } catch (gpsErr) {
        gpsData = { lat:null, lng:null, distance_m:null, within:false, status:"unknown" };
        setChecks(c => ({...c, gps:"fail"}));
      }

      // 3. Face recognition
      await new Promise(r => setTimeout(r, 800)); // let video stabilize
      const detected = await detectFaceDescriptor(videoRef.current);
      if (!detected) {
        setChecks(c => ({...c, face:"fail", buddy:"fail"}));
        throw new Error("No face detected. Please face the camera directly in good lighting.");
      }

      // Compare with enrolled descriptor
      const storedDesc = employee.face_descriptor ? new Float32Array(employee.face_descriptor) : null;
      let faceMatch = false, matchScore = 0, buddyFlag = false, buddyScore = 0;

      if (storedDesc) {
        const dist = faceDistance(detected.descriptor, storedDesc);
        matchScore  = parseFloat((1 - dist).toFixed(3));
        faceMatch   = dist < 0.6; // < 0.6 = same person
        setChecks(c => ({...c, face: faceMatch ? "ok" : "fail"}));

        // 4. Buddy punch — compare against ALL enrolled employees
        const { data: allEmps } = await supabase.from("employees").select("id,full_name,face_descriptor").eq("face_enrolled",true).eq("is_active",true);
        let closestOther = 1;
        for (const e of allEmps || []) {
          if (e.id === employee.id || !e.face_descriptor) continue;
          const d = faceDistance(detected.descriptor, new Float32Array(e.face_descriptor));
          if (d < closestOther) closestOther = d;
        }
        buddyScore = parseFloat(closestOther.toFixed(3));
        buddyFlag  = closestOther < 0.5; // someone else's face is closer match
        setChecks(c => ({...c, buddy: buddyFlag ? "fail" : "ok"}));
      } else {
        setChecks(c => ({...c, face:"fail", buddy:"idle"}));
        throw new Error("Face not enrolled. Please contact admin.");
      }

      // Stop camera
      streamRef.current.getTracks().forEach(t => t.stop());

      if (!faceMatch) throw new Error("Face not recognized. This incident has been logged.");
      if (buddyFlag)  throw new Error("⚠ Buddy punch detected. This incident has been logged by AI.");

      // 5. GPS policy enforcement
      const policy = employee.gps_policy || "office_only";
      let blocked = false;
      if (policy === "office_only" && !gpsData.within && settings.gps_enforce) {
        if (!gpsData.within) {
          setResult({ gpsData, faceMatch, matchScore, buddyFlag, buddyScore, blocked:true });
          setShowOverride(true);
          setStage("gps_blocked");
          return;
        }
      }

      // 6. Write clock-in to Supabase
      const now    = new Date();
      const today  = now.toISOString().slice(0,10);
      const shift  = employee.shifts;
      const graceMs = (shift?.grace_mins||10) * 60000;
      const [sh,sm] = (shift?.start_time||"09:00").split(":").map(Number);
      const shiftStart = new Date(now); shiftStart.setHours(sh,sm,0,0);
      const isLate   = now > new Date(shiftStart.getTime() + graceMs);
      const lateMins = isLate ? Math.floor((now - shiftStart)/60000) : 0;

      const { data: rec, error: dbErr } = await supabase.from("clock_ins").insert({
        employee_id:       employee.id,
        work_date:         today,
        clock_in_time:     now.toISOString(),
        lat:               gpsData.lat,
        lng:               gpsData.lng,
        gps_distance_m:    gpsData.distance_m,
        gps_status:        gpsData.status,
        face_match_score:  matchScore,
        face_verified:     faceMatch,
        buddy_punch_flag:  buddyFlag,
        buddy_punch_score: buddyScore,
        status:            isLate ? "late" : "present",
        is_late:           isLate,
        late_mins:         lateMins,
      }).select().single();
      if (dbErr) throw dbErr;

      // Log AI audit
      await supabase.from("ai_audit_log").insert({
        clock_in_id: rec.id, employee_id: employee.id,
        event_type: "face_verified",
        details: { matchScore, buddyScore, gps: gpsData.status, isLate },
      });

      setTodayRecord(rec);
      setResult({ gpsData, faceMatch, matchScore, buddyFlag, buddyScore, isLate, lateMins, blocked:false });
      setStage("done");

    } catch (e) {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      setError(e.message); setStage("idle");
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord) return;
    const { data, error: dbErr } = await supabase.from("clock_ins")
      .update({ clock_out_time: new Date().toISOString() })
      .eq("id", todayRecord.id).select().single();
    if (!dbErr) { setTodayRecord(data); setClockedOut(true); }
  };

  const submitOverrideRequest = async () => {
    if (!overrideReason.trim()) return;
    // Insert pending clock-in (flagged) + override request
    const now = new Date(), today = now.toISOString().slice(0,10);
    const shift = employee.shifts;
    const graceMs = (shift?.grace_mins||10)*60000;
    const [sh,sm] = (shift?.start_time||"09:00").split(":").map(Number);
    const shiftStart = new Date(now); shiftStart.setHours(sh,sm,0,0);
    const isLate = now > new Date(shiftStart.getTime()+graceMs);

    const { data: rec } = await supabase.from("clock_ins").insert({
      employee_id: employee.id, work_date: today,
      clock_in_time: now.toISOString(),
      lat: result?.gpsData?.lat, lng: result?.gpsData?.lng,
      gps_distance_m: result?.gpsData?.distance_m,
      gps_status: "outside_fence",
      face_match_score: result?.matchScore, face_verified: result?.faceMatch,
      buddy_punch_flag: false, status: isLate?"late":"present",
      is_late: isLate,
    }).select().single();

    if (rec) {
      await supabase.from("gps_override_requests").insert({
        clock_in_id: rec.id, employee_id: employee.id, reason: overrideReason,
      });
      setTodayRecord(rec); setShowOverride(false); setStage("override_pending");
    }
  };

  const reset = () => { setStage("idle"); setChecks({face:"idle",gps:"idle",buddy:"idle"}); setError(""); setResult(null); setShowOverride(false); };

  // Already clocked in
  if (todayRecord && stage !== "done") {
    const ci = new Date(todayRecord.clock_in_time);
    const co = todayRecord.clock_out_time ? new Date(todayRecord.clock_out_time) : null;
    return (
      <div className="clockin-wrap fade-in">
        <div className="clockin-card">
          <div style={{textAlign:"center",fontSize:64,marginBottom:16}}>✅</div>
          <div className="clockin-title" style={{color:"var(--teal)"}}>Already Clocked In</div>
          <div className="clockin-sub">Welcome back, {employee.full_name}</div>
          <div style={{background:"var(--bg3)",borderRadius:12,padding:16,marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{color:"var(--text2)",fontSize:12}}>Clock In</span>
              <span style={{fontFamily:"monospace",fontWeight:700,color:"var(--teal)"}}>{ci.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{color:"var(--text2)",fontSize:12}}>Clock Out</span>
              <span style={{fontFamily:"monospace",fontWeight:700,color:co?"var(--green)":"var(--text3)"}}>{co?co.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}):"—"}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:"var(--text2)",fontSize:12}}>Status</span>
              <span className={`badge ${todayRecord.is_late?"late":"present"}`}>{todayRecord.is_late?"Late":"Present"}</span>
            </div>
          </div>
          {!co && !clockedOut && (
            <button className="btn btn-danger" style={{width:"100%",justifyContent:"center"}} onClick={handleClockOut}>
              Clock Out Now
            </button>
          )}
          {(co || clockedOut) && <div className="success-box" style={{textAlign:"center"}}>✓ Clocked out. Have a great rest of your day!</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="clockin-wrap fade-in">
      <div className="clockin-card">
        {stage==="override_pending" ? (
          <>
            <div style={{textAlign:"center",fontSize:48,marginBottom:16}}>⏳</div>
            <div className="clockin-title" style={{color:"var(--amber)"}}>Override Requested</div>
            <div className="clockin-sub">Your clock-in has been recorded. An admin will review your location override request.</div>
            <div className="info-box">Your reason has been submitted. You'll be notified once approved.</div>
          </>
        ) : stage==="gps_blocked" && showOverride ? (
          <>
            <div style={{textAlign:"center",fontSize:48,marginBottom:16}}>📍</div>
            <div className="clockin-title" style={{color:"var(--red)"}}>Outside Geofence</div>
            <div className="clockin-sub">You are {result?.gpsData?.distance_m}m away from the office (max: {settings.geofence_radius_m}m)</div>
            {error && <div className="error-box">⚠ {error}</div>}
            <div className="form-group">
              <label className="form-label">Reason for being off-site</label>
              <textarea className="form-input" rows={3} placeholder="e.g. Client visit, working from branch office, medical appointment…" value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} />
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost" style={{flex:1,justifyContent:"center"}} onClick={reset}>Cancel</button>
              <button className="btn btn-amber" style={{flex:1,justifyContent:"center"}} onClick={submitOverrideRequest} disabled={!overrideReason.trim()}>
                Submit Override Request
              </button>
            </div>
          </>
        ) : stage==="done" ? (
          <>
            <div style={{textAlign:"center",fontSize:64,marginBottom:16}}>✅</div>
            <div className="clockin-title" style={{color:"var(--teal)"}}>Check-In Successful!</div>
            <div className="clockin-sub">
              {new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
              {result?.isLate && <span style={{color:"var(--amber)"}}>  · Late by {result.lateMins} min</span>}
            </div>
            <div style={{background:"var(--green-dim)",border:"1px solid rgba(46,204,113,0.3)",borderRadius:12,padding:16,marginBottom:20}}>
              <div style={{fontSize:13,color:"var(--green)",fontWeight:600,marginBottom:4}}>✓ Face verified (score: {result?.matchScore})</div>
              <div style={{fontSize:13,color:"var(--green)",fontWeight:600,marginBottom:4}}>✓ {result?.gpsData?.within?"On-site confirmed":"Location recorded"}</div>
              <div style={{fontSize:13,color:"var(--green)",fontWeight:600}}>✓ No buddy punch detected</div>
            </div>
            <button className="btn btn-ghost" style={{width:"100%",justifyContent:"center"}} onClick={handleClockOut}>Clock Out</button>
          </>
        ) : (
          <>
            <div className="video-frame">
              <video ref={videoRef} muted playsInline style={{display:stage==="idle"?"none":"block"}} />
              {stage==="scanning" && <><div className="face-ring"/><div className="scan-line"/></>}
              {stage==="idle" && <div style={{fontSize:64}}>👤</div>}
            </div>

            <div className="clockin-title">{stage==="idle"?"Ready to Check In":"Scanning…"}</div>
            <div className="clockin-sub">
              {stage==="idle" ? `Welcome, ${employee.full_name}. Tap Scan to clock in.` : "AI verifying your identity and location…"}
            </div>

            {error && <div className="error-box">⚠ {error}</div>}

            <div style={{marginBottom:20}}>
              {[
                {key:"face", icon:"📸", label:"Face Recognition"},
                {key:"gps",  icon:"📍", label:"GPS Verification"},
                {key:"buddy",icon:"🔍", label:"Buddy Punch Check"},
              ].map(c => (
                <div key={c.key} className="check-row">
                  <div className="check-icon">{c.icon}</div>
                  <div className="check-label">{c.label}</div>
                  <div className={`check-status ${checks[c.key]}`}>
                    { checks[c.key]==="idle"     ? "—" :
                      checks[c.key]==="ok"       ? "✓ Verified" :
                      checks[c.key]==="warn"     ? "⚠ Off-site" :
                      checks[c.key]==="fail"     ? "✗ Failed" :
                      "Scanning…" }
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{width:"100%",justifyContent:"center",fontSize:15,padding:14}}
              onClick={startScan}
              disabled={stage==="scanning"}
            >
              {stage==="scanning" ? <><span className="spinner"/>&nbsp;Verifying…</> : "📸 Scan & Clock In"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────
function AdminDashboard({ employees, clockIns }) {
  const present = clockIns.filter(c=>c.status==="present"||c.status==="late").length;
  const late    = clockIns.filter(c=>c.is_late).length;
  const absent  = employees.length - present;
  const flagged = clockIns.filter(c=>c.buddy_punch_flag).length;

  return (
    <div className="fade-in">
      <div className="stats-grid">
        <div className="stat-card teal"><div className="stat-label">Present Today</div><div className="stat-value teal">{present}</div><div className="stat-sub">of {employees.length} staff</div></div>
        <div className="stat-card amber"><div className="stat-label">Late Arrivals</div><div className="stat-value amber">{late}</div><div className="stat-sub">flagged for review</div></div>
        <div className="stat-card red"><div className="stat-label">Absent</div><div className="stat-value red">{Math.max(0,absent)}</div><div className="stat-sub">no check-in today</div></div>
        <div className="stat-card green"><div className="stat-label">AI Buddy Flags</div><div className="stat-value" style={{color:"var(--red)"}}>{flagged}</div><div className="stat-sub">pending review</div></div>
      </div>

      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div className="card-title" style={{marginBottom:0}}>Live Attendance Feed</div>
          <div className="live-dot">Live</div>
        </div>
        {clockIns.length === 0 ? (
          <div className="empty"><div className="icon">📋</div>No clock-ins yet today.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Employee</th><th>Status</th><th>Clock In</th><th>GPS</th><th>Face Score</th><th>AI Flag</th></tr></thead>
            <tbody>
              {clockIns.map(c => {
                const emp = employees.find(e=>e.id===c.employee_id);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div className="avatar">{emp?.full_name?.slice(0,2).toUpperCase()||"??"}</div>
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{emp?.full_name||"Unknown"}</div>
                          <div style={{fontSize:11,color:"var(--text3)"}}>{emp?.departments?.name||""}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${c.is_late?"late":"present"}`}>● {c.is_late?"Late":"Present"}</span></td>
                    <td style={{fontFamily:"monospace",fontWeight:600}}>{new Date(c.clock_in_time).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</td>
                    <td><span style={{fontSize:12,color:c.gps_status==="on_site"?"var(--green)":"var(--amber)"}}>{c.gps_status==="on_site"?"✓ On-site":"⚠ "+c.gps_distance_m+"m"}</span></td>
                    <td><span style={{fontSize:12,fontFamily:"monospace",color:c.face_match_score>0.7?"var(--green)":"var(--amber)"}}>{c.face_match_score?.toFixed(2)||"—"}</span></td>
                    <td>{c.buddy_punch_flag?<span className="ai-flag">⚠ Buddy</span>:c.is_late?<span className="badge late">Late</span>:<span style={{fontSize:12,color:"var(--text3)"}}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── EMPLOYEES SCREEN ──────────────────────────────────────────
function EmployeesScreen({ employees, onRefresh }) {
  const [search, setSearch] = useState("");
  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.departments?.name||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div style={{display:"flex",gap:14,marginBottom:20}}>
        <div className="search-bar" style={{flex:1}}>
          <span>🔍</span>
          <input placeholder="Search employees…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost" onClick={onRefresh}>↻ Refresh</button>
      </div>
      <div className="card">
        {filtered.length===0 ? <div className="empty"><div className="icon">👥</div>No employees found.</div> : (
          <table className="table">
            <thead><tr><th>Employee</th><th>Department</th><th>Shift</th><th>GPS Policy</th><th>Face</th><th>Role</th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div className="avatar">{e.full_name.slice(0,2).toUpperCase()}</div>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{e.full_name}</div>
                        <div style={{fontSize:11,color:"var(--text3)"}}>{e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{e.departments?.name||"—"}</td>
                  <td><span className="shift-pill">{e.shifts?.name||"Default"}</span></td>
                  <td>
                    <span style={{fontSize:12,color:e.gps_policy==="office_only"?"var(--teal)":e.gps_policy==="remote_allowed"?"var(--amber)":"var(--green)"}}>
                      {e.gps_policy==="office_only"?"🏢 Office Only":e.gps_policy==="remote_allowed"?"🏠 Remote OK":"🔀 Hybrid"}
                    </span>
                  </td>
                  <td>
                    {e.face_enrolled
                      ? <span style={{color:"var(--green)",fontSize:12,fontWeight:600}}>✓ Enrolled</span>
                      : <span style={{color:"var(--red)",fontSize:12}}>✗ Not enrolled</span>}
                  </td>
                  <td><span style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.5px",color:"var(--text2)"}}>{e.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── OVERRIDE REQUESTS SCREEN ──────────────────────────────────
function OverridesScreen({ employee }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gps_override_requests")
      .select("*, employees(full_name), clock_ins(gps_distance_m, gps_status, clock_in_time)")
      .eq("status","pending")
      .order("created_at",{ascending:false});
    setRequests(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const resolve = async (id, clockInId, approved) => {
    await supabase.from("gps_override_requests").update({
      status: approved?"approved":"rejected",
      reviewed_by: employee.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id",id);
    if (approved) {
      await supabase.from("clock_ins").update({
        override_approved:true, override_by:employee.id, override_at:new Date().toISOString()
      }).eq("id",clockInId);
    }
    load();
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div className="card-title" style={{marginBottom:0}}>GPS Override Requests</div>
          <button className="btn btn-ghost" style={{fontSize:12}} onClick={load}>↻ Refresh</button>
        </div>
        {loading ? <div className="empty"><span className="spinner"/></div> :
         requests.length===0 ? <div className="empty"><div className="icon">✅</div>No pending overrides.</div> : (
          <table className="table">
            <thead><tr><th>Employee</th><th>Time</th><th>Distance</th><th>Reason</th><th>Action</th></tr></thead>
            <tbody>
              {requests.map(r=>(
                <tr key={r.id}>
                  <td style={{fontWeight:600}}>{r.employees?.full_name}</td>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{r.clock_ins?.clock_in_time?new Date(r.clock_ins.clock_in_time).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}):""}</td>
                  <td><span style={{color:"var(--amber)",fontFamily:"monospace"}}>{r.clock_ins?.gps_distance_m}m away</span></td>
                  <td style={{fontSize:12,color:"var(--text2)",maxWidth:200}}>{r.reason}</td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-primary" style={{padding:"5px 12px",fontSize:11}} onClick={()=>resolve(r.id,r.clock_in_id,true)}>Approve</button>
                      <button className="btn btn-danger"  style={{padding:"5px 12px",fontSize:11}} onClick={()=>resolve(r.id,r.clock_in_id,false)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── ATTENDANCE SCREEN ─────────────────────────────────────────
function AttendanceScreen({ employees }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0,10));

  useEffect(()=>{
    setLoading(true);
    supabase.from("clock_ins")
      .select("*, employees(full_name,departments(name))")
      .eq("work_date",dateFilter)
      .order("clock_in_time",{ascending:false})
      .then(({data})=>{ setRecords(data||[]); setLoading(false); });
  },[dateFilter]);

  return (
    <div className="fade-in">
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
        <input type="date" className="form-input" style={{width:180}} value={dateFilter} onChange={e=>setDateFilter(e.target.value)} />
        <span style={{fontSize:13,color:"var(--text2)"}}>{records.length} records</span>
      </div>
      <div className="card">
        {loading ? <div className="empty"><span className="spinner"/></div> :
         records.length===0 ? <div className="empty"><div className="icon">📋</div>No records for this date.</div> : (
          <table className="table">
            <thead><tr><th>Employee</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>GPS</th><th>Face</th><th>Status</th><th>AI</th></tr></thead>
            <tbody>
              {records.map(r=>(
                <tr key={r.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div className="avatar">{r.employees?.full_name?.slice(0,2).toUpperCase()||"??"}</div>
                      <div style={{fontWeight:600,fontSize:13}}>{r.employees?.full_name}</div>
                    </div>
                  </td>
                  <td style={{fontFamily:"monospace",fontWeight:600}}>{r.clock_in_time?new Date(r.clock_in_time).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}):"—"}</td>
                  <td style={{fontFamily:"monospace",color:"var(--text2)"}}>{r.clock_out_time?new Date(r.clock_out_time).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}):"—"}</td>
                  <td style={{fontWeight:700,color:"var(--teal)"}}>{r.hours_worked?r.hours_worked.toFixed(1)+"h":"—"}</td>
                  <td><span style={{fontSize:12,color:r.gps_status==="on_site"?"var(--green)":"var(--amber)"}}>{r.gps_status==="on_site"?"✓ On-site":"⚠ "+r.gps_distance_m+"m"}</span></td>
                  <td><span style={{fontSize:12,fontFamily:"monospace",color:r.face_verified?"var(--green)":"var(--red)"}}>{r.face_verified?"✓ "+r.face_match_score?.toFixed(2):"✗"}</span></td>
                  <td><span className={`badge ${r.is_late?"late":"present"}`}>{r.is_late?"Late":"Present"}</span></td>
                  <td>{r.buddy_punch_flag?<span className="ai-flag">⚠ Buddy</span>:r.override_approved?<span style={{fontSize:12,color:"var(--teal)"}}>⚙ Override</span>:<span style={{fontSize:12,color:"var(--green)"}}>✓ OK</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── SETTINGS SCREEN ───────────────────────────────────────────
function SettingsScreen({ settings, onSettingsSaved }) {
  const [form, setForm] = useState(settings||{});
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(()=>{ setForm(settings||{}); },[settings]);

  const save = async () => {
    setSaving(true); setSaved(false);
    const { error } = await supabase.from("app_settings").update({
      office_lat:           parseFloat(form.office_lat),
      office_lng:           parseFloat(form.office_lng),
      geofence_radius_m:    parseInt(form.geofence_radius_m),
      late_deduction_ngn:   parseInt(form.late_deduction_ngn),
      absent_deduction_ngn: parseInt(form.absent_deduction_ngn),
      gps_enforce:          form.gps_enforce,
      face_required:        form.face_required,
      buddy_punch_block:    form.buddy_punch_block,
      updated_at:           new Date().toISOString(),
    }).eq("id",1);
    setSaving(false);
    if (!error) { setSaved(true); onSettingsSaved(form); }
  };

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <div className="fade-in">
      {saved && <div className="success-box">✓ Settings saved successfully.</div>}
      <div className="grid-2">
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div className="card">
            <div className="card-title">Geofencing</div>
            <div className="form-group"><label className="form-label">Office Latitude</label><input className="form-input" value={form.office_lat||""} onChange={e=>set("office_lat",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Office Longitude</label><input className="form-input" value={form.office_lng||""} onChange={e=>set("office_lng",e.target.value)} /></div>
            <div className="form-group">
              <label className="form-label">Radius: {form.geofence_radius_m}m</label>
              <input type="range" min="50" max="1000" step="50" value={form.geofence_radius_m||100} onChange={e=>set("geofence_radius_m",e.target.value)} style={{width:"100%",accentColor:"var(--teal)"}} />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Deduction Policy</div>
            <div className="form-group"><label className="form-label">Late Deduction (₦/occurrence)</label><input className="form-input" value={form.late_deduction_ngn||""} onChange={e=>set("late_deduction_ngn",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Absence Deduction (₦/day)</label><input className="form-input" value={form.absent_deduction_ngn||""} onChange={e=>set("absent_deduction_ngn",e.target.value)} /></div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div className="card">
            <div className="card-title">AI Settings</div>
            {[
              {key:"face_required",    label:"Face Recognition Required",   sub:"Block clock-in without face scan"},
              {key:"buddy_punch_block",label:"Buddy Punch Detection",        sub:"AI flags mismatched face identity"},
              {key:"gps_enforce",      label:"GPS Enforcement",              sub:"Enforce geofence on clock-in"},
            ].map(s=>(
              <div key={s.key} style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{s.label}</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{s.sub}</div>
                </div>
                <div
                  style={{width:44,height:24,borderRadius:12,cursor:"pointer",background:form[s.key]?"var(--teal)":"var(--bg4)",display:"flex",alignItems:"center",padding:3,justifyContent:form[s.key]?"flex-end":"flex-start",transition:"all 0.2s"}}
                  onClick={()=>set(s.key,!form[s.key])}
                >
                  <div style={{width:18,height:18,borderRadius:"50%",background:"white"}} />
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={save} disabled={saving}>
            {saving ? <><span className="spinner"/>&nbsp;Saving…</> : "💾 Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NAV CONFIG ────────────────────────────────────────────────
const ADMIN_NAV = [
  { section:"Main",     items:[{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"clockin",icon:"📸",label:"Clock In / Out"}]},
  { section:"Workforce",items:[{id:"employees",icon:"👥",label:"Employees"},{id:"attendance",icon:"📋",label:"Attendance"},{id:"overrides",icon:"📍",label:"GPS Overrides",badge:true}]},
  { section:"System",   items:[{id:"settings",icon:"⚙️",label:"Settings"}]},
];
const EMP_NAV = [
  { section:"Me", items:[{id:"clockin",icon:"📸",label:"Clock In / Out"},{id:"myrecord",icon:"📋",label:"My Record"}]},
];
const PAGE_TITLES = { dashboard:"Dashboard Overview", clockin:"AI Check-In", employees:"Employees", attendance:"Attendance Records", overrides:"GPS Override Requests", settings:"System Settings", myrecord:"My Attendance" };

// ── ROOT APP ──────────────────────────────────────────────────
export default function App() {
  const [authUser, setAuthUser]       = useState(null);  // Supabase auth session
  const [employee, setEmployee]       = useState(null);  // employees row
  const [page, setPage]               = useState("clockin");
  const [loading, setLoading]         = useState(true);
  const [employees, setEmployees]     = useState([]);
  const [clockIns, setClockIns]       = useState([]);
  const [settings, setSettings]       = useState(null);
  const [pendingOverrides, setPendingOverrides] = useState(0);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: emp } = await supabase
          .from("employees")
          .select("*, departments(name), shifts(name,start_time,end_time,grace_mins)")
          .eq("auth_user_id", data.session.user.id)
          .single();
        setEmployee(emp||null);
        setAuthUser(data.session.user);
        if (emp?.role==="admin"||emp?.role==="superadmin") setPage("dashboard");
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) { setAuthUser(null); setEmployee(null); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load admin data
  useEffect(() => {
    if (!employee) return;
    const isAdmin = employee.role==="admin"||employee.role==="superadmin"||employee.role==="supervisor";
    if (isAdmin) {
      supabase.from("employees").select("*,departments(name),shifts(name,start_time,end_time,grace_mins)").eq("is_active",true).then(({data})=>setEmployees(data||[]));
      const today = new Date().toISOString().slice(0,10);
      supabase.from("clock_ins").select("*").eq("work_date",today).then(({data})=>setClockIns(data||[]));
      supabase.from("gps_override_requests").select("id").eq("status","pending").then(({data})=>setPendingOverrides(data?.length||0));
    }
    supabase.from("app_settings").select("*").eq("id",1).single().then(({data})=>setSettings(data));
  }, [employee]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null); setEmployee(null);
  };

  if (loading) return (
    <>
      <style>{FONTS}{CSS}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"var(--display)",fontSize:28,fontWeight:800,color:"var(--teal)",marginBottom:16}}>Attend<span style={{color:"var(--text)"}}>AI</span></div>
          <span className="spinner" style={{width:24,height:24,borderWidth:3}} />
        </div>
      </div>
    </>
  );

  if (!authUser || !employee) return (
    <>
      <style>{FONTS}{CSS}</style>
      <LoginScreen onLogin={emp => { setEmployee(emp); setAuthUser({id:emp.auth_user_id}); setPage(emp.role==="admin"||emp.role==="superadmin"?"dashboard":"clockin"); }} />
    </>
  );

  // Face enrollment gate (first login)
  if (!employee.face_enrolled) return (
    <>
      <style>{FONTS}{CSS}</style>
      <FaceEnrollmentScreen employee={employee} onEnrolled={emp => setEmployee(emp)} />
    </>
  );

  const isAdmin = employee.role==="admin"||employee.role==="superadmin"||employee.role==="supervisor";
  const nav = isAdmin ? ADMIN_NAV : EMP_NAV;

  const renderPage = () => {
    switch(page) {
      case "dashboard":  return <AdminDashboard employees={employees} clockIns={clockIns} />;
      case "clockin":    return <ClockInScreen employee={employee} settings={settings||{office_lat:6.5244,office_lng:3.3792,geofence_radius_m:100,gps_enforce:true}} />;
      case "employees":  return <EmployeesScreen employees={employees} onRefresh={()=>supabase.from("employees").select("*,departments(name),shifts(name,start_time,end_time,grace_mins)").eq("is_active",true).then(({data})=>setEmployees(data||[]))} />;
      case "attendance": return <AttendanceScreen employees={employees} />;
      case "overrides":  return <OverridesScreen employee={employee} />;
      case "settings":   return <SettingsScreen settings={settings} onSettingsSaved={s=>setSettings(s)} />;
      case "myrecord":   return <AttendanceScreen employees={[employee]} />;
      default:           return <AdminDashboard employees={employees} clockIns={clockIns} />;
    }
  };

  return (
    <>
      <style>{FONTS}{CSS}</style>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="brand">Attend<span>AI</span></div>
            <div className="tagline">Workforce Intelligence</div>
          </div>
          <div className="sidebar-role">
            <div className="role-avatar">👤</div>
            <div className="role-info">
              <div className="name">{employee.full_name}</div>
              <div className="role">{employee.role}</div>
            </div>
          </div>
          <div className="sidebar-nav">
            {nav.map(section => (
              <div key={section.section}>
                <div className="nav-section-label">{section.section}</div>
                {section.items.map(item => (
                  <div key={item.id} className={`nav-item ${page===item.id?"active":""}`} onClick={()=>setPage(item.id)}>
                    <span className="icon">{item.icon}</span>
                    {item.label}
                    {item.badge && pendingOverrides>0 && <span className="nav-badge">{pendingOverrides}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="sidebar-bottom">
            <button className="btn btn-ghost" style={{width:"100%",justifyContent:"center",fontSize:12}} onClick={handleLogout}>← Sign Out</button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{PAGE_TITLES[page]||"AttendAI"}</div>
            <span className="topbar-time"><Clock /></span>
            <div className="topbar-dot" title="Supabase Connected" />
          </div>
          <div className="content">
            {renderPage()}
          </div>
        </div>
      </div>
    </>
  );
}
