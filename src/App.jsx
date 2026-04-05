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
const SUPABASE_URL  = "https://jlsknoavpckqyjcxsomt.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc2tub2F2cGNrcXlqY3hzb210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzIxMjMsImV4cCI6MjA5MDY0ODEyM30.Gv_JuxMrV39VEkDs46kWi9rzvb-_vVNhHGEruYni_-0";
const MODELS_PATH = "/models"; // face-api.js model weights in /public/models/

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── FONTS + CSS ─────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`;

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#F0F4F8; --bg2:#FFFFFF; --bg3:#F7F9FC; --bg4:#EEF2F7;
  --border:#E2E8F0; --border2:#CBD5E1;
  --primary:#1A56DB; --primary-dim:rgba(26,86,219,0.1); --primary-light:#EBF0FF;
  --amber:#D97706; --amber-dim:rgba(217,119,6,0.1);
  --red:#DC2626; --red-dim:rgba(220,38,38,0.1);
  --green:#059669; --green-dim:rgba(5,150,105,0.1);
  --text:#0F172A; --text2:#475569; --text3:#94A3B8;
  --display:'Plus Jakarta Sans',sans-serif; --body:'Inter',sans-serif;
  --shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:0 4px 6px rgba(0,0,0,0.07),0 2px 4px rgba(0,0,0,0.06);
}
body { background:var(--bg); color:var(--text); font-family:var(--body); }
.app { display:flex; height:100vh; overflow:hidden; font-family:var(--body); background:var(--bg); }

/* SIDEBAR — desktop only */
.sidebar { width:220px; flex-shrink:0; background:var(--bg2); border-right:1px solid var(--border); display:flex; flex-direction:column; }
.sidebar-logo { padding:20px 16px 16px; border-bottom:1px solid var(--border); }
.sidebar-logo .brand { font-family:var(--display); font-size:17px; font-weight:800; color:var(--primary); letter-spacing:-0.3px; }
.sidebar-logo .brand span { color:var(--text); }
.sidebar-logo .tagline { font-size:10px; color:var(--text3); margin-top:2px; letter-spacing:1px; text-transform:uppercase; }
.sidebar-role { margin:12px 12px; background:var(--primary-light); border-radius:10px; padding:10px 12px; display:flex; align-items:center; gap:10px; }
.role-avatar { width:32px; height:32px; border-radius:8px; background:var(--primary); display:flex; align-items:center; justify-content:center; font-size:13px; color:white; font-weight:700; }
.role-info .name { font-size:13px; font-weight:600; color:var(--text); }
.role-info .role { font-size:10px; color:var(--primary); text-transform:uppercase; letter-spacing:1px; font-weight:600; }
.sidebar-nav { flex:1; padding:8px; overflow-y:auto; }
.nav-section-label { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--text3); padding:10px 8px 4px; font-weight:600; }
.nav-item { display:flex; align-items:center; gap:8px; padding:9px 10px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; color:var(--text2); transition:all 0.12s; margin-bottom:1px; }
.nav-item:hover { background:var(--bg3); color:var(--text); }
.nav-item.active { background:var(--primary-light); color:var(--primary); font-weight:600; }
.nav-item .icon { font-size:15px; width:18px; text-align:center; }
.nav-badge { margin-left:auto; background:var(--red); color:white; font-size:10px; font-weight:700; padding:1px 6px; border-radius:20px; }
.sidebar-bottom { padding:12px; border-top:1px solid var(--border); }

/* MAIN */
.main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
.topbar { height:52px; background:var(--bg2); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 16px; gap:10px; flex-shrink:0; box-shadow:var(--shadow); }
.topbar-title { font-family:var(--display); font-size:15px; font-weight:700; flex:1; color:var(--text); }
.topbar-time { font-size:11px; color:var(--text3); font-weight:500; }
.topbar-dot { width:7px; height:7px; border-radius:50%; background:var(--green); box-shadow:0 0 6px var(--green); animation:pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
.content { flex:1; overflow-y:auto; padding:16px; padding-bottom:80px; }

/* CARDS */
.card { background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:16px; box-shadow:var(--shadow); }
.card-title { font-family:var(--display); font-size:12px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px; }

/* STAT CARDS — compact 2x2 grid */
.stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
.stat-card { background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:10px 12px; position:relative; box-shadow:var(--shadow); }
.stat-card.blue  { background:linear-gradient(135deg,#EBF0FF,#F0F4FF); border-color:#C7D7FE; }
.stat-card.amber { background:linear-gradient(135deg,#FFFBEB,#FEF3C7); border-color:#FDE68A; }
.stat-card.red   { background:linear-gradient(135deg,#FEF2F2,#FEE2E2); border-color:#FECACA; }
.stat-card.green { background:linear-gradient(135deg,#ECFDF5,#D1FAE5); border-color:#A7F3D0; }
.stat-icon { font-size:16px; margin-bottom:4px; }
.stat-label { font-size:9px; color:var(--text3); font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:2px; }
.stat-value { font-family:var(--display); font-size:22px; font-weight:800; line-height:1; }
.stat-value.blue{color:var(--primary)}.stat-value.amber{color:var(--amber)}.stat-value.red{color:var(--red)}.stat-value.green{color:var(--green)}
.stat-sub { font-size:9px; color:var(--text3); margin-top:2px; }

/* QUICK ACTION TILES (like PalmPay) */
.quick-actions { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }
.qa-tile { background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:12px 6px; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; transition:all 0.12s; box-shadow:var(--shadow); }
.qa-tile:hover { background:var(--primary-light); border-color:var(--primary); }
.qa-tile:hover .qa-icon { background:var(--primary); }
.qa-icon { width:40px; height:40px; border-radius:12px; background:var(--bg4); display:flex; align-items:center; justify-content:center; font-size:18px; transition:background 0.12s; }
.qa-label { font-size:10px; font-weight:600; color:var(--text2); text-align:center; line-height:1.2; }

/* LAYOUTS */
.grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }

/* TABLE */
.table { width:100%; border-collapse:collapse; }
.table th { text-align:left; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:var(--text3); padding:8px 10px; border-bottom:1px solid var(--border); font-weight:600; }
.table td { padding:10px; border-bottom:1px solid var(--border); font-size:12px; color:var(--text); }
.table tr:last-child td { border-bottom:none; }
.table tr:hover td { background:var(--bg3); }

/* BADGES */
.badge { display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:600; padding:3px 8px; border-radius:20px; text-transform:uppercase; }
.badge.present{background:var(--green-dim);color:var(--green)}
.badge.late{background:var(--amber-dim);color:var(--amber)}
.badge.absent{background:var(--red-dim);color:var(--red)}

/* BUTTONS */
.btn { display:inline-flex; align-items:center; gap:6px; padding:10px 16px; border-radius:10px; font-size:13px; font-weight:600; font-family:var(--body); cursor:pointer; border:none; transition:all 0.12s; }
.btn:disabled { opacity:0.5; cursor:not-allowed; }
.btn-primary { background:var(--primary); color:white; box-shadow:0 2px 8px rgba(26,86,219,0.3); }
.btn-primary:hover:not(:disabled) { background:#1447C0; }
.btn-ghost { background:var(--bg3); color:var(--text); border:1px solid var(--border); }
.btn-ghost:hover:not(:disabled) { border-color:var(--primary); color:var(--primary); }
.btn-danger { background:var(--red-dim); color:var(--red); border:1px solid rgba(220,38,38,0.2); }
.btn-amber { background:var(--amber-dim); color:var(--amber); border:1px solid rgba(217,119,6,0.2); }

/* AVATAR */
.avatar { width:32px; height:32px; border-radius:8px; background:var(--primary-light); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:var(--primary); flex-shrink:0; }

/* FORMS */
.form-group { margin-bottom:14px; }
.form-label { font-size:11px; color:var(--text2); letter-spacing:0.5px; font-weight:600; margin-bottom:6px; display:block; }
.form-input { width:100%; background:var(--bg3); border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; color:var(--text); font-family:var(--body); font-size:14px; outline:none; transition:border-color 0.15s; }
.form-input:focus { border-color:var(--primary); background:white; }
.form-select { width:100%; background:var(--bg3); border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; color:var(--text); font-family:var(--body); font-size:14px; outline:none; cursor:pointer; }

/* LOGIN */
.login-wrap { display:flex; align-items:center; justify-content:center; min-height:100vh; background:linear-gradient(160deg,#EBF0FF 0%,#F0F4F8 60%,#E0F2FE 100%); }
.login-card { background:white; border:1px solid var(--border); border-radius:20px; padding:36px 32px; width:380px; box-shadow:0 8px 32px rgba(0,0,0,0.1); }
.login-logo { font-family:var(--display); font-size:26px; font-weight:800; color:var(--primary); margin-bottom:4px; }
.login-logo span { color:var(--text); }
.login-sub { font-size:13px; color:var(--text2); margin-bottom:28px; }

/* CLOCK-IN */
.clockin-wrap { display:flex; align-items:center; justify-content:center; min-height:calc(100vh - 52px); padding:16px; }
.clockin-card { background:white; border:1px solid var(--border); border-radius:20px; padding:28px 20px; width:100%; max-width:440px; box-shadow:var(--shadow-md); }
.clockin-title { font-family:var(--display); font-size:20px; font-weight:800; margin-bottom:4px; text-align:center; color:var(--text); }
.clockin-sub { color:var(--text2); font-size:13px; margin-bottom:20px; text-align:center; }
.video-frame { width:220px; height:220px; border-radius:50%; border:3px solid var(--primary); margin:0 auto 20px; position:relative; overflow:hidden; background:var(--bg4); display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 6px var(--primary-dim); }
.video-frame video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
.face-ring { position:absolute; inset:-6px; border-radius:50%; border:3px solid transparent; border-top-color:var(--primary); animation:spin 1.2s linear infinite; pointer-events:none; z-index:10; }
@keyframes spin { to{transform:rotate(360deg)} }
.scan-line { position:absolute; width:100%; height:2px; background:linear-gradient(90deg,transparent,var(--primary),transparent); animation:scanAnim 2s ease-in-out infinite; pointer-events:none; z-index:10; }
@keyframes scanAnim { 0%{top:0}50%{top:100%}100%{top:0} }
.check-row { display:flex; align-items:center; gap:10px; background:var(--bg3); border-radius:10px; padding:11px 14px; margin-bottom:7px; font-size:13px; border:1px solid var(--border); }
.check-icon { font-size:15px; }
.check-label { flex:1; color:var(--text); font-weight:500; }
.check-status.ok { color:var(--green); font-weight:600; font-size:12px; }
.check-status.fail { color:var(--red); font-weight:600; font-size:12px; }
.check-status.checking { color:var(--amber); font-size:12px; animation:pulse 1s infinite; }
.check-status.idle { color:var(--text3); font-size:12px; }

/* AI FLAG */
.ai-flag { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px; background:var(--amber-dim); border:1px solid rgba(217,119,6,0.3); color:var(--amber); text-transform:uppercase; }

/* PROGRESS */
.progress-bar { background:var(--bg4); border-radius:4px; height:5px; overflow:hidden; }
.progress-fill { height:100%; border-radius:4px; background:var(--primary); transition:width 0.5s ease; }

/* MISC */
.tabs { display:flex; gap:6px; margin-bottom:14px; }
.tab { padding:7px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid var(--border); background:var(--bg2); color:var(--text2); transition:all 0.12s; font-family:var(--body); }
.tab.active { background:var(--primary-light); color:var(--primary); border-color:var(--primary); }
.live-dot { display:inline-flex; align-items:center; gap:5px; font-size:11px; color:var(--green); font-weight:600; }
.live-dot::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--green); animation:pulse 1.5s infinite; }
.empty { text-align:center; padding:32px; color:var(--text3); }
.empty .icon { font-size:36px; margin-bottom:10px; }
.error-box { background:var(--red-dim); border:1px solid rgba(220,38,38,0.2); border-radius:10px; padding:11px 14px; color:var(--red); font-size:13px; margin-bottom:14px; }
.success-box { background:var(--green-dim); border:1px solid rgba(5,150,105,0.2); border-radius:10px; padding:11px 14px; color:var(--green); font-size:13px; margin-bottom:14px; }
.info-box { background:var(--primary-light); border:1px solid rgba(26,86,219,0.2); border-radius:10px; padding:11px 14px; color:var(--primary); font-size:13px; margin-bottom:14px; }
.spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(26,86,219,0.2); border-top-color:var(--primary); border-radius:50%; animation:spin 0.7s linear infinite; }

/* ALARM */
.alarm-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.alarm-card { background:white; border:2px solid var(--red); border-radius:20px; padding:28px; width:100%; max-width:320px; text-align:center; box-shadow:0 8px 32px rgba(220,38,38,0.2); }
.alarm-pulse { font-size:52px; animation:alarmPulse 0.5s ease-in-out infinite alternate; }
@keyframes alarmPulse { from{transform:scale(1)} to{transform:scale(1.12)} }
.alarm-title { font-family:var(--display); font-size:20px; font-weight:800; color:var(--red); margin:12px 0 6px; }
.alarm-sub { font-size:13px; color:var(--text2); margin-bottom:16px; }
.alarm-timer { font-family:monospace; font-size:26px; font-weight:800; color:var(--amber); margin-bottom:20px; }

/* BOTTOM NAV — mobile */
.bottom-nav { display:none; }
.sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:99; }
.menu-toggle { display:none; background:none; border:none; color:var(--text); font-size:22px; cursor:pointer; padding:4px 6px; }

@media (max-width: 768px) {
  .menu-toggle { display:block; }
  .sidebar-overlay.open { display:block; }
  .sidebar {
    position:fixed; top:0; left:0; height:100vh; z-index:100;
    transform:translateX(-100%); transition:transform 0.25s ease;
    box-shadow:4px 0 24px rgba(0,0,0,0.15);
    width:240px;
  }
  .sidebar.open { transform:translateX(0); }
  .main { width:100vw; }
  .content { padding:12px; padding-bottom:72px; }
  .stats-grid { grid-template-columns:1fr 1fr; gap:8px; }
  .grid-2 { grid-template-columns:1fr; }
  .topbar { padding:0 12px; height:50px; }
  .topbar-time { display:none; }

  /* BOTTOM NAV */
  .bottom-nav {
    display:flex; position:fixed; bottom:0; left:0; right:0;
    background:white; border-top:1px solid var(--border);
    padding:6px 0 10px; z-index:50;
    box-shadow:0 -2px 12px rgba(0,0,0,0.08);
  }
  .bn-item {
    flex:1; display:flex; flex-direction:column; align-items:center;
    gap:3px; cursor:pointer; padding:4px 0;
    color:var(--text3); font-size:10px; font-weight:600;
    transition:color 0.12s; position:relative;
  }
  .bn-item.active { color:var(--primary); }
  .bn-item .bn-icon { font-size:20px; line-height:1; }
  .bn-badge { position:absolute; top:0; right:calc(50% - 18px); background:var(--red); color:white; font-size:9px; font-weight:700; padding:1px 4px; border-radius:10px; min-width:14px; text-align:center; }
}


/* PROFILE AVATAR BTN */
.profile-btn { width:34px; height:34px; border-radius:50%; background:var(--primary); color:white; font-size:13px; font-weight:700; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.profile-dropdown { position:absolute; top:54px; right:12px; background:white; border:1px solid var(--border); border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.12); z-index:200; width:220px; overflow:hidden; }
.pd-header { padding:16px; background:var(--primary-light); border-bottom:1px solid var(--border); }
.pd-name { font-weight:700; font-size:14px; color:var(--text); }
.pd-role { font-size:11px; color:var(--primary); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; margin-top:2px; }
.pd-item { display:flex; align-items:center; gap:10px; padding:12px 16px; font-size:13px; font-weight:500; color:var(--text); cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.1s; }
.pd-item:last-child { border-bottom:none; }
.pd-item:hover { background:var(--bg3); }
.pd-item.danger { color:var(--red); }

/* ADD EMPLOYEE FORM */
.form-section-title { font-family:var(--display); font-size:14px; font-weight:700; color:var(--text); margin:20px 0 12px; padding-bottom:8px; border-bottom:1px solid var(--border); }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:500px){ .form-row { grid-template-columns:1fr; } }

/* PAYROLL */
.payslip-card { background:white; border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:12px; box-shadow:var(--shadow); }
.payslip-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border); }
.payslip-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--bg4); font-size:13px; }
.payslip-row:last-child { border-bottom:none; }
.payslip-total { display:flex; justify-content:space-between; padding:12px 0 0; font-size:15px; font-weight:700; }

/* REPORTS */
.report-filter { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
.report-stat { background:var(--bg3); border-radius:10px; padding:12px; text-align:center; flex:1; min-width:80px; }
.report-stat-val { font-family:var(--display); font-size:20px; font-weight:800; color:var(--primary); }
.report-stat-lbl { font-size:10px; color:var(--text3); font-weight:600; text-transform:uppercase; margin-top:3px; }

/* WORKING DAYS */
.days-grid { display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
.day-btn { width:44px; height:44px; border-radius:10px; border:1.5px solid var(--border); background:var(--bg3); font-size:11px; font-weight:700; cursor:pointer; transition:all 0.12s; color:var(--text2); font-family:var(--body); }
.day-btn.active { background:var(--primary); border-color:var(--primary); color:white; }

/* PHONE INPUT */
.phone-input-wrap { display:flex; border:1.5px solid var(--border); border-radius:10px; overflow:hidden; background:var(--bg3); transition:border-color 0.15s; }
.phone-input-wrap:focus-within { border-color:var(--primary); background:white; }
.phone-code-select { border:none; background:transparent; padding:11px 8px 11px 12px; font-size:13px; font-weight:600; color:var(--text); outline:none; cursor:pointer; min-width:80px; }
.phone-number-input { flex:1; border:none; background:transparent; padding:11px 14px; font-size:14px; color:var(--text); outline:none; font-family:var(--body); }

/* ACCOUNT PAGE */
.account-section { margin-bottom:6px; }
.account-section-title { font-size:11px; color:var(--text3); font-weight:700; text-transform:uppercase; letter-spacing:1px; padding:14px 16px 6px; }
.account-item { display:flex; align-items:center; gap:14px; padding:14px 16px; background:white; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.1s; }
.account-item:first-of-type { border-radius:12px 12px 0 0; }
.account-item:last-of-type { border-bottom:none; border-radius:0 0 12px 12px; }
.account-item:only-of-type { border-radius:12px; }
.account-item:hover { background:var(--bg3); }
.account-item-icon { width:38px; height:38px; border-radius:10px; background:var(--primary-light); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
.account-item-info { flex:1; }
.account-item-title { font-size:14px; font-weight:600; color:var(--text); }
.account-item-sub { font-size:11px; color:var(--text3); margin-top:1px; }
.account-item-arrow { color:var(--text3); font-size:14px; }
.account-item.danger .account-item-title { color:var(--red); }
.account-item.danger .account-item-icon { background:var(--red-dim); }

/* PRICING */
.plan-card { border:2px solid var(--border); border-radius:14px; padding:16px 12px; text-align:center; cursor:pointer; transition:all 0.15s; position:relative; background:white; flex:1; }
.plan-card.selected { border-color:var(--primary); background:var(--primary-light); }
.plan-badge { position:absolute; top:-10px; left:50%; transform:translateX(-50%); background:var(--red); color:white; font-size:10px; font-weight:700; padding:3px 8px; border-radius:20px; white-space:nowrap; }
.plan-price { font-family:var(--display); font-size:22px; font-weight:800; color:var(--text); }
.plan-original { font-size:12px; color:var(--text3); text-decoration:line-through; }
.plan-label { font-size:11px; color:var(--text2); margin-top:4px; font-weight:500; }

/* FEATURE LIST */
.feature-item { display:flex; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid var(--border); font-size:14px; font-weight:500; }
.feature-item:last-child { border-bottom:none; }
.feature-check { width:24px; height:24px; border-radius:50%; background:var(--green); display:flex; align-items:center; justify-content:center; color:white; font-size:13px; flex-shrink:0; }

/* SHIFT CARD */
.shift-card { background:white; border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:10px; box-shadow:var(--shadow); }
.shift-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.shift-active-badge { background:var(--green-dim); color:var(--green); font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
.shift-days { font-size:12px; color:var(--text2); margin-bottom:8px; }
.shift-time { font-size:15px; font-weight:700; color:var(--text); }
.shift-actions { display:flex; gap:10px; }

/* BUSINESS CARD */
.biz-card { display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); }
.biz-icon { width:42px; height:42px; border-radius:10px; background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; border:1px solid var(--border); }
.biz-info { flex:1; }
.biz-name { font-size:14px; font-weight:700; color:var(--primary); }
.biz-type { font-size:12px; color:var(--text2); margin-top:2px; }

/* DEPT ROW */
.dept-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid var(--border); font-size:14px; font-weight:600; }
.dept-row:last-child { border-bottom:none; }

/* CHECKBOX ITEM */
.check-item { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid var(--border); font-size:14px; font-weight:500; }
.check-item:last-child { border-bottom:none; }
.checkbox { width:24px; height:24px; border-radius:6px; border:2px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.12s; flex-shrink:0; }
.checkbox.checked { background:var(--primary); border-color:var(--primary); color:white; }

/* EMPTY STATE */
.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; color:var(--text3); text-align:center; }
.empty-state .es-icon { font-size:64px; margin-bottom:16px; opacity:0.4; }
.empty-state .es-title { font-size:16px; font-weight:600; color:var(--text2); }

/* FAB */
.fab { position:fixed; bottom:90px; right:20px; width:52px; height:52px; border-radius:14px; background:var(--primary); color:white; font-size:24px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 16px rgba(26,86,219,0.4); z-index:50; }
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn 0.25s ease}
.shift-pill{display:inline-block;font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:var(--primary-light);color:var(--primary)}
.search-bar{display:flex;align-items:center;gap:8px;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;padding:9px 12px}
.search-bar input{background:none;border:none;outline:none;color:var(--text);font-family:var(--body);font-size:13px;flex:1}
.search-bar input::placeholder{color:var(--text3)}
`;


