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

/* Sidebar removed — using bottom nav + profile icon */

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
.menu-toggle { display:none; }

@media (max-width: 768px) {
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
            <input className="phone-number-input" placeholder="Enter mobile number" value={form.phone} onChange={e=>set("phone",e.target.value.replace(/[^0-9]/g,""))} />
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
function AccountScreen({ employee, onLogout, employees }) {
  const [sub, setSub] = useState(null); // internal sub-page
  const initials = employee.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const isAdmin = employee.role==='admin'||employee.role==='superadmin';

  // Render sub-page if active
  if (sub) {
    const subTitles = {
      editprofile:'Profile Details', pricing:'Pricing & Plans',
      usermgmt:'User Management', empoptions:'Employee App Options',
      shifts:'Work Shift Settings', businesses:'Business Management',
      inactive:'Inactive Employees', departments:'Department Type',
      invites:'Invites', notifSettings:'Notification Settings',
      attendanceSettings:'Attendance Settings', payrollSettings:'Payroll Setting',
      language:'Language', share:'Share App', privacy:'Privacy Policy',
    };
    const renderSub = () => {
      if (sub==='editprofile')       return <ProfileScreen employee={employee} />;
      if (sub==='pricing')           return <PricingScreen />;
      if (sub==='usermgmt')          return <UserMgmtScreen onNavigate={(p)=>setSub(p)} />;
      if (sub==='empoptions')        return <EmpOptionsScreen />;
      if (sub==='shifts')            return <ShiftsScreen onAddNew={()=>setSub('addshift')} />;
      if (sub==='addshift')          return <AddShiftScreen onSuccess={()=>setSub('shifts')} />;
      if (sub==='businesses')        return <BusinessesScreen />;
      if (sub==='inactive')          return <InactiveScreen employees={employees||[]} />;
      if (sub==='departments')       return <DepartmentsScreen />;
      if (sub==='invites')           return <InvitesScreen employees={employees||[]} />;
      if (sub==='notifSettings')     return <NotifSettingsScreen />;
      if (sub==='attendanceSettings')return <AttendanceSettingsScreen />;
      if (sub==='payrollSettings')   return <PayrollSettingsScreen />;
      if (sub==='language')          return <LanguageScreen />;
      if (sub==='share')             return <ShareAppScreen />;
      if (sub==='privacy')           return <PrivacyPolicyScreen />;
      return <PlaceholderScreen title={subTitles[sub]||sub} />;
    };
    return (
      <div className="fade-in">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <button onClick={()=>setSub(null)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text)',padding:'4px 8px',display:'flex',alignItems:'center',fontFamily:'var(--body)'}}>← Back</button>
          <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:700}}>{subTitles[sub]||sub}</div>
        </div>
        {renderSub()}
      </div>
    );
  }

  const Item = ({ icon, title, sub: dest, subLabel }) => (
    <div className="account-item" onClick={() => setSub(dest)}>
      <div className="account-item-icon">{icon}</div>
      <div className="account-item-info">
        <div className="account-item-title">{title}</div>
        {subLabel && <div className="account-item-sub">{subLabel}</div>}
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
        <Item icon="✏️" title="Edit Profile" sub="editprofile" subLabel="Update your personal information" />
        <Item icon="💎" title="Pricing & Plans" sub="pricing" subLabel="View and upgrade your plan" />
      </Section>

      {isAdmin && (
        <Section title="Business Configuration">
          <Item icon="👤" title="User Management" sub="usermgmt" subLabel="Premium features overview" />
          <Item icon="📱" title="Employee App Options" sub="empoptions" subLabel="Control employee access" />
          <Item icon="🕐" title="Work Shift Settings" sub="shifts" subLabel="Create and manage shifts" />
          <Item icon="🏢" title="Businesses" sub="businesses" subLabel="Manage your organisations" />
          <Item icon="🚫" title="Inactive Employees" sub="inactive" subLabel="View deactivated staff" />
          <Item icon="🗂️" title="Department" sub="departments" subLabel="Manage departments" />
          <Item icon="✉️" title="Invites" sub="invites" subLabel="Pending employee invitations" />
        </Section>
      )}

      <Section title="Notification Settings">
        <Item icon="🔔" title="Notification Settings" sub="notifSettings" subLabel="Manage your alerts" />
      </Section>

      {isAdmin && (
        <Section title="Attendance Settings">
          <Item icon="📋" title="Attendance Settings" sub="attendanceSettings" subLabel="Reminders and rules" />
        </Section>
      )}

      {isAdmin && (
        <Section title="Payroll Setting">
          <Item icon="💰" title="Payroll Settings" sub="payrollSettings" subLabel="Cycle and calculation rules" />
        </Section>
      )}

      <Section title="Others">
        <Item icon="🌐" title="Language" sub="language" subLabel="English" />
        <Item icon="🔗" title="Share App" sub="share" subLabel="Invite others to AttendAI" />
        <Item icon="📄" title="Privacy Policy" sub="privacy" subLabel="Read our privacy policy" />
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
            <input className="phone-number-input" placeholder="Enter mobile number" value={form.phone} onChange={e=>set('phone',e.target.value.replace(/[^0-9]/g,''))} />
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
  const [billing, setBilling]         = useState('annual'); // monthly | annual
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [showFeatures, setShowFeatures] = useState(false);
  const [showQuote, setShowQuote]     = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [form, setForm] = useState({ company:'', phone:'', address:'', state:'', coupon:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const plans = [
    {
      id:'free',
      name:'Free',
      color:'#64748B',
      monthlyPrice: null,
      annualPrice: null,
      displayPrice: 'Free',
      displaySub: 'Forever',
      features:[
        '✓ Up to 5 employees (1st month)',
        '✓ Up to 3 employees (after 1 month)',
        '✓ Basic clock in/out',
        '✓ Face recognition',
        '✗ GPS geofencing',
        '✗ Payroll & payslips',
        '✗ Reports',
        '✗ Multi-business',
      ],
      cta: 'Get Started Free',
      ctaStyle: {background:'#64748B'},
    },
    {
      id:'pro',
      name:'Pro',
      color:'var(--primary)',
      monthlyPrice: '₦10,000',
      annualPrice:  '₦120,000',
      displayPrice: billing==='monthly' ? '₦10,000' : '₦120,000',
      displaySub:   billing==='monthly' ? 'per month' : 'per year',
      savings: billing==='annual' ? 'Save ₦0' : null,
      badge: 'Most Popular',
      features:[
        '✓ Up to 50 employees',
        '✓ Face recognition',
        '✓ GPS geofencing',
        '✓ Attendance reports',
        '✓ Payroll & payslips',
        '✓ Attendance reminders',
        '✓ GPS override approvals',
        '✓ Single business',
        '✓ Email support',
        '✗ Multi-business',
        '✗ Buddy punch detection',
        '✗ Broadcast messaging',
      ],
      cta: 'Get Pro',
      ctaStyle: {background:'var(--primary)'},
    },
    {
      id:'max',
      name:'Max',
      color:'#7C3AED',
      monthlyPrice: '₦20,000',
      annualPrice:  '₦240,000',
      displayPrice: billing==='monthly' ? '₦20,000' : '₦240,000',
      displaySub:   billing==='monthly' ? 'per month' : 'per year',
      badge: 'Best Value',
      features:[
        '✓ Unlimited employees',
        '✓ Everything in Pro',
        '✓ Multi-business support',
        '✓ Buddy punch detection',
        '✓ GPS override approvals',
        '✓ Expense management',
        '✓ Broadcast messaging',
        '✓ CRM Lite',
        '✓ Advanced reports',
        '✓ Priority support',
      ],
      cta: 'Get Max',
      ctaStyle: {background:'#7C3AED'},
    },
  ];

  const cur = plans.find(p=>p.id===selectedPlan);

  const Modal = ({title, onClose, children}) => (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:24,width:'100%',maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{fontFamily:'var(--display)',fontSize:17,fontWeight:800}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text2)'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{paddingBottom:80}}>

      {/* Header */}
      <div style={{textAlign:'center',marginBottom:20}}>
        <div style={{fontFamily:'var(--display)',fontSize:20,fontWeight:800,marginBottom:6}}>Choose Your Plan</div>
        <div style={{fontSize:13,color:'var(--text2)'}}>Start free. Upgrade when you grow.</div>
      </div>

      {/* Billing toggle */}
      <div style={{display:'flex',background:'var(--bg3)',borderRadius:12,padding:4,marginBottom:20,border:'1px solid var(--border)'}}>
        {['monthly','annual'].map(b=>(
          <button key={b} onClick={()=>setBilling(b)} style={{
            flex:1,padding:'10px',borderRadius:9,border:'none',cursor:'pointer',
            fontFamily:'var(--body)',fontSize:13,fontWeight:600,transition:'all 0.15s',
            background:billing===b?'white':'transparent',
            color:billing===b?'var(--primary)':'var(--text2)',
            boxShadow:billing===b?'0 1px 4px rgba(0,0,0,0.1)':'none',
          }}>
            {b==='monthly'?'Monthly':'Annual'}
            {b==='annual' && <span style={{marginLeft:6,fontSize:10,background:'var(--green)',color:'white',padding:'1px 6px',borderRadius:10,fontWeight:700}}>SAVE 17%</span>}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      {plans.map(p=>(
        <div key={p.id} onClick={()=>setSelectedPlan(p.id)} style={{
          border:`2px solid ${selectedPlan===p.id?p.color:'var(--border)'}`,
          borderRadius:16, padding:16, marginBottom:12, background:'white',
          cursor:'pointer', transition:'all 0.15s', position:'relative',
          boxShadow: selectedPlan===p.id?`0 4px 16px ${p.color}22`:'var(--shadow)',
        }}>
          {p.badge && (
            <div style={{position:'absolute',top:-10,right:16,background:p.color,color:'white',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
              {p.badge}
            </div>
          )}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <div>
              <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,color:p.color}}>{p.name}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{p.id==='free'?'Great to start':'Billed '+billing}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:800,color:p.color}}>{p.displayPrice}</div>
              <div style={{fontSize:10,color:'var(--text3)'}}>{p.displaySub}</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 8px'}}>
            {p.features.slice(0,6).map(f=>(
              <div key={f} style={{fontSize:11,color:f.startsWith('✓')?'var(--text)':'var(--text3)',display:'flex',gap:4}}>
                <span style={{color:f.startsWith('✓')?'var(--green)':'var(--red)',flexShrink:0}}>{f.slice(0,1)}</span>
                <span>{f.slice(2)}</span>
              </div>
            ))}
          </div>
          {p.features.length>6 && (
            <div style={{fontSize:11,color:'var(--primary)',fontWeight:600,marginTop:8}}>+{p.features.length-6} more features</div>
          )}
        </div>
      ))}

      {/* View all features */}
      <button onClick={()=>setShowFeatures(true)} style={{display:'flex',alignItems:'center',gap:6,color:'var(--primary)',fontWeight:600,fontSize:13,background:'none',border:'none',cursor:'pointer',fontFamily:'var(--body)',marginBottom:20,padding:0}}>
        📋 View All Plan Features
      </button>

      {/* Get Quote link */}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button onClick={()=>setShowQuote(true)} style={{background:'none',border:'none',color:'var(--primary)',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'var(--body)'}}>Get your Quote →</button>
      </div>

      {/* CTA Button */}
      {selectedPlan !== 'free' && (
        <button
          className="btn"
          style={{width:'100%',justifyContent:'center',padding:14,fontSize:15,...cur.ctaStyle,color:'white',borderRadius:12,marginBottom:12}}
          onClick={()=>setShowPayForm(true)}
        >
          {cur.cta} — {cur.displayPrice}/{billing==='monthly'?'mo':'yr'}
        </button>
      )}
      {selectedPlan === 'free' && (
        <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15,borderRadius:12}}>
          You are on the Free Plan
        </button>
      )}

      <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',marginTop:8}}>
        By continuing, you agree to our <span style={{color:'var(--primary)'}}>T&C</span> and <span style={{color:'var(--primary)'}}>Privacy Policy</span>
      </div>

      {/* Features Modal */}
      {showFeatures && (
        <Modal title="All Plan Features" onClose={()=>setShowFeatures(false)}>
          {['Free','Pro','Max'].map((planName,pi)=>{
            const pl = plans[pi];
            return (
              <div key={planName} style={{marginBottom:20}}>
                <div style={{fontFamily:'var(--display)',fontSize:14,fontWeight:800,color:pl.color,marginBottom:8,paddingBottom:6,borderBottom:`2px solid ${pl.color}`}}>{planName}</div>
                {pl.features.map(f=>(
                  <div key={f} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
                    <div style={{width:20,height:20,borderRadius:'50%',background:f.startsWith('✓')?'var(--green)':'var(--bg4)',display:'flex',alignItems:'center',justifyContent:'center',color:f.startsWith('✓')?'white':'var(--text3)',fontSize:11,flexShrink:0}}>{f.startsWith('✓')?'✓':'✗'}</div>
                    <span style={{color:f.startsWith('✓')?'var(--text)':'var(--text3)'}}>{f.slice(2)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </Modal>
      )}

      {/* Payment Form Modal */}
      {showPayForm && cur && (
        <Modal title={`Get ${cur.name} Plan`} onClose={()=>setShowPayForm(false)}>
          <div style={{background:`${cur.color}11`,borderRadius:10,padding:12,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:800,color:cur.color}}>{cur.name} Plan</div>
            <div style={{fontFamily:'var(--display)',fontSize:18,fontWeight:800,color:cur.color}}>{cur.displayPrice}<span style={{fontSize:11,fontWeight:400,color:'var(--text3)'}}>/{billing==='monthly'?'mo':'yr'}</span></div>
          </div>

          <div style={{fontFamily:'var(--display)',fontSize:13,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Contact Details</div>
          <div className="form-group"><input className="form-input" placeholder="Company Name *" value={form.company} onChange={e=>set('company',e.target.value)} /></div>
          <div className="form-group">
            <div className="phone-input-wrap">
              <select className="phone-code-select">{WA_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}</select>
              <input className="phone-number-input" placeholder="Mobile number" value={form.phone} onChange={e=>set('phone',e.target.value)} />
            </div>
          </div>
          <div className="form-group"><input className="form-input" placeholder="Email address" value={form.email||''} onChange={e=>set('email',e.target.value)} /></div>

          <div style={{fontFamily:'var(--display)',fontSize:13,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',margin:'16px 0 10px'}}>Card Payment</div>
          <div style={{background:'var(--bg3)',borderRadius:12,padding:16,marginBottom:16,border:'1px solid var(--border)'}}>
            <div className="form-group">
              <label className="form-label">Cardholder Name</label>
              <input className="form-input" placeholder="Name on card" />
            </div>
            <div className="form-group">
              <label className="form-label">Card Number</label>
              <div style={{position:'relative'}}>
                <input className="form-input" placeholder="0000 0000 0000 0000" maxLength={19}
                  style={{paddingRight:50}}
                  onChange={e=>{
                    let v = e.target.value.replace(/[^0-9]/g,'').slice(0,16);
                    e.target.value = v.replace(/(.{4})(?=.)/g,'$1 ');
                  }} />
                <span style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',fontSize:20}}>💳</span>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Expiry Date</label>
                <input className="form-input" placeholder="MM/YY" maxLength={5}
                  onChange={e=>{
                    let v = e.target.value.replace(/[^0-9]/g,'');
                    if(v.length>2) v = v.slice(0,2)+'/'+v.slice(2,4);
                    e.target.value = v;
                  }} />
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">CVV</label>
                <input className="form-input" placeholder="•••" maxLength={3} type="password" />
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:10,marginBottom:16}}>
            <input className="form-input" placeholder="Coupon code" style={{flex:1}} value={form.coupon} onChange={e=>set('coupon',e.target.value)} />
            <button className="btn btn-ghost" style={{padding:'11px 14px'}}>Apply</button>
          </div>

          <div style={{background:'var(--bg3)',borderRadius:10,padding:14,marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8,paddingBottom:8,borderBottom:'1px solid var(--border)'}}>
              <span>{cur.name} Plan ({billing})</span><span style={{fontWeight:600}}>{cur.displayPrice}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700}}>
              <span>Total</span><span style={{color:cur.color}}>{cur.displayPrice}</span>
            </div>
          </div>

          <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',marginBottom:12}}>
            🔒 Your payment is secured with 256-bit SSL encryption
          </div>
          <button className="btn" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15,...cur.ctaStyle,color:'white',borderRadius:12}}>
            Pay {cur.displayPrice} Now
          </button>
        </Modal>
      )}

      {/* Get Quote Modal */}
      {showQuote && (
        <Modal title="Get Your Quote" onClose={()=>setShowQuote(false)}>
          <div className="form-group">
            <label className="form-label">Number of Employees</label>
            <input className="form-input" placeholder="Enter number of employees" type="number" />
            <div style={{fontSize:11,color:'var(--text3)',marginTop:4,textAlign:'right'}}>Up to 500,000</div>
          </div>
          <div className="form-group">
            <label className="form-label">Number of Businesses / Locations</label>
            <input className="form-input" placeholder="Enter number of businesses" type="number" />
          </div>
          <div className="form-group">
            <label className="form-label">Specific Requirements</label>
            <textarea className="form-input" rows={3} placeholder="Describe your requirements…" />
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15}} onClick={()=>{
  alert('Thank you! We will review your requirements and get back to you at rollyadamstechworld@gmail.com shortly.');
  setShowQuote(false);
}}>Submit</button>
        </Modal>
      )}
    </div>
  );
}

function UserMgmtScreen({ onNavigate }) {
  const features = [
    {icon:'📸', label:'AI Face Recognition', plan:'free'},
    {icon:'⏰', label:'Basic Clock In/Out', plan:'free'},
    {icon:'👥', label:'Up to 3 Employees (Free)', plan:'free'},
    {icon:'📋', label:'Attendance Records', plan:'free'},
    {icon:'📍', label:'GPS Geofencing', plan:'pro'},
    {icon:'💰', label:'Payroll & Payslips', plan:'pro'},
    {icon:'📊', label:'Attendance Reports', plan:'pro'},
    {icon:'🔔', label:'Attendance Reminders', plan:'pro'},
    {icon:'✅', label:'GPS Override Approvals', plan:'pro'},
    {icon:'👥', label:'Up to 50 Employees (Pro)', plan:'pro'},
    {icon:'🏢', label:'Multi-Business Support', plan:'max'},
    {icon:'🤖', label:'Buddy Punch Detection', plan:'max'},
    {icon:'📢', label:'Broadcast Messaging', plan:'max'},
    {icon:'💼', label:'Expense Management', plan:'max'},
    {icon:'🔖', label:'CRM Lite', plan:'max'},
    {icon:'👥', label:'Unlimited Employees (Max)', plan:'max'},
    {icon:'🎯', label:'Priority Support', plan:'max'},
  ];
  const planColor = {free:'#64748B', pro:'var(--primary)', max:'#7C3AED'};
  const planLabel = {free:'FREE', pro:'PRO', max:'MAX'};

  return (
    <div className="fade-in">
      <div style={{background:'linear-gradient(160deg,#EBF0FF,#E0ECFF)',borderRadius:14,padding:20,textAlign:'center',marginBottom:20,border:'1px solid var(--border)'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:28}}>💎</div>
        <div style={{fontFamily:'var(--display)',fontSize:17,fontWeight:800,marginBottom:6}}>AttendAI Premium</div>
        <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.5}}>Start free for 1 month. Upgrade to unlock powerful workforce management tools.</div>
      </div>

      <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:700,marginBottom:12}}>All Features</div>
      <div className="card" style={{marginBottom:20}}>
        {features.map(f=>(
          <div key={f.label} className="feature-item">
            <div className="feature-check" style={{background:planColor[f.plan]}}>{f.icon}</div>
            <span style={{flex:1}}>{f.label}</span>
            <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:planColor[f.plan]+'22',color:planColor[f.plan]}}>{planLabel[f.plan]}</span>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:10,paddingBottom:20}}>
        <button className="btn btn-ghost" style={{flex:1,justifyContent:'center',padding:14}} onClick={()=>onNavigate&&onNavigate('pricing')}>View All Plans</button>
        <button className="btn btn-primary" style={{flex:1,justifyContent:'center',padding:14}} onClick={()=>onNavigate&&onNavigate('pricing')}>Start 1 Month Free</button>
      </div>
    </div>
  );
}