// ── WEST AFRICA CONSTANTS ────────────────────────────────────
const WA_COUNTRIES = [
  { code:'+234', flag:'🇳🇬', name:'Nigeria',      currency:'₦', curr_code:'NGN' },
  { code:'+233', flag:'🇬🇭', name:'Ghana',        currency:'₵', curr_code:'GHS' },
  { code:'+221', flag:'🇸🇳', name:'Senegal',      currency:'CFA', curr_code:'XOF' },
  { code:'+225', flag:'🇨🇮', name:"Côte d'Ivoire",currency:'CFA', curr_code:'XOF' },
  { code:'+228', flag:'🇹🇬', name:'Togo',         currency:'CFA', curr_code:'XOF' },
  { code:'+229', flag:'🇧🇯', name:'Benin',        currency:'CFA', curr_code:'XOF' },
  { code:'+220', flag:'🇬🇲', name:'Gambia',       currency:'D',   curr_code:'GMD' },
  { code:'+224', flag:'🇬🇳', name:'Guinea',       currency:'FG',  curr_code:'GNF' },
  { code:'+232', flag:'🇸🇱', name:'Sierra Leone', currency:'Le',  curr_code:'SLL' },
  { code:'+231', flag:'🇱🇷', name:'Liberia',      currency:'$',   curr_code:'LRD' },
];

const WORK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

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
function LoginScreen({ onLogin, onSignUp }) {
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (authError) throw authError;
      const { data: emp, error: empError } = await supabase
        .from("employees").select("*")
        .eq("auth_user_id", data.user.id).maybeSingle();
      if (empError || !emp) throw new Error("Employee profile not found. Contact your admin.");
      onLogin(emp);
    } catch (e) {
      setError(e.message || "Login failed");
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!email.trim()) { setError("Enter your email first."); return; }
    setLoading(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (resetErr) setError(resetErr.message);
    else setResetSent(true);
  };

  return (
    <div className="login-wrap fade-in">
      <div className="login-card">
        <div style={{textAlign:"center",marginBottom:24}}>
          <div className="login-logo">Attend<span>AI</span></div>
          <div className="login-sub">AI-Powered Workforce Attendance</div>
        </div>
        {error && <div className="error-box">⚠ {error}</div>}
        {resetSent && <div className="success-box">✓ Password reset email sent. Check your inbox.</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        </div>
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:13,fontSize:15,marginBottom:12}} onClick={handleLogin} disabled={loading}>
          {loading ? <><span className="spinner"/>&nbsp;Signing in…</> : "Sign In →"}
        </button>
        <button className="btn btn-ghost" style={{width:"100%",justifyContent:"center",padding:13,fontSize:15,marginBottom:16}} onClick={onSignUp}>
          New Employee? Sign Up
        </button>
        <div style={{textAlign:"center"}}>
          <span style={{fontSize:12,color:"var(--primary)",cursor:"pointer",fontWeight:600}} onClick={handleReset}>
            Forgot password?
          </span>
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--text3)"}}>
          AttendAI · Secured with Supabase Auth
        </div>
      </div>
    </div>
  );
}