// ── EMPLOYEE APP OPTIONS ──────────────────────────────────────
function EmpOptionsScreen() {
  // currentPlan would come from app_settings in production
  // For now default to 'free' to show locked state
  const currentPlan = 'free'; // 'free' | 'pro' | 'max'

  const items = [
    {key:'attendance',      label:'Attendance',          plan:'free'},
    {key:'overtime',        label:'OverTime',             plan:'pro'},
    {key:'leave',           label:'Leave',                plan:'pro'},
    {key:'holidays',        label:'Holidays',             plan:'pro'},
    {key:'payroll',         label:'Payroll',              plan:'pro'},
    {key:'business_expense',label:'Business Expense',     plan:'max'},
    {key:'approve_expense', label:'Approve Expense',      plan:'max'},
    {key:'vehicle_mgmt',    label:'Vehicle Management',   plan:'max'},
  ];

  const planLevel = {free:0, pro:1, max:2};
  const isUnlocked = (itemPlan) => planLevel[currentPlan] >= planLevel[itemPlan];

  const [opts, setOpts] = useState({
    attendance:true, overtime:false, leave:false, holidays:false,
    payroll:false, business_expense:false, approve_expense:false, vehicle_mgmt:false,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const toggle = (k, itemPlan) => {
    if (!isUnlocked(itemPlan)) return; // locked
    setOpts(o=>({...o,[k]:!o[k]}));
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('app_settings').update({ emp_options: opts }).eq('id',1);
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const planColor = {free:'#64748B', pro:'var(--primary)', max:'#7C3AED'};
  const planLabel = {free:'FREE', pro:'PRO', max:'MAX'};

  return (
    <div className="fade-in">
      {saved && <div className="success-box">✓ Employee app options saved.</div>}
      <div style={{background:'var(--primary-light)',borderRadius:10,padding:12,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:13,color:'var(--primary)',fontWeight:600}}>Current Plan: <strong style={{textTransform:'uppercase'}}>{currentPlan}</strong></div>
        <span style={{fontSize:11,color:'var(--primary)',fontWeight:600,cursor:'pointer'}}>Upgrade →</span>
      </div>
      <div className="card" style={{marginBottom:20}}>
        {items.map(item=>{
          const unlocked = isUnlocked(item.plan);
          return (
            <div key={item.key} className="check-item" style={{opacity:unlocked?1:0.6}}>
              <div style={{flex:1}}>
                <span style={{color:unlocked?'var(--text)':'var(--text3)',fontWeight:500}}>{item.label}</span>
                {!unlocked && (
                  <span style={{marginLeft:8,fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:10,background:planColor[item.plan]+'22',color:planColor[item.plan]}}>
                    🔒 {planLabel[item.plan]}
                  </span>
                )}
              </div>
              <div
                className={`checkbox ${opts[item.key]&&unlocked?'checked':''}`}
                onClick={()=>toggle(item.key, item.plan)}
                style={{cursor:unlocked?'pointer':'not-allowed', opacity:unlocked?1:0.4}}
              >
                {opts[item.key]&&unlocked && '✓'}
              </div>
            </div>
          );
        })}
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
  const [editShift, setEditShift] = useState(null);

  const load = () => {
    setLoading(true);
    supabase.from('shifts').select('*').order('name').then(({data})=>{ setShifts(data||[]); setLoading(false); });
  };
  useEffect(()=>load(),[]);

  const deleteShift = async (id) => {
    if (!window.confirm) { await supabase.from('shifts').delete().eq('id',id); load(); return; }
    await supabase.from('shifts').delete().eq('id',id);
    load();
  };

  const saveEdit = async () => {
    if (!editShift) return;
    await supabase.from('shifts').update({
      name: editShift.name,
      start_time: editShift.start_time,
      end_time: editShift.end_time,
      grace_mins: parseInt(editShift.grace_mins)||10,
    }).eq('id', editShift.id);
    setEditShift(null); load();
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
              <button className="btn btn-ghost" style={{padding:'6px 10px',fontSize:13}} onClick={()=>setEditShift({...s})}>✏️</button>
              <button className="btn btn-danger" style={{padding:'6px 10px',fontSize:13}} onClick={()=>deleteShift(s.id)}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
      <button className="fab" onClick={onAddNew}>+</button>

      {/* Edit Shift Modal */}
      {editShift && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:24,width:'100%'}}>
            <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,marginBottom:16}}>Edit Shift</div>
            <div className="form-group">
              <label className="form-label">Shift Name</label>
              <input className="form-input" value={editShift.name} onChange={e=>setEditShift(s=>({...s,name:e.target.value}))} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input className="form-input" type="time" value={editShift.start_time} onChange={e=>setEditShift(s=>({...s,start_time:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input className="form-input" type="time" value={editShift.end_time} onChange={e=>setEditShift(s=>({...s,end_time:e.target.value}))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Grace Period (minutes)</label>
              <input className="form-input" type="number" value={editShift.grace_mins} onChange={e=>setEditShift(s=>({...s,grace_mins:e.target.value}))} />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setEditShift(null)}>Cancel</button>
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BUSINESSES SCREEN ─────────────────────────────────────────
function BusinessesScreen() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [showBranch, setShowBranch] = useState(null); // business id
  const [menuOpen, setMenuOpen]     = useState(null); // business id
  const [editBiz, setEditBiz]       = useState(null);
  const [form, setForm]             = useState({name:'', industry:'', address:'', email:'', phone:''});
  const [branchForm, setBranchForm] = useState({name:'', address:''});
  const [branches, setBranches]     = useState({});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setBr = (k,v) => setBranchForm(f=>({...f,[k]:v}));

  const load = async () => {
    setLoading(true);
    const {data} = await supabase.from('businesses').select('*').order('created_at');
    setBusinesses(data||[]);
    // Load branches
    if (data?.length) {
      const {data: br} = await supabase.from('business_branches').select('*');
      const grouped = {};
      (br||[]).forEach(b=>{ if(!grouped[b.business_id]) grouped[b.business_id]=[]; grouped[b.business_id].push(b); });
      setBranches(grouped);
    }
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const add = async () => {
    if (!form.name.trim()) return;
    const {error} = await supabase.from('businesses').insert({
      name: form.name.trim(), industry: form.industry, address: form.address,
      email: form.email, phone: form.phone,
    });
    if (!error) { setForm({name:'',industry:'',address:'',email:'',phone:''}); setShowAdd(false); load(); }
  };

  const addBranch = async (bizId) => {
    if (!branchForm.name.trim()) return;
    await supabase.from('business_branches').insert({
      business_id: bizId, name: branchForm.name.trim(), address: branchForm.address,
    });
    setBranchForm({name:'',address:''}); setShowBranch(null); load();
  };

  const deleteBiz = async (id) => {
    await supabase.from('businesses').delete().eq('id',id);
    setMenuOpen(null); load();
  };

  const saveEdit = async () => {
    if (!editBiz) return;
    await supabase.from('businesses').update({
      name: editBiz.name, industry: editBiz.industry,
      address: editBiz.address, email: editBiz.email, phone: editBiz.phone,
    }).eq('id', editBiz.id);
    setEditBiz(null); load();
  };

  const BottomSheet = ({title, onClose, children}) => (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:24,width:'100%',maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{color:'var(--primary)',fontWeight:600,fontSize:14,marginBottom:16,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}} onClick={()=>setShowAdd(true)}>
        + Add new business
      </div>
      <div style={{borderBottom:'1px solid var(--border)',marginBottom:8}} />

      {loading ? <div className="empty"><span className="spinner"/></div> :
       businesses.length===0 ? <div className="empty-state"><div className="es-icon">🏢</div><div className="es-title">No businesses yet</div></div> :
       businesses.map(b=>(
        <div key={b.id}>
          <div className="biz-card">
            <div className="biz-icon">🏢</div>
            <div className="biz-info">
              <div className="biz-name">{b.name}</div>
              <div className="biz-type">{b.industry||'—'}</div>
              {branches[b.id]?.length>0 && (
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{branches[b.id].length} branch{branches[b.id].length>1?'es':''}</div>
              )}
            </div>
            <div style={{position:'relative'}}>
              <div style={{color:'var(--text2)',fontSize:20,cursor:'pointer',padding:'4px 8px'}} onClick={()=>setMenuOpen(menuOpen===b.id?null:b.id)}>···</div>
              {menuOpen===b.id && (
                <>
                  <div style={{position:'fixed',inset:0,zIndex:99}} onClick={()=>setMenuOpen(null)} />
                  <div style={{position:'absolute',right:0,top:30,background:'white',border:'1px solid var(--border)',borderRadius:12,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',zIndex:100,width:160,overflow:'hidden'}}>
                    <div style={{padding:'12px 16px',fontSize:13,fontWeight:600,cursor:'pointer',borderBottom:'1px solid var(--border)'}} onClick={()=>{setEditBiz({...b});setMenuOpen(null);}}>✏️ Edit</div>
                    <div style={{padding:'12px 16px',fontSize:13,fontWeight:600,cursor:'pointer',borderBottom:'1px solid var(--border)'}} onClick={()=>{setShowBranch(b.id);setMenuOpen(null);}}>🏪 Add Branch</div>
                    <div style={{padding:'12px 16px',fontSize:13,fontWeight:600,cursor:'pointer',color:'var(--red)'}} onClick={()=>deleteBiz(b.id)}>🗑️ Delete</div>
                  </div>
                </>
              )}
            </div>
          </div>
          {branches[b.id]?.map(br=>(
            <div key={br.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0 10px 54px',borderBottom:'1px solid var(--border)'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--border)',flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{br.name}</div>
                {br.address && <div style={{fontSize:11,color:'var(--text3)'}}>{br.address}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Add Business */}
      {showAdd && (
        <BottomSheet title="Add New Business" onClose={()=>setShowAdd(false)}>
          <div className="form-group"><label className="form-label">Business Name *</label><input className="form-input" placeholder="e.g. Tech World Ltd" value={form.name} onChange={e=>set('name',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Industry</label><input className="form-input" placeholder="e.g. Information Technology" value={form.industry} onChange={e=>set('industry',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="business@email.com" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+234..." value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Address</label><input className="form-input" placeholder="Business address" value={form.address} onChange={e=>set('address',e.target.value)} /></div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={add}>Add Business</button>
          </div>
        </BottomSheet>
      )}

      {/* Add Branch */}
      {showBranch && (
        <BottomSheet title="Add Branch" onClose={()=>setShowBranch(null)}>
          <div className="form-group"><label className="form-label">Branch Name *</label><input className="form-input" placeholder="e.g. Lagos Branch" value={branchForm.name} onChange={e=>setBr('name',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Address</label><input className="form-input" placeholder="Branch address" value={branchForm.address} onChange={e=>setBr('address',e.target.value)} /></div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowBranch(null)}>Cancel</button>
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>addBranch(showBranch)}>Add Branch</button>
          </div>
        </BottomSheet>
      )}

      {/* Edit Business */}
      {editBiz && (
        <BottomSheet title="Edit Business" onClose={()=>setEditBiz(null)}>
          <div className="form-group"><label className="form-label">Business Name</label><input className="form-input" value={editBiz.name} onChange={e=>setEditBiz(b=>({...b,name:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Industry</label><input className="form-input" value={editBiz.industry||''} onChange={e=>setEditBiz(b=>({...b,industry:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editBiz.email||''} onChange={e=>setEditBiz(b=>({...b,email:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={editBiz.phone||''} onChange={e=>setEditBiz(b=>({...b,phone:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={editBiz.address||''} onChange={e=>setEditBiz(b=>({...b,address:e.target.value}))} /></div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setEditBiz(null)}>Cancel</button>
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={saveEdit}>Save Changes</button>
          </div>
        </BottomSheet>
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
  const [editDept, setEditDept] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const load = () => supabase.from('departments').select('*').order('name').then(({data})=>setDepts(data||[]));
  useEffect(()=>load(),[]);

  const add = async () => {
    if (!newDept.trim()) return;
    await supabase.from('departments').insert({name:newDept.trim()});
    setNewDept(''); setShowAdd(false); load();
  };

  const del = async (id) => {
    await supabase.from('departments').delete().eq('id',id);
    setMenuOpen(null); load();
  };

  const saveEdit = async () => {
    if (!editDept) return;
    await supabase.from('departments').update({name:editDept.name}).eq('id',editDept.id);
    setEditDept(null); load();
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
            <div style={{position:'relative'}}>
              <span style={{color:'var(--text2)',fontSize:18,cursor:'pointer',padding:'4px 8px'}} onClick={()=>setMenuOpen(menuOpen===d.id?null:d.id)}>···</span>
              {menuOpen===d.id && (
                <>
                  <div style={{position:'fixed',inset:0,zIndex:99}} onClick={()=>setMenuOpen(null)} />
                  <div style={{position:'absolute',right:0,top:28,background:'white',border:'1px solid var(--border)',borderRadius:12,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',zIndex:100,width:140,overflow:'hidden'}}>
                    <div style={{padding:'12px 16px',fontSize:13,fontWeight:600,cursor:'pointer',borderBottom:'1px solid var(--border)'}} onClick={()=>{setEditDept({...d});setMenuOpen(null);}}>✏️ Edit</div>
                    <div style={{padding:'12px 16px',fontSize:13,fontWeight:600,cursor:'pointer',color:'var(--red)'}} onClick={()=>del(d.id)}>🗑️ Delete</div>
                  </div>
                </>
              )}
            </div>
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

      {editDept && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:24,width:'100%'}}>
            <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,marginBottom:16}}>Edit Department</div>
            <div className="form-group">
              <label className="form-label">Department Name</label>
              <input className="form-input" value={editDept.name} onChange={e=>setEditDept(d=>({...d,name:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&saveEdit()} />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setEditDept(null)}>Cancel</button>
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={saveEdit}>Save</button>
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

// ── NOTIFICATION SETTINGS ────────────────────────────────────
function NotifSettingsScreen() {
  const [settings, setSettings] = useState({
    attendance_reminder: true,
    late_arrival_alert: true,
    absent_alert: true,
    gps_violation_alert: true,
    clockin_confirmation: false,
  });
  const [saved, setSaved] = useState(false);

  const toggle = k => setSettings(s=>({...s,[k]:!s[k]}));

  const items = [
    { key:'attendance_reminder',  label:'Attendance Reminder',    sub:'Remind employees to clock in at shift start' },
    { key:'late_arrival_alert',   label:'Late Arrival Alert',     sub:'Notify admin when employee arrives late' },
    { key:'absent_alert',         label:'Absent Alert',           sub:'Notify admin when employee does not clock in' },
    { key:'gps_violation_alert',  label:'GPS Violation Alert',    sub:'Alert when employee clocks in outside geofence' },
    { key:'clockin_confirmation', label:'Clock-in Confirmation',  sub:'Send confirmation to employee on successful clock-in' },
  ];

  const save = async () => {
    await supabase.from('app_settings').update({ notif_settings: settings }).eq('id',1);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  return (
    <div className="fade-in">
      {saved && <div className="success-box">✓ Notification settings saved.</div>}
      <div className="card" style={{marginBottom:16}}>
        {items.map(item=>(
          <div key={item.key} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{item.label}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{item.sub}</div>
            </div>
            <div
              style={{width:44,height:24,borderRadius:12,cursor:'pointer',
                background:settings[item.key]?'var(--primary)':'var(--bg4)',
                display:'flex',alignItems:'center',padding:3,
                justifyContent:settings[item.key]?'flex-end':'flex-start',
                transition:'all 0.2s',flexShrink:0}}
              onClick={()=>toggle(item.key)}
            >
              <div style={{width:18,height:18,borderRadius:'50%',background:'white',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15}} onClick={save}>
        Save Settings
      </button>
    </div>
  );
}

// ── ATTENDANCE SETTINGS ───────────────────────────────────────
function AttendanceSettingsScreen() {
  const [settings, setSettings] = useState({
    not_set_as_absent: false,
    restrict_past_editing: false,
    reconfirm_change: false,
    payroll_cycle_start: 1,
    payroll_cycle_end: 30,
  });
  const [saved, setSaved] = useState(false);
  const toggle = k => setSettings(s=>({...s,[k]:!s[k]}));
  const set = (k,v) => setSettings(s=>({...s,[k]:v}));

  const save = async () => {
    await supabase.from('app_settings').update({ attendance_settings: settings }).eq('id',1);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const Toggle = ({k, label, sub}) => (
    <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{label}</div>
        {sub && <div style={{fontSize:11,color:'var(--text3)',marginTop:3,lineHeight:1.4}}>{sub}</div>}
      </div>
      <div
        style={{width:44,height:24,borderRadius:12,cursor:'pointer',
          background:settings[k]?'var(--primary)':'var(--bg4)',
          display:'flex',alignItems:'center',padding:3,marginTop:2,
          justifyContent:settings[k]?'flex-end':'flex-start',
          transition:'all 0.2s',flexShrink:0}}
        onClick={()=>toggle(k)}
      >
        <div style={{width:18,height:18,borderRadius:'50%',background:'white',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      {saved && <div className="success-box">✓ Attendance settings saved.</div>}

      <div style={{fontFamily:'var(--display)',fontSize:13,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Attendance Settings</div>
      <div className="card" style={{marginBottom:16}}>
        <Toggle k="not_set_as_absent" label="Not Set as Absent" sub="Employees with no attendance set will be treated as Present instead of Absent." />
        <Toggle k="restrict_past_editing" label="Restrict Past Attendance Editing" sub="Prevent supervisors from editing attendance records for dates prior to the current day." />
        <Toggle k="reconfirm_change" label="Reconfirm Attendance Change" sub="Require confirmation before any attendance record is modified." />
      </div>

      <div style={{fontFamily:'var(--display)',fontSize:13,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Payroll Cycle</div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:10}}>Cycle Start Day</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {Array.from({length:28},(_,i)=>i+1).map(d=>(
              <div key={d} onClick={()=>set('payroll_cycle_start',d)} style={{
                width:36,height:36,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',fontSize:13,fontWeight:600,
                background:settings.payroll_cycle_start===d?'var(--primary)':'var(--bg3)',
                color:settings.payroll_cycle_start===d?'white':'var(--text2)',
                border:`1px solid ${settings.payroll_cycle_start===d?'var(--primary)':'var(--border)'}`,
              }}>{d}</div>
            ))}
          </div>
        </div>
        <div style={{padding:'14px 0'}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:10}}>Cycle End Day</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {Array.from({length:28},(_,i)=>i+1).map(d=>(
              <div key={d} onClick={()=>set('payroll_cycle_end',d)} style={{
                width:36,height:36,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',fontSize:13,fontWeight:600,
                background:settings.payroll_cycle_end===d?'var(--primary)':'var(--bg3)',
                color:settings.payroll_cycle_end===d?'white':'var(--text2)',
                border:`1px solid ${settings.payroll_cycle_end===d?'var(--primary)':'var(--border)'}`,
              }}>{d}</div>
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15,marginBottom:20}} onClick={save}>
        Save Settings
      </button>
    </div>
  );
}

// ── PAYROLL SETTINGS ──────────────────────────────────────────
function PayrollSettingsScreen() {
  const [form, setForm] = useState({
    thirty_day_rule: false,
    late_deduction: '500',
    absent_deduction: '2500',
    overtime_rate: '1.5',
  });
  const [saved, setSaved] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    supabase.from('app_settings').select('*').eq('id',1).single()
      .then(({data})=>{
        if(data){
          setForm(f=>({...f,
            late_deduction: String(data.late_deduction_ngn||500),
            absent_deduction: String(data.absent_deduction_ngn||2500),
          }));
        }
      });
  },[]);

  const save = async () => {
    await supabase.from('app_settings').update({
      late_deduction_ngn:   parseInt(form.late_deduction)||500,
      absent_deduction_ngn: parseInt(form.absent_deduction)||2500,
      payroll_settings: form,
    }).eq('id',1);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  return (
    <div className="fade-in">
      {saved && <div className="success-box">✓ Payroll settings saved.</div>}

      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600}}>30 Days Payroll Rule</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:3,lineHeight:1.4}}>Calculate payroll on 30 fixed days. Disable to calculate on actual month days.</div>
          </div>
          <div
            style={{width:44,height:24,borderRadius:12,cursor:'pointer',
              background:form.thirty_day_rule?'var(--primary)':'var(--bg4)',
              display:'flex',alignItems:'center',padding:3,marginTop:2,
              justifyContent:form.thirty_day_rule?'flex-end':'flex-start',transition:'all 0.2s',flexShrink:0}}
            onClick={()=>set('thirty_day_rule',!form.thirty_day_rule)}
          >
            <div style={{width:18,height:18,borderRadius:'50%',background:'white',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
          </div>
        </div>
        <div style={{padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
          <label className="form-label">Late Arrival Deduction (₦ per occurrence)</label>
          <input className="form-input" type="number" value={form.late_deduction} onChange={e=>set('late_deduction',e.target.value)} placeholder="500" />
        </div>
        <div style={{padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
          <label className="form-label">Absence Deduction (₦ per day)</label>
          <input className="form-input" type="number" value={form.absent_deduction} onChange={e=>set('absent_deduction',e.target.value)} placeholder="2500" />
        </div>
        <div style={{padding:'14px 0'}}>
          <label className="form-label">Overtime Rate Multiplier</label>
          <input className="form-input" type="number" step="0.1" value={form.overtime_rate} onChange={e=>set('overtime_rate',e.target.value)} placeholder="1.5" />
          <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>e.g. 1.5 = 1.5× hourly rate for overtime hours</div>
        </div>
      </div>

      <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15,marginBottom:20}} onClick={save}>
        Save Payroll Settings
      </button>
    </div>
  );
}

// ── LANGUAGE ──────────────────────────────────────────────────
function LanguageScreen() {
  const languages = [
    { code:'en', name:'English', native:'English', flag:'🇬🇧', available:true },
    { code:'fr', name:'French', native:'Français', flag:'🇫🇷', available:false },
    { code:'yo', name:'Yoruba', native:'Yorùbá', flag:'🇳🇬', available:false },
    { code:'ha', name:'Hausa', native:'Hausa', flag:'🇳🇬', available:false },
    { code:'ig', name:'Igbo', native:'Igbo', flag:'🇳🇬', available:false },
    { code:'tw', name:'Twi', native:'Twi', flag:'🇬🇭', available:false },
    { code:'wo', name:'Wolof', native:'Wolof', flag:'🇸🇳', available:false },
  ];
  const [selected, setSelected] = useState('en');

  return (
    <div className="fade-in">
      <div style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>Select your preferred language. More languages coming soon.</div>
      <div className="card">
        {languages.map(lang=>(
          <div key={lang.code} onClick={()=>lang.available&&setSelected(lang.code)}
            style={{display:'flex',alignItems:'center',gap:14,padding:'14px 0',borderBottom:'1px solid var(--border)',cursor:lang.available?'pointer':'default'}}>
            <div style={{fontSize:24}}>{lang.flag}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:lang.available?'var(--text)':'var(--text3)'}}>{lang.name}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>{lang.native}</div>
            </div>
            {!lang.available && (
              <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,background:'var(--bg4)',color:'var(--text3)'}}>Coming Soon</span>
            )}
            {lang.available && selected===lang.code && (
              <div style={{width:20,height:20,borderRadius:'50%',background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:12}}>✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SHARE APP ─────────────────────────────────────────────────
function ShareAppScreen() {
  const appUrl = 'https://attendai-bnfg.vercel.app';
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(appUrl).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Check out AttendAI — AI-Powered Workforce Attendance Platform for African businesses. ${appUrl}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title:'AttendAI', text:'AI-Powered Workforce Attendance Platform', url: appUrl });
    }
  };

  return (
    <div className="fade-in">
      <div style={{background:'linear-gradient(135deg,var(--primary),#1447C0)',borderRadius:16,padding:24,textAlign:'center',marginBottom:20,color:'white'}}>
        <div style={{fontSize:40,marginBottom:10}}>📱</div>
        <div style={{fontFamily:'var(--display)',fontSize:18,fontWeight:800,marginBottom:6}}>Share AttendAI</div>
        <div style={{fontSize:13,opacity:0.85,lineHeight:1.5}}>Help other African businesses manage their workforce smarter with AI-powered attendance tracking.</div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:8,fontWeight:600}}>App Link</div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{flex:1,background:'var(--bg3)',borderRadius:10,padding:'11px 14px',fontSize:13,color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{appUrl}</div>
          <button className="btn btn-primary" style={{padding:'11px 16px',flexShrink:0}} onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
        <button className="btn" style={{width:'100%',justifyContent:'center',padding:14,fontSize:14,background:'#25D366',color:'white',borderRadius:12}} onClick={shareWhatsApp}>
          💬 Share on WhatsApp
        </button>
        {navigator.share && (
          <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',padding:14,fontSize:14,borderRadius:12}} onClick={shareNative}>
            📤 More Sharing Options
          </button>
        )}
      </div>

      <div className="card">
        <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Why share AttendAI?</div>
        {['AI face recognition for accurate attendance','GPS geofencing stops fraudulent clock-ins','Payroll calculations done automatically','Built specifically for West African businesses'].map(f=>(
          <div key={f} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
            <span style={{color:'var(--green)'}}>✓</span><span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PRIVACY POLICY ────────────────────────────────────────────
function PrivacyPolicyScreen() {
  const sections = [
    ["1. Introduction", "AttendAI is committed to protecting the personal information of our users across West Africa and beyond. This Privacy Policy explains how we collect, use, store, and protect your information when you use the AttendAI platform."],
    ["2. Information We Collect", "We collect the following:\n- Personal details: name, email, phone number\n- Biometric data: facial recognition descriptors for identity verification\n- Location data: GPS coordinates captured at clock-in/out events\n- Employment info: role, department, shift, attendance records\n- Device info: browser type and device identifiers for security"],
    ["3. How We Use Your Information", "Your information is used to:\n- Verify employee identity through AI face recognition\n- Record and manage attendance and work hours\n- Calculate payroll and generate payslips\n- Send attendance reminders and alerts to administrators\n- Improve security and performance of our platform"],
    ["4. Biometric Data", "Facial recognition data is stored securely in encrypted form. We do not sell, share, or transfer biometric data to third parties. Face descriptors cannot be reverse-engineered into photographs. Employees may request deletion of their biometric data at any time."],
    ["5. Data Storage and Security", "All data is stored on secure cloud servers with industry-standard encryption. We implement role-based access controls so only authorised personnel can access sensitive data. Data is backed up regularly."],
    ["6. Data Sharing", "We do not sell your personal information. Data may be shared only:\n- With your employer that has subscribed to AttendAI\n- With service providers who help us operate the platform\n- When required by applicable law or court order"],
    ["7. Your Rights", "You have the right to:\n- Access your personal data\n- Request correction of inaccurate information\n- Request deletion of your account and data\n- Withdraw consent for biometric data processing\n- Receive a copy of your data in a portable format\n\nContact us at rollyadamstechworld@gmail.com"],
    ["8. Cookies", "AttendAI uses minimal cookies necessary for authentication and session management. We do not use tracking cookies or third-party advertising cookies."],
    ["9. Children and Minors", "AttendAI is designed for use by working adults (18 years and older). We do not knowingly collect information from individuals under 18 years of age."],
    ["10. Changes to This Policy", "We may update this Privacy Policy from time to time. We will notify users of significant changes via email or in-app notification. Continued use of AttendAI after changes constitutes acceptance of the updated policy."],
    ["11. Contact Us", "For privacy-related questions:\n\nEmail: rollyadamstechworld@gmail.com\nPlatform: AttendAI - AI-Powered Workforce Attendance\nRegion: West Africa"],
  ];

  return (
    <div className="fade-in">
      <div style={{background:'var(--primary-light)',borderRadius:12,padding:14,marginBottom:16,display:'flex',gap:10,alignItems:'flex-start'}}>
        <span style={{fontSize:20}}>📄</span>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:'var(--primary)'}}>Privacy Policy</div>
          <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>Last updated: April 2026</div>
        </div>
      </div>
      {sections.map(([title, content])=>(
        <div key={title} className="card" style={{marginBottom:10}}>
          <div style={{fontFamily:'var(--display)',fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:8}}>{title}</div>
          <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.7,whiteSpace:'pre-line'}}>{content}</div>
        </div>
      ))}
      <div style={{textAlign:'center',padding:'16px 0',fontSize:11,color:'var(--text3)'}}>
        2026 AttendAI. All rights reserved.
      </div>
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
            <input className="phone-number-input" placeholder="Enter mobile number" value={form.phone} onChange={e=>set('phone',e.target.value.replace(/[^0-9]/g,''))} />
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
  const [employee, setEmployee]       = useState(null);
  const [page, setPageState]          = useState("clockin");
  const [prevPage, setPrevPage]       = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authScreen, setAuthScreen]   = useState("login");

  const ROOT_PAGES = ["dashboard","clockin","attendance","employees","myrecord"];

  const setPage = (newPage) => {
    setProfileOpen(false);
    if (ROOT_PAGES.includes(newPage)) {
      setPrevPage(null);
    } else {
      setPrevPage(page);
    }
    setPageState(newPage);
    // Always push so phone back button has somewhere to go
    window.history.pushState({ page: newPage, prev: ROOT_PAGES.includes(newPage) ? null : page }, '', window.location.pathname);
  };

  const goBack = () => {
    if (prevPage) {
      window.history.back(); // triggers popstate which handles state update
    }
  };

  const canGoBack = !!prevPage;

  // Push a base state on mount so the very first back press doesn't exit the app
  useEffect(() => {
    window.history.replaceState({ page: page, prev: null }, '', window.location.pathname);
  }, []);

  // Listen for Android/browser back button
  useEffect(() => {
    const handlePopState = (e) => {
      const prev = e.state?.prev;
      if (prev) {
        setPageState(prev);
        setPrevPage(null);
        // Keep a new base state so repeated back presses work
        window.history.pushState({ page: prev, prev: null }, '', window.location.pathname);
      } else {
        // On root page - push a dummy state to prevent app exit
        window.history.pushState({ page: page, prev: null }, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [page, prevPage]);
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
        if (emp?.role==="admin"||emp?.role==="superadmin") { setPageState("dashboard"); } else { setPageState("clockin"); } setPrevPage(null);
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
            setPageState(emp.role==="admin"||emp.role==="superadmin"?"dashboard":"clockin"); setPrevPage(null);
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
      case "account":      return <AccountScreen employee={employee} onLogout={handleLogout} employees={employees} />;
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
        <div className="main" style={{width:'100vw'}}>
          <div className="topbar" style={{position:'relative'}}>
            {canGoBack ? (
              <button onClick={goBack} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text)',padding:'4px 8px',display:'flex',alignItems:'center',fontFamily:'var(--body)'}}>←</button>
            ) : (
              <div style={{width:36}} />
            )}
            <div className="topbar-title">{PAGE_TITLES[page]||"AttendAI"}</div>
            <span className="topbar-time"><Clock /></span>
            <div className="topbar-dot" title="Supabase Connected" />
            <button className="profile-btn" onClick={()=>setPage('account')}>
              {employee.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </button>
          </div>
          <div className="content">
            {renderPage()}
          </div>
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