// ── SIGN UP SCREEN ────────────────────────────────────────────
function SignUpScreen({ onBack, onSignedUp }) {
  const [step, setStep]       = useState("form"); // form | enrolled
  const [form, setForm]       = useState({ full_name:"", email:"", pw:"", pw2:"", country_code:"+234", phone:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSignUp = async () => {
    setError("");
    if (!form.full_name.trim()) { setError("Please enter your full name."); return; }
    if (!form.email.trim())     { setError("Please enter your email."); return; }
    if (form.pw.length < 6)     { setError("Password must be at least 6 characters."); return; }
    if (form.pw !== form.pw2)   { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      // 1. Create auth account
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.pw,
      });
      if (authErr) throw authErr;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Signup failed. Please try again.");

      // 2. Check if admin already created an employee record for this email
      const { data: existing } = await supabase.from("employees")
        .select("id").eq("email", form.email.trim().toLowerCase()).maybeSingle();

      if (existing) {
        // Link auth user to existing employee record
        await supabase.from("employees").update({ auth_user_id: userId })
          .eq("id", existing.id);
      } else {
        // Create new employee record (pending admin approval)
        await supabase.from("employees").insert({
          auth_user_id: userId,
          full_name:    form.full_name.trim(),
          email:        form.email.trim().toLowerCase(),
          phone:        form.phone ? form.country_code + form.phone : null,
          role:         "employee",
          is_active:    true,
          face_enrolled: false,
        });
      }

      // 3. Sign in immediately
      await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.pw });

      // 4. Fetch profile and proceed to face enrollment
      const { data: emp } = await supabase.from("employees").select("*")
        .eq("auth_user_id", userId).maybeSingle();
      if (emp) onSignedUp(emp);
    } catch(e) {
      setError(e.message || "Signup failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-wrap fade-in">
      <div className="login-card" style={{maxWidth:420,width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <button onClick={onBack} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--text2)"}}>←</button>
          <div>
            <div className="login-logo" style={{fontSize:20}}>Attend<span>AI</span></div>
            <div style={{fontSize:12,color:"var(--text2)"}}>Create your account</div>
          </div>
        </div>
        {error && <div className="error-box">⚠ {error}</div>}
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" placeholder="Enter your full name" value={form.full_name} onChange={e=>set("full_name",e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <div className="phone-input-wrap">
            <select className="phone-code-select" value={form.country_code} onChange={e=>set("country_code",e.target.value)}>
              {WA_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <input className="phone-number-input" placeholder="Enter mobile number" value={form.phone} onChange={e=>set("phone",e.target.value.replace(/\D/g,""))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={e=>set("email",e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Password *</label>
          <input className="form-input" type="password" placeholder="Min. 6 characters" value={form.pw} onChange={e=>set("pw",e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm Password *</label>
          <input className="form-input" type="password" placeholder="Repeat password" value={form.pw2} onChange={e=>set("pw2",e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSignUp()} />
        </div>
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:13,fontSize:15,marginBottom:12}} onClick={handleSignUp} disabled={loading}>
          {loading ? <><span className="spinner"/>&nbsp;Creating Account…</> : "Create Account →"}
        </button>
        <div style={{textAlign:"center",fontSize:12,color:"var(--text3)"}}>
          Already have an account?{" "}
          <span style={{color:"var(--primary)",fontWeight:600,cursor:"pointer"}} onClick={onBack}>Sign In</span>
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

  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmNextIn, setAlarmNextIn] = useState(0);
  const alarmIntervalRef = useRef(null);
  const alarmCountRef    = useRef(null);
  const audioCtxRef      = useRef(null);

  // Play alarm sound using Web Audio API
  const playAlarmSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const freqs = [880, 1100, 880, 1100];
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.18);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.2);
      });
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    } catch(e) { console.log('Audio error:', e); }
  };

  const stopAlarm = () => {
    setAlarmActive(false);
    clearInterval(alarmIntervalRef.current);
    clearInterval(alarmCountRef.current);
  };

  useEffect(() => {
    // Check if already clocked in today
    const today = new Date().toISOString().slice(0,10);
    supabase.from("clock_ins").select("*").eq("employee_id", employee.id).eq("work_date", today).maybeSingle()
      .then(({data}) => { if (data) setTodayRecord(data); });
    loadFaceModels();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [employee.id]);

  // Alarm scheduler — fires at shift start, repeats every 5 mins until clocked in
  useEffect(() => {
    if (todayRecord) { stopAlarm(); return; } // already clocked in

    const shift = employee.shifts;
    const [sh, sm] = (shift?.start_time || '09:00').split(':').map(Number);

    const checkAlarm = () => {
      if (todayRecord) { stopAlarm(); return; }
      const now = new Date();
      const shiftStart = new Date(now);
      shiftStart.setHours(sh, sm, 0, 0);
      const diff = now - shiftStart; // ms since shift start
      // Trigger if past shift start and not yet clocked in
      if (diff >= 0 && !todayRecord) {
        setAlarmActive(true);
        playAlarmSound();
      }
    };

    // Check every minute
    const ticker = setInterval(checkAlarm, 60000);
    checkAlarm(); // check immediately on mount

    // Repeat alarm every 5 minutes
    alarmIntervalRef.current = setInterval(() => {
      if (!todayRecord) { setAlarmActive(true); playAlarmSound(); }
    }, 5 * 60 * 1000);

    // Countdown timer
    let secs = 300;
    alarmCountRef.current = setInterval(() => {
      secs -= 1;
      if (secs <= 0) secs = 300;
      setAlarmNextIn(secs);
    }, 1000);

    return () => {
      clearInterval(ticker);
      clearInterval(alarmIntervalRef.current);
      clearInterval(alarmCountRef.current);
    };
  }, [todayRecord, employee.shifts]);

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
      stopAlarm();
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

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="clockin-wrap fade-in">
      {alarmActive && (
        <div className="alarm-overlay">
          <div className="alarm-card">
            <div className="alarm-pulse">🔔</div>
            <div className="alarm-title">Resumption Reminder!</div>
            <div className="alarm-sub">Your shift has started. Please clock in now.</div>
            <div className="alarm-timer">{fmt(alarmNextIn)}</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:15,padding:14}}
                onClick={() => { stopAlarm(); document.getElementById('clockin-btn')?.click(); }}>
                📸 Clock In Now
              </button>
              <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',fontSize:12}}
                onClick={stopAlarm}>
                Dismiss (alarm repeats in 5 min)
              </button>
            </div>
          </div>
        </div>
      )}
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
              id="clockin-btn" disabled={stage==="scanning"}
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
function AdminDashboard({ employees, clockIns, setPage, pendingOverrides }) {
  const present = clockIns.filter(c=>c.status==="present"||c.status==="late").length;
  const late    = clockIns.filter(c=>c.is_late).length;
  const absent  = Math.max(0, employees.length - present);
  const flagged = clockIns.filter(c=>c.buddy_punch_flag).length;
  const today   = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});

  return (
    <div className="fade-in">
      {/* Header greeting */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>{today}</div>
        <div style={{fontFamily:'var(--display)',fontSize:18,fontWeight:800,color:'var(--text)',marginTop:2}}>Attendance Overview</div>
      </div>

      {/* 4 stat cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">✅</div>
          <div className="stat-label">Present</div>
          <div className="stat-value blue">{present}</div>
          <div className="stat-sub">of {employees.length} staff</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">⏰</div>
          <div className="stat-label">Late</div>
          <div className="stat-value amber">{late}</div>
          <div className="stat-sub">today</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">❌</div>
          <div className="stat-label">Absent</div>
          <div className="stat-value red">{absent}</div>
          <div className="stat-sub">no check-in</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">🤖</div>
          <div className="stat-label">AI Flags</div>
          <div className="stat-value" style={{color:flagged>0?'var(--red)':'var(--green)',fontFamily:'var(--display)',fontSize:22,fontWeight:800}}>{flagged}</div>
          <div className="stat-sub">buddy punch</div>
        </div>
      </div>

      {/* Quick action tiles */}
      <div style={{marginBottom:6,fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Quick Actions</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
        <div className="qa-tile" onClick={()=>setPage('clockin')}>
          <div className="qa-icon">📸</div>
          <div className="qa-label">Clock In</div>
        </div>
        <div className="qa-tile" onClick={()=>setPage('employees')}>
          <div className="qa-icon">👥</div>
          <div className="qa-label">Employees</div>
        </div>
        <div className="qa-tile" onClick={()=>setPage('overrides')} style={{position:'relative'}}>
          <div className="qa-icon">📍</div>
          <div className="qa-label">GPS Override</div>
          {pendingOverrides>0 && <span style={{position:'absolute',top:6,right:6,background:'var(--red)',color:'white',fontSize:9,fontWeight:700,padding:'1px 4px',borderRadius:10}}>{pendingOverrides}</span>}
        </div>
      </div>

      {/* Live feed */}
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div className="card-title" style={{marginBottom:0}}>Live Feed</div>
          <div className="live-dot">Live</div>
        </div>
        {clockIns.length === 0 ? (
          <div className="empty"><div className="icon">📋</div>No clock-ins yet today.</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {clockIns.slice(0,8).map(c => {
              const emp = employees.find(e=>e.id===c.employee_id);
              return (
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div className="avatar">{emp?.full_name?.slice(0,2).toUpperCase()||'??'}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{emp?.full_name||'Unknown'}</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>{new Date(c.clock_in_time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} · {c.gps_status==='on_site'?'On-site':'Off-site'}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                    <span className={`badge ${c.is_late?'late':'present'}`}>{c.is_late?'Late':'Present'}</span>
                    {c.buddy_punch_flag && <span className="ai-flag">⚠ Flag</span>}
                  </div>
                </div>
              );
            })}
          </div>
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


// ── PROFILE DROPDOWN ─────────────────────────────────────────
function ProfileDropdown({ employee, onLogout, onNavigate, onClose }) {
  return (
    <div className="profile-dropdown">
      <div className="pd-header">
        <div className="pd-name">{employee.full_name}</div>
        <div className="pd-role">{employee.role}</div>
        <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{employee.email}</div>
      </div>
      <div className="pd-item" onClick={()=>{onNavigate('account');onClose();}}>👤 My Account</div>
      {(employee.role==='admin'||employee.role==='superadmin') && <>
        <div className="pd-item" onClick={()=>{onNavigate('addemployee');onClose();}}>➕ Add Employee</div>
        <div className="pd-item" onClick={()=>{onNavigate('addshift');onClose();}}>🕐 Add Shift</div>
        <div className="pd-item" onClick={()=>{onNavigate('payroll');onClose();}}>💰 Payroll</div>
        <div className="pd-item" onClick={()=>{onNavigate('reports');onClose();}}>📊 Reports</div>
      </>}
      <div className="pd-item" onClick={()=>{onNavigate('settings');onClose();}}>⚙️ Settings</div>
      <div className="pd-item danger" onClick={onLogout}>🚪 Sign Out</div>
    </div>
  );
}

// ── ACCOUNT PAGE (SuperManage style) ─────────────────────────
function AccountScreen({ employee, onNavigate, onLogout }) {
  const initials = employee.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const isAdmin = employee.role==='admin'||employee.role==='superadmin';

  const Item = ({icon, title, sub, page, danger}) => (
    <div className={`account-item${danger?' danger':''}`} onClick={()=>onNavigate(page)}>
      <div className="account-item-icon">{icon}</div>
      <div className="account-item-info">
        <div className="account-item-title">{title}</div>
        {sub && <div className="account-item-sub">{sub}</div>}
      </div>
      <div className="account-item-arrow">›</div>
    </div>
  );

  const Section = ({title, children}) => (
    <div className="account-section">
      <div className="account-section-title">{title}</div>
      <div style={{borderRadius:12,overflow:'hidden',border:'1px solid var(--border)',boxShadow:'var(--shadow)',background:'white'}}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{background:'white',borderRadius:14,padding:'20px 16px',textAlign:'center',marginBottom:12,boxShadow:'var(--shadow)',border:'1px solid var(--border)'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'var(--primary)',color:'white',fontSize:22,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>{initials}</div>
        <div style={{fontFamily:'var(--display)',fontSize:17,fontWeight:800}}>{employee.full_name}</div>
        <div style={{fontSize:11,color:'var(--primary)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginTop:3}}>{employee.role}</div>
      </div>

      <Section title="Account">
        <Item icon="✏️" title="Edit Profile" sub="Update your personal information" page="editprofile" />
        <Item icon="💎" title="Pricing & Plans" sub="View and upgrade your plan" page="pricing" />
      </Section>

      {isAdmin && (
        <Section title="Business Configuration">
          <Item icon="👤" title="User Management" sub="Manage admin and supervisor roles" page="usermgmt" />
          <Item icon="📱" title="Employee App Options" sub="Control what employees can access" page="empoptions" />
          <Item icon="🕐" title="Work Shift Settings" sub="Create and manage work shifts" page="shifts" />
          <Item icon="🏢" title="Businesses" sub="Manage your organisations" page="businesses" />
          <Item icon="🚫" title="Inactive Employees" sub="View deactivated staff" page="inactive" />
          <Item icon="🗂️" title="Department" sub="Manage departments" page="departments" />
          <Item icon="✉️" title="Invites" sub="Pending employee invitations" page="invites" />
        </Section>
      )}

      <Section title="Notification Settings">
        <Item icon="🔔" title="Notification Settings" sub="Manage your alerts" page="notifSettings" />
      </Section>

      {isAdmin && (
        <Section title="Attendance Settings">
          <Item icon="📋" title="Attendance Settings" sub="Reminders, absent rules, editing restrictions" page="attendanceSettings" />
        </Section>
      )}

      {isAdmin && (
        <Section title="Payroll Setting">
          <Item icon="💰" title="Payroll Settings" sub="Cycle dates and calculation rules" page="payrollSettings" />
        </Section>
      )}

      <Section title="Others">
        <Item icon="🌐" title="Language" sub="English" page="language" />
        <Item icon="🔗" title="Share App" sub="Invite others to AttendAI" page="share" />
        <Item icon="📄" title="Privacy Policy" sub="Read our privacy policy" page="privacy" />
        <div className="account-item danger" onClick={onLogout}>
          <div className="account-item-icon">🚪</div>
          <div className="account-item-info"><div className="account-item-title">Logout</div></div>
          <div className="account-item-arrow">›</div>
        </div>
      </Section>

      <div style={{textAlign:'center',padding:'16px 0 8px',fontSize:11,color:'var(--text3)'}}>
        AttendAI v1.0.0
      </div>
    </div>
  );
}

// ── EDIT PROFILE PAGE ────────────────────────────────────────
function ProfileScreen({ employee, onSaved }) {
  const [form, setForm] = useState({
    full_name: employee.full_name,
    phone:     employee.phone||'',
    country_code: '+234',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const initials = form.full_name.split(' ').filter(Boolean).map(n=>n[0]).join('').slice(0,2).toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('employees').update({
      full_name: form.full_name.trim(),
      phone:     form.phone ? form.country_code+form.phone : null,
    }).eq('id', employee.id);
    setSaving(false);
    if (!error) { setSaved(true); setTimeout(()=>setSaved(false),2500); }
  };

  return (
    <div className="fade-in">
      <div style={{textAlign:'center',padding:'20px 0 16px'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'var(--primary)',color:'white',fontSize:22,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>{initials||'?'}</div>
      </div>
      {saved && <div className="success-box">✓ Profile updated successfully.</div>}
      <div className="card" style={{marginBottom:12}}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="Your full name" />
        </div>
        <div className="form-group">
          <label className="form-label">Email ID</label>
          <div style={{position:'relative'}}>
            <input className="form-input" value={employee.email} readOnly style={{background:'var(--bg3)',paddingRight:40,color:'var(--text2)'}} />
            <span style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',color:'var(--green)',fontSize:18}}>✓</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Country</label>
          <select className="form-select" value={form.country_code} onChange={e=>set('country_code',e.target.value)}>
            {WA_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{marginBottom:0}}>
          <label className="form-label">Mobile Number</label>
          <div className="phone-input-wrap">
            <select className="phone-code-select" value={form.country_code} onChange={e=>set('country_code',e.target.value)}>
              {WA_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <input className="phone-number-input" placeholder="Enter mobile number" value={form.phone} onChange={e=>set('phone',e.target.value.replace(/\D/g,''))} />
          </div>
        </div>
      </div>

      <div style={{borderRadius:12,overflow:'hidden',border:'1px solid var(--border)',background:'white',marginBottom:20}}>
        <div className="account-item danger" onClick={()=>setShowDelete(true)}>
          <div className="account-item-icon">🗑️</div>
          <div className="account-item-info"><div className="account-item-title">Delete Account</div></div>
          <div className="account-item-arrow">›</div>
        </div>
      </div>

      {showDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',z:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:320,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <div style={{fontFamily:'var(--display)',fontSize:17,fontWeight:800,marginBottom:8}}>Delete Account?</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>This action cannot be undone. All your data will be permanently removed.</div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowDelete(false)}>Cancel</button>
              <button className="btn btn-danger" style={{flex:1,justifyContent:'center'}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15}} onClick={handleSave} disabled={saving}>
        {saving ? <><span className="spinner"/>&nbsp;Saving…</> : 'Continue'}
      </button>
    </div>
  );
}

// ── PRICING & PLANS ───────────────────────────────────────────
function PricingScreen() {
  const [selected, setSelected] = useState('quarterly');
  const [form, setForm] = useState({ company:'', phone:'', address:'', state:'', coupon:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const plans = [
    { id:'quarterly', label:'Quarterly Plan', price:'₦120,000',  original:null,        discount:null },
    { id:'yearly',    label:'Yearly Plan',    price:'₦384,000',  original:'₦480,000',  discount:'20% OFF' },
    { id:'threeyear', label:'3 Yearly Plan',  price:'₦1,008,000',original:'₦1,440,000',discount:'30% OFF' },
  ];
  const cur = plans.find(p=>p.id===selected);

  return (
    <div className="fade-in">
      {/* Plan selector */}
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {plans.map(p=>(
          <div key={p.id} className={`plan-card ${selected===p.id?'selected':''}`} onClick={()=>setSelected(p.id)}>
            {p.discount && <div className="plan-badge">{p.discount}</div>}
            {p.original && <div className="plan-original">{p.original}</div>}
            <div className="plan-price">{p.price}</div>
            <div className="plan-label">{p.label}</div>
          </div>
        ))}
      </div>

      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8,color:'var(--primary)',fontWeight:600,fontSize:13,marginBottom:16}}>
          📋 View All Plan Features
        </div>

        <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:700,marginBottom:12}}>Contact Detail</div>
        <div className="form-group">
          <input className="form-input" placeholder="Company Name *" value={form.company} onChange={e=>set('company',e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <div className="phone-input-wrap">
            <select className="phone-code-select"><option>🇳🇬 +234</option></select>
            <input className="phone-number-input" placeholder="Enter mobile number" value={form.phone} onChange={e=>set('phone',e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <input className="form-input" placeholder="Email ID (Optional)" value={form.email||''} onChange={e=>set('email',e.target.value)} />
        </div>

        <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:700,margin:'16px 0 12px'}}>Billing Address</div>
        <div className="form-group"><input className="form-input" placeholder="Address" value={form.address} onChange={e=>set('address',e.target.value)} /></div>
        <div className="form-group"><input className="form-input" placeholder="Country" defaultValue="Nigeria" /></div>
        <div className="form-group"><input className="form-input" placeholder="State / Province" value={form.state} onChange={e=>set('state',e.target.value)} /></div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:700}}>Coupons</div>
          <span style={{color:'var(--primary)',fontSize:12,fontWeight:600}}>View All</span>
        </div>
        <div style={{fontSize:13,color:'var(--text2)',marginBottom:8}}>Have a coupon code?</div>
        <div style={{display:'flex',gap:10,marginBottom:20}}>
          <input className="form-input" placeholder="Enter coupon code" style={{flex:1}} value={form.coupon} onChange={e=>set('coupon',e.target.value)} />
          <button className="btn btn-primary" style={{padding:'11px 18px'}}>Apply</button>
        </div>

        <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:20}}>
          <div style={{fontFamily:'var(--display)',fontSize:14,fontWeight:700,marginBottom:12}}>Purchase Summary</div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
            <span>Base Price</span><span style={{fontWeight:600}}>{cur.price}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0 0',fontSize:14,fontWeight:700}}>
            <span>Total Amount:</span><span style={{color:'var(--primary)'}}>{cur.price}</span>
          </div>
        </div>
        <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',marginBottom:16}}>
          By continuing, you agree to our <span style={{color:'var(--primary)'}}>T&C</span> and <span style={{color:'var(--primary)'}}>Privacy Policy</span>
        </div>
      </div>

      <div style={{position:'sticky',bottom:70,background:'white',padding:'10px 0',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:11,color:'var(--text3)'}}>Total Amount:</div>
          <div style={{fontFamily:'var(--display)',fontSize:18,fontWeight:800,color:'var(--primary)'}}>{cur.price}</div>
        </div>
        <button className="btn btn-primary" style={{padding:'12px 24px',fontSize:14}}>Continue to Payment</button>
      </div>
    </div>
  );
}

// ── USER MANAGEMENT (Premium Features) ───────────────────────
function UserMgmtScreen() {
  const features = [
    'Desktop Access','Cashbook Access','Fine Access','Vehicle Management Access',
    'User Management Access','Employee Documents Access','Payslip Access',
    'Punch In/Out Access','Employee App','Inventory Management Access',
    'Expense Management','Advance Access','CRM Lite','Add Employees','Business Broadcast',
  ];
  return (
    <div className="fade-in">
      <div style={{background:'linear-gradient(160deg,#EBF0FF,#E0ECFF)',borderRadius:14,padding:20,textAlign:'center',marginBottom:20,border:'1px solid var(--border)'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:28}}>💎</div>
        <div style={{fontFamily:'var(--display)',fontSize:17,fontWeight:800,marginBottom:6}}>AttendAI Premium</div>
        <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.5}}>Get 7 days free access to our premium features and explore how AttendAI simplifies your business operations</div>
      </div>
      <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:700,marginBottom:12}}>Our premium features</div>
      <div className="card" style={{marginBottom:20}}>
        {features.map(f=>(
          <div key={f} className="feature-item">
            <div className="feature-check">✓</div>
            <span>{f}</span>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,paddingBottom:20}}>
        <button className="btn btn-ghost" style={{flex:1,justifyContent:'center',padding:14}}>View All Plans</button>
        <button className="btn btn-primary" style={{flex:1,justifyContent:'center',padding:14}}>Start 7 Days Trial</button>
      </div>
    </div>
  );
}

// ── EMPLOYEE APP OPTIONS ──────────────────────────────────────
function EmpOptionsScreen({ settings, onSaved }) {
  const [opts, setOpts] = useState({
    overtime:true, business_expense:true, approve_expense:false,
    vehicle_mgmt:true, payroll:false, leave:false, holidays:false, attendance:false,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const toggle = k => setOpts(o=>({...o,[k]:!o[k]}));

  const items = [
    {key:'overtime',        label:'OverTime'},
    {key:'business_expense',label:'Business Expense'},
    {key:'approve_expense', label:'Approve Expense'},
    {key:'vehicle_mgmt',    label:'Vehicle Management'},
    {key:'payroll',         label:'Payroll'},
    {key:'leave',           label:'Leave'},
    {key:'holidays',        label:'Holidays'},
    {key:'attendance',      label:'Attendance'},
  ];

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('app_settings').update({ emp_options: opts }).eq('id',1);
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  return (
    <div className="fade-in">
      {saved && <div className="success-box">✓ Employee app options saved.</div>}
      <div className="card" style={{marginBottom:20}}>
        {items.map(item=>(
          <div key={item.key} className="check-item">
            <span style={{color:opts[item.key]?'var(--text)':'var(--text3)'}}>{item.label}</span>
            <div className={`checkbox ${opts[item.key]?'checked':''}`} onClick={()=>toggle(item.key)}>
              {opts[item.key] && '✓'}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15}} onClick={handleSave} disabled={saving}>
        {saving ? <><span className="spinner"/>&nbsp;Saving…</> : 'Save'}
      </button>
    </div>
  );
}

// ── WORK SHIFTS SCREEN ────────────────────────────────────────
function ShiftsScreen({ onAddNew }) {
  const [shifts, setShifts]   = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    supabase.from('shifts').select('*').order('name').then(({data})=>{ setShifts(data||[]); setLoading(false); });
  };
  useEffect(()=>load(),[]);

  const deleteShift = async (id) => {
    await supabase.from('shifts').delete().eq('id',id);
    load();
  };

  const filtered = shifts.filter(s=>s.name.toLowerCase().includes(search.toLowerCase()));

  const fmt = t => {
    if (!t) return '';
    const [h,m] = t.split(':').map(Number);
    const ampm = h>=12?'PM':'AM';
    return `${((h%12)||12).toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${ampm}`;
  };

  return (
    <div className="fade-in">
      <div className="search-bar" style={{marginBottom:16}}>
        <span>🔍</span>
        <input placeholder="Search Employee Shifts" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {loading ? <div className="empty"><span className="spinner"/></div> :
       filtered.length===0 ? (
         <div className="empty-state"><div className="es-icon">🕐</div><div className="es-title">No shifts found</div></div>
       ) : filtered.map(s=>(
        <div key={s.id} className="shift-card">
          <div className="shift-card-top">
            <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:700}}>{s.name}</div>
            <span className="shift-active-badge">Active</span>
          </div>
          <div className="shift-days">Mon, Tue, Wed, Thu, Fri</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="shift-time">{fmt(s.start_time)} – {fmt(s.end_time)}</div>
            <div className="shift-actions">
              <button className="btn btn-ghost" style={{padding:'6px 10px',fontSize:13}} onClick={()=>{}}>✏️</button>
              <button className="btn btn-danger" style={{padding:'6px 10px',fontSize:13}} onClick={()=>deleteShift(s.id)}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
      <button className="fab" onClick={onAddNew}>+</button>
    </div>
  );
}

// ── BUSINESSES SCREEN ─────────────────────────────────────────
function BusinessesScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({name:'', industry:''});
  const [businesses, setBusinesses] = useState([
    {id:1, name:'My Company', industry:'Technology'},
  ]);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const add = () => {
    if (!form.name.trim()) return;
    setBusinesses(b=>[...b,{id:Date.now(),...form}]);
    setForm({name:'',industry:''}); setShowAdd(false);
  };

  return (
    <div className="fade-in">
      <div style={{color:'var(--primary)',fontWeight:600,fontSize:14,marginBottom:16,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}} onClick={()=>setShowAdd(true)}>
        + Add new business
      </div>
      <div style={{borderBottom:'1px solid var(--border)'}} />
      <div style={{marginTop:8}}>
        {businesses.map(b=>(
          <div key={b.id} className="biz-card">
            <div className="biz-icon">🏢</div>
            <div className="biz-info">
              <div className="biz-name">{b.name}</div>
              <div className="biz-type">{b.industry}</div>
            </div>
            <div style={{color:'var(--text3)',fontSize:20,cursor:'pointer'}}>···</div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:24,width:'100%'}}>
            <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,marginBottom:16}}>Add New Business</div>
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input className="form-input" placeholder="e.g. Tech World Ltd" value={form.name} onChange={e=>set('name',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Industry</label>
              <input className="form-input" placeholder="e.g. Information Technology" value={form.industry} onChange={e=>set('industry',e.target.value)} />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={add}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── INACTIVE EMPLOYEES ────────────────────────────────────────
function InactiveScreen({ employees }) {
  const inactive = employees.filter(e=>!e.is_active);
  return (
    <div className="fade-in">
      {inactive.length===0 ? (
        <div className="empty-state">
          <div className="es-icon">👤</div>
          <div className="es-title">No Inactive Employees</div>
        </div>
      ) : inactive.map(e=>(
        <div key={e.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
          <div className="avatar">{e.full_name.slice(0,2).toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:13}}>{e.full_name}</div>
            <div style={{fontSize:11,color:'var(--text3)'}}>{e.email}</div>
          </div>
          <button className="btn btn-ghost" style={{fontSize:11,padding:'5px 10px'}}>Reactivate</button>
        </div>
      ))}
    </div>
  );
}

// ── DEPARTMENTS SCREEN ────────────────────────────────────────
function DepartmentsScreen() {
  const [depts, setDepts]     = useState([]);
  const [search, setSearch]   = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newDept, setNewDept] = useState('');

  const load = () => supabase.from('departments').select('*').order('name').then(({data})=>setDepts(data||[]));
  useEffect(()=>load(),[]);

  const add = async () => {
    if (!newDept.trim()) return;
    await supabase.from('departments').insert({name:newDept.trim()});
    setNewDept(''); setShowAdd(false); load();
  };

  const del = async (id) => {
    await supabase.from('departments').delete().eq('id',id);
    load();
  };

  const filtered = depts.filter(d=>d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade-in">
      <div className="search-bar" style={{marginBottom:16}}>
        <span>🔍</span>
        <input placeholder="Search Department" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      <div className="card">
        {filtered.length===0 ? <div className="empty-state"><div className="es-icon">🗂️</div><div className="es-title">No departments</div></div> :
         filtered.map(d=>(
          <div key={d.id} className="dept-row">
            <span>{d.name}</span>
            <span style={{color:'var(--text3)',fontSize:18,cursor:'pointer'}} onClick={()=>del(d.id)}>···</span>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:24,width:'100%'}}>
            <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,marginBottom:16}}>Add Department</div>
            <div className="form-group">
              <label className="form-label">Department Name</label>
              <input className="form-input" placeholder="e.g. Marketing" value={newDept} onChange={e=>setNewDept(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={add}>Add</button>
            </div>
          </div>
        </div>
      )}
      <button className="fab" onClick={()=>setShowAdd(true)}>+</button>
    </div>
  );
}

// ── INVITES SCREEN ────────────────────────────────────────────
function InvitesScreen({ employees }) {
  // Employees with no auth_user_id haven't accepted invite yet
  const pending = employees.filter(e=>!e.auth_user_id);
  return (
    <div className="fade-in">
      {pending.length===0 ? (
        <div className="empty-state">
          <div className="es-icon">✉️</div>
          <div className="es-title">No Pending Invites</div>
        </div>
      ) : pending.map(e=>(
        <div key={e.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
          <div className="avatar">{e.full_name.slice(0,2).toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:13}}>{e.full_name}</div>
            <div style={{fontSize:11,color:'var(--text3)'}}>{e.email}</div>
          </div>
          <span className="badge late">Pending</span>
        </div>
      ))}
    </div>
  );
}

// ── PLACEHOLDER SCREEN ────────────────────────────────────────
function PlaceholderScreen({ title }) {
  return (
    <div className="fade-in">
      <div className="empty-state">
        <div className="es-icon">🚧</div>
        <div className="es-title">{title}</div>
        <div style={{fontSize:13,color:'var(--text3)',marginTop:8}}>Coming soon</div>
      </div>
    </div>
  );
}

// ── ADD SHIFT SCREEN ──────────────────────────────────────────
function AddShiftScreen({ onSuccess }) {
  const [form, setForm] = useState({ name:'', start_time:'09:00', end_time:'18:00', grace_mins:'10' });
  const [workDays, setWorkDays] = useState(['Mon','Tue','Wed','Thu','Fri']);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const toggleDay = (d) => setWorkDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d]);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Shift name is required.'); return; }
    setSaving(true); setError('');
    try {
      const { error: dbErr } = await supabase.from('shifts').insert({
        name:       form.name.trim(),
        start_time: form.start_time,
        end_time:   form.end_time,
        grace_mins: parseInt(form.grace_mins)||10,
      });
      if (dbErr) throw dbErr;
      setSuccess(true);
      setTimeout(()=>{ setSuccess(false); setForm({name:'',start_time:'09:00',end_time:'18:00',grace_mins:'10'}); setWorkDays(['Mon','Tue','Wed','Thu','Fri']); onSuccess?.(); }, 2000);
    } catch(e) { setError(e.message); } finally { setSaving(false); }
  };

  if (success) return (
    <div className="fade-in" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <div style={{fontFamily:'var(--display)',fontSize:20,fontWeight:800,color:'var(--green)'}}>Shift Added!</div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      {error && <div className="error-box">⚠ {error}</div>}
      <div className="card">
        <div className="form-section-title">Shift Details</div>
        <div className="form-group">
          <label className="form-label">Shift Name *</label>
          <input className="form-input" placeholder="e.g. Morning Shift" value={form.name} onChange={e=>set('name',e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input className="form-input" type="time" value={form.start_time} onChange={e=>set('start_time',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">End Time</label>
            <input className="form-input" type="time" value={form.end_time} onChange={e=>set('end_time',e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Grace Period (minutes)</label>
          <input className="form-input" type="number" min="0" max="60" value={form.grace_mins} onChange={e=>set('grace_mins',e.target.value)} />
        </div>

        <div className="form-section-title">Working Days</div>
        <div className="days-grid" style={{marginBottom:20}}>
          {WORK_DAYS.map(d=>(
            <button key={d} className={`day-btn ${workDays.includes(d)?'active':''}`} onClick={()=>toggleDay(d)}>{d}</button>
          ))}
        </div>

        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:14}} onClick={handleSubmit} disabled={saving}>
          {saving ? <><span className="spinner"/>&nbsp;Saving…</> : '🕐 Add Shift'}
        </button>
      </div>
    </div>
  );
}

// ── ADD EMPLOYEE SCREEN ───────────────────────────────────────
function AddEmployeeScreen({ onSuccess }) {
  const [form, setForm] = useState({
    full_name:'', email:'', phone:'', country_code:'+234',
    role:'employee', gps_policy:'office_only',
    salary_type:'monthly', salary_amount:'', hourly_rate_ngn:'2500',
    allowed_leaves:'2', joining_date: new Date().toISOString().slice(0,10),
  });
  const [workDays, setWorkDays] = useState(['Mon','Tue','Wed','Thu','Fri']);
  const [depts, setDepts]   = useState([]);
  const [shifts, setShifts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(()=>{
    supabase.from('departments').select('*').order('name').then(({data})=>setDepts(data||[]));
    supabase.from('shifts').select('*').order('name').then(({data})=>setShifts(data||[]));
  },[]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleDay = (d) => setWorkDays(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d]);
  const country = WA_COUNTRIES.find(c=>c.code===form.country_code)||WA_COUNTRIES[0];

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError('Full name is required.'); return; }
    if (!form.email.trim())     { setError('Email is required.'); return; }
    setSaving(true); setError('');
    try {
      // Try to send invite email (works if admin has service role, gracefully fails otherwise)
      try {
        await supabase.auth.admin?.inviteUserByEmail(form.email.trim().toLowerCase());
      } catch(_){}
      const { error: dbErr } = await supabase.from('employees').insert({
        full_name:       form.full_name.trim(),
        email:           form.email.trim().toLowerCase(),
        phone:           form.phone ? form.country_code+form.phone : null,
        role:            form.role,
        department_id:   form.department_id||null,
        shift_id:        form.shift_id||null,
        hourly_rate_ngn: parseInt(form.hourly_rate_ngn)||2500,
        gps_policy:      form.gps_policy,
        is_active:       true,
      });
      if (dbErr) throw dbErr;
      setSuccess(true);
      setTimeout(()=>{ setSuccess(false); setForm({full_name:'',email:'',phone:'',country_code:'+234',role:'employee',gps_policy:'office_only',salary_type:'monthly',salary_amount:'',hourly_rate_ngn:'2500',allowed_leaves:'2',joining_date:new Date().toISOString().slice(0,10)}); setWorkDays(['Mon','Tue','Wed','Thu','Fri']); onSuccess?.(); }, 2000);
    } catch(e) { setError(e.message||'Failed to add employee'); } finally { setSaving(false); }
  };

  if (success) return (
    <div className="fade-in" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <div style={{fontFamily:'var(--display)',fontSize:20,fontWeight:800,color:'var(--green)'}}>Employee Added!</div>
        <div style={{fontSize:13,color:'var(--text2)',marginTop:8}}>They will enroll their face on first login.</div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      {error && <div className="error-box">⚠ {error}</div>}
      <div className="card" style={{marginBottom:12}}>
        <div className="form-section-title">Employee Details</div>
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" placeholder="Enter employee name" value={form.full_name} onChange={e=>set('full_name',e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <div className="phone-input-wrap">
            <select className="phone-code-select" value={form.country_code} onChange={e=>set('country_code',e.target.value)}>
              {WA_COUNTRIES.map(c=>(
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <input className="phone-number-input" placeholder="Enter mobile number" value={form.phone} onChange={e=>set('phone',e.target.value.replace(/\D/g,''))} />
          </div>
          <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{country.flag} {country.name}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" placeholder="Enter email address" value={form.email} onChange={e=>set('email',e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" type="date" value={form.joining_date} onChange={e=>set('joining_date',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Employee Type</label>
            <select className="form-select" value={form.role} onChange={e=>set('role',e.target.value)}>
              <option value="employee">Employee</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-select" value={form.department_id||''} onChange={e=>set('department_id',e.target.value)}>
              <option value="">Select Department</option>
              {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">GPS Policy</label>
            <select className="form-select" value={form.gps_policy} onChange={e=>set('gps_policy',e.target.value)}>
              <option value="office_only">Office Only</option>
              <option value="remote_allowed">Remote OK</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="form-section-title">Payment Details</div>
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {['monthly','daily','hourly'].map(t=>(
            <button key={t} onClick={()=>set('salary_type',t)}
              style={{flex:1,padding:'10px',borderRadius:10,border:'1.5px solid',borderColor:form.salary_type===t?'var(--primary)':'var(--border)',background:form.salary_type===t?'var(--primary-light)':'var(--bg3)',color:form.salary_type===t?'var(--primary)':'var(--text2)',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'var(--body)',textTransform:'capitalize'}}>
              {t}
            </button>
          ))}
        </div>
        <div className="form-group">
          <label className="form-label">Salary per {form.salary_type} ({country.currency})</label>
          <input className="form-input" type="number" placeholder="Enter salary amount" value={form.salary_amount} onChange={e=>set('salary_amount',e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Allowed Leaves/Month</label>
            <input className="form-input" type="number" min="0" value={form.allowed_leaves} onChange={e=>set('allowed_leaves',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Hourly Rate (₦)</label>
            <input className="form-input" type="number" value={form.hourly_rate_ngn} onChange={e=>set('hourly_rate_ngn',e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="form-section-title">Work Schedule</div>
        <div className="form-group">
          <label className="form-label">Select Shift</label>
          <select className="form-select" value={form.shift_id||''} onChange={e=>set('shift_id',e.target.value)}>
            <option value="">Select Shift</option>
            {shifts.map(s=><option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Working Days</label>
          <div className="days-grid">
            {WORK_DAYS.map(d=>(
              <button key={d} className={`day-btn ${workDays.includes(d)?'active':''}`} onClick={()=>toggleDay(d)}>{d}</button>
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:14,marginBottom:20}} onClick={handleSubmit} disabled={saving}>
        {saving ? <><span className="spinner"/>&nbsp;Adding Employee…</> : 'Submit'}
      </button>
    </div>
  );
}

// ── PAYROLL SCREEN ────────────────────────────────────────────
function PayrollScreen({ employees }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    setLoading(true);
    const from = month+'-01', to = month+'-31';
    supabase.from('clock_ins').select('*').gte('work_date',from).lte('work_date',to)
      .then(({data})=>{ setRecords(data||[]); setLoading(false); });
  },[month]);

  const getEmpData = (emp) => {
    const empRecs = records.filter(r=>r.employee_id===emp.id);
    const hours   = empRecs.reduce((s,r)=>s+(r.hours_worked||0),0);
    const lateDays = empRecs.filter(r=>r.is_late).length;
    const rate    = emp.hourly_rate_ngn||2500;
    const gross   = Math.round(hours*rate);
    const lateDed = lateDays*(500);
    const net     = Math.max(0, gross-lateDed);
    return { hours:hours.toFixed(1), lateDays, gross, lateDed, net };
  };

  const totalNet = employees.reduce((s,e)=>s+getEmpData(e).net,0);

  return (
    <div className="fade-in">
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:16}}>
        <input type="month" className="form-input" style={{width:180}} value={month} onChange={e=>setMonth(e.target.value)} />
        <span style={{fontSize:12,color:'var(--text2)'}}>{employees.length} employees</span>
      </div>

      <div className="card" style={{marginBottom:14,background:'linear-gradient(135deg,var(--primary),#1447C0)',border:'none'}}>
        <div style={{color:'rgba(255,255,255,0.7)',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Total Net Payroll</div>
        <div style={{fontFamily:'var(--display)',fontSize:32,fontWeight:800,color:'white',marginTop:4}}>₦{totalNet.toLocaleString()}</div>
        <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:4}}>{month}</div>
      </div>

      {loading ? <div className="empty"><span className="spinner"/></div> : employees.map(emp=>{
        const d = getEmpData(emp);
        const initials = emp.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
        return (
          <div key={emp.id} className="payslip-card">
            <div className="payslip-header">
              <div className="avatar" style={{width:40,height:40,fontSize:15,borderRadius:10}}>{initials}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{emp.full_name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{emp.departments?.name||'—'} · {emp.shifts?.name||'Default'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,color:'var(--primary)'}}>₦{d.net.toLocaleString()}</div>
                <div style={{fontSize:10,color:'var(--green)',fontWeight:600}}>Net Pay</div>
              </div>
            </div>
            <div className="payslip-row"><span style={{color:'var(--text2)'}}>Hours Worked</span><span style={{fontWeight:600}}>{d.hours}h</span></div>
            <div className="payslip-row"><span style={{color:'var(--text2)'}}>Hourly Rate</span><span style={{fontWeight:600}}>₦{(emp.hourly_rate_ngn||2500).toLocaleString()}</span></div>
            <div className="payslip-row"><span style={{color:'var(--text2)'}}>Gross Pay</span><span style={{fontWeight:600}}>₦{d.gross.toLocaleString()}</span></div>
            {d.lateDed>0 && <div className="payslip-row"><span style={{color:'var(--red)'}}>Late Deduction ({d.lateDays}×)</span><span style={{color:'var(--red)',fontWeight:600}}>-₦{d.lateDed.toLocaleString()}</span></div>}
            <div className="payslip-total"><span>Net Pay</span><span style={{color:'var(--primary)'}}>₦{d.net.toLocaleString()}</span></div>
          </div>
        );
      })}
    </div>
  );
}

// ── REPORTS SCREEN ────────────────────────────────────────────
function ReportsScreen({ employees }) {
  const [from, setFrom] = useState(new Date().toISOString().slice(0,8)+'01');
  const [to,   setTo]   = useState(new Date().toISOString().slice(0,10));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    setLoading(true);
    supabase.from('clock_ins').select('*').gte('work_date',from).lte('work_date',to)
      .then(({data})=>{ setRecords(data||[]); setLoading(false); });
  },[from,to]);

  const totalPresent = records.filter(r=>r.status==='present'||r.status==='late').length;
  const totalLate    = records.filter(r=>r.is_late).length;
  const totalFlags   = records.filter(r=>r.buddy_punch_flag).length;
  const totalHours   = records.reduce((s,r)=>s+(r.hours_worked||0),0).toFixed(1);

  return (
    <div className="fade-in">
      <div className="report-filter">
        <div style={{flex:1}}>
          <div className="form-label">From</div>
          <input type="date" className="form-input" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div style={{flex:1}}>
          <div className="form-label">To</div>
          <input type="date" className="form-input" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <div className="report-stat"><div className="report-stat-val">{totalPresent}</div><div className="report-stat-lbl">Present</div></div>
        <div className="report-stat"><div className="report-stat-val" style={{color:'var(--amber)'}}>{totalLate}</div><div className="report-stat-lbl">Late</div></div>
        <div className="report-stat"><div className="report-stat-val" style={{color:'var(--red)'}}>{totalFlags}</div><div className="report-stat-lbl">AI Flags</div></div>
        <div className="report-stat"><div className="report-stat-val" style={{color:'var(--green)'}}>{totalHours}h</div><div className="report-stat-lbl">Hours</div></div>
      </div>

      <div className="card">
        <div className="card-title">Employee Summary</div>
        {loading ? <div className="empty"><span className="spinner"/></div> :
        employees.map(emp=>{
          const empRecs  = records.filter(r=>r.employee_id===emp.id);
          const present  = empRecs.filter(r=>r.status==='present'||r.status==='late').length;
          const late     = empRecs.filter(r=>r.is_late).length;
          const hours    = empRecs.reduce((s,r)=>s+(r.hours_worked||0),0).toFixed(1);
          const initials = emp.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
          return (
            <div key={emp.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div className="avatar">{initials}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{emp.full_name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{present} days · {hours}h</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                {late>0 && <span className="badge late">{late} late</span>}
                <span className="badge present">{present}d</span>
              </div>
            </div>
          );
        })}
        {employees.length===0 && <div className="empty"><div className="icon">📊</div>No data for this period.</div>}
      </div>
    </div>
  );
}

// ── NAV CONFIG ────────────────────────────────────────────────
const ADMIN_NAV = [
  { section:"Main",     items:[{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"clockin",icon:"📸",label:"Clock In / Out"}]},
  { section:"Workforce",items:[{id:"attendance",icon:"📋",label:"Attendance"},{id:"overrides",icon:"📍",label:"GPS Overrides",badge:true},{id:"payroll",icon:"💰",label:"Payroll"},{id:"reports",icon:"📊",label:"Reports"}]},
  { section:"Team",items:[{id:"employees",icon:"👥",label:"Employees"},{id:"addemployee",icon:"➕",label:"Add Employee"},{id:"addshift",icon:"🕐",label:"Add Shift"}]},
  { section:"System",   items:[{id:"settings",icon:"⚙️",label:"Settings"}]},
];
const EMP_NAV = [
  { section:"Me", items:[{id:"clockin",icon:"📸",label:"Clock In / Out"},{id:"myrecord",icon:"📋",label:"My Record"}]},
];
const PAGE_TITLES = { dashboard:"Dashboard Overview", clockin:"AI Check-In", employees:"Employees", attendance:"Attendance Records", overrides:"GPS Override Requests", settings:"System Settings", myrecord:"My Attendance", editprofile:"Profile Details", account:"My Account", addemployee:"Add Employee", addshift:"Add Shift", payroll:"Payroll", reports:"Reports", pricing:"Pricing & Plans", usermgmt:"User Management", empoptions:"Employee App Options", shifts:"Work Shift Settings", businesses:"Business Management", inactive:"Inactive Employees", departments:"Department Type", invites:"Invites", notifSettings:"Notification Settings", attendanceSettings:"Attendance Settings", payrollSettings:"Payroll Setting", language:"Language", share:"Share App", privacy:"Privacy Policy" };

// ── ROOT APP ──────────────────────────────────────────────────
export default function App() {
  const [authUser, setAuthUser]       = useState(null);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [employee, setEmployee]       = useState(null);
  const [pageStack, setPageStack]     = useState(["clockin"]); // navigation stack
  const [authScreen, setAuthScreen]   = useState("login");

  // Current page is always the top of the stack
  const page = pageStack[pageStack.length - 1];

  // Navigate forward — pushes to stack
  const setPage = (newPage) => {
    setPageStack(stack => {
      // If already on this page, don't push again
      if (stack[stack.length-1] === newPage) return stack;
      // Root pages reset the stack
      const rootPages = ["dashboard","clockin","attendance","employees","myrecord"];
      if (rootPages.includes(newPage)) return [newPage];
      return [...stack, newPage];
    });
    setSidebarOpen(false);
  };

  // Go back one level in the stack
  const goBack = () => {
    setPageStack(stack => stack.length > 1 ? stack.slice(0,-1) : stack);
  };

  // Can go back if stack has more than 1 page
  const canGoBack = pageStack.length > 1;
  const [loading, setLoading]         = useState(true);
  const [employees, setEmployees]     = useState([]);
  const [clockIns, setClockIns]       = useState([]);
  const [settings, setSettings]       = useState(null);
  const [pendingOverrides, setPendingOverrides] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

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
        if (emp?.role==="admin"||emp?.role==="superadmin") setPageStack(["dashboard"]); else setPageStack(["clockin"]);
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
      {authScreen === "signup" ? (
        <SignUpScreen
          onBack={() => setAuthScreen("login")}
          onSignedUp={emp => {
            setEmployee(emp);
            setAuthUser({id: emp.auth_user_id});
            setAuthScreen("login");
            // Face enrollment will trigger automatically since face_enrolled is false
          }}
        />
      ) : (
        <LoginScreen
          onLogin={emp => {
            setEmployee(emp);
            setAuthUser({id: emp.auth_user_id});
            setPageStack([emp.role==="admin"||emp.role==="superadmin"?"dashboard":"clockin"]);
          }}
          onSignUp={() => setAuthScreen("signup")}
        />
      )}
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
      case "dashboard":  return <AdminDashboard employees={employees} clockIns={clockIns} setPage={setPage} pendingOverrides={pendingOverrides} />;
      case "clockin":    return <ClockInScreen employee={employee} settings={settings||{office_lat:6.5244,office_lng:3.3792,geofence_radius_m:100,gps_enforce:true}} />;
      case "employees":  return <EmployeesScreen employees={employees} onRefresh={()=>supabase.from("employees").select("*,departments(name),shifts(name,start_time,end_time,grace_mins)").eq("is_active",true).then(({data})=>setEmployees(data||[]))} />;
      case "attendance": return <AttendanceScreen employees={employees} />;
      case "overrides":  return <OverridesScreen employee={employee} />;
      case "settings":   return <SettingsScreen settings={settings} onSettingsSaved={s=>setSettings(s)} />;
      case "myrecord":     return <AttendanceScreen employees={[employee]} />;
      case "profile":      return <ProfileScreen employee={employee} />;
      case "account":      return <AccountScreen employee={employee} onNavigate={setPage} onLogout={handleLogout} />;
      case "addshift":     return <AddShiftScreen onSuccess={()=>setPage("settings")} />;
      case "addemployee":  return <AddEmployeeScreen onSuccess={()=>{ supabase.from('employees').select('*,departments(name),shifts(name,start_time,end_time,grace_mins)').eq('is_active',true).then(({data})=>setEmployees(data||[])); setPage('employees'); }} />;
      case "payroll":      return <PayrollScreen employees={employees} />;
      case "reports":      return <ReportsScreen employees={employees} />;
      default:             return <AdminDashboard employees={employees} clockIns={clockIns} setPage={setPage} pendingOverrides={pendingOverrides} />;
    }
  };

  return (
    <>
      <style>{FONTS}{CSS}</style>
      <div className="app">
        <div className={`sidebar-overlay ${sidebarOpen?"open":""}`} onClick={()=>setSidebarOpen(false)} />
        <div className={`sidebar ${sidebarOpen?"open":""}`}>
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
                  <div key={item.id} className={`nav-item ${page===item.id?"active":""}`} onClick={()=>{ setPage(item.id); setSidebarOpen(false); }}>
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
          <div className="topbar" style={{position:'relative'}}>
            {canGoBack ? (
              <button onClick={goBack} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text)',padding:'4px 8px',display:'flex',alignItems:'center'}}>←</button>
            ) : (
              <button className="menu-toggle" onClick={()=>setSidebarOpen(o=>!o)}>☰</button>
            )}
            <div className="topbar-title">{PAGE_TITLES[page]||"AttendAI"}</div>
            <span className="topbar-time"><Clock /></span>
            <div className="topbar-dot" title="Supabase Connected" />
            <button className="profile-btn" onClick={()=>setProfileOpen(o=>!o)}>
              {employee.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </button>
            {profileOpen && (
              <>
                <div style={{position:'fixed',inset:0,zIndex:199}} onClick={()=>setProfileOpen(false)} />
                <ProfileDropdown
                  employee={employee}
                  onLogout={()=>{ setProfileOpen(false); handleLogout(); }}
                  onNavigate={(p)=>setPage(p)}
                  onClose={()=>setProfileOpen(false)}
                />
              </>
            )}
          </div>
          <div className="content">
            {renderPage()}
          </div>
          {/* Bottom navigation — mobile only */}
          <div className="bottom-nav">
            {(isAdmin ? [
              {id:'dashboard', icon:'🏠', label:'Home'},
              {id:'attendance',icon:'📋', label:'Attendance'},
              {id:'employees', icon:'👥', label:'Employees'},
            ] : [
              {id:'clockin',  icon:'📸',label:'Clock In'},
              {id:'myrecord', icon:'📋',label:'My Record'},
            ]).map(item=>(
              <div key={item.id} className={`bn-item ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>
                <div className="bn-icon">{item.icon}</div>
                <div>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
