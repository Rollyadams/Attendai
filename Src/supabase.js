// supabase.js — AttendAI data layer
// Place this at src/supabase.js in your Vite project
// Install:  npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

// ── CONFIG — replace with your Supabase project values ──────
const SUPABASE_URL  = 'https://zwxgyyebrxfljvxosnuu.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─────────────────────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ─────────────────────────────────────────────────────────────
//  EMPLOYEES
// ─────────────────────────────────────────────────────────────

/** Fetch full employee record for the logged-in user */
export async function getMyProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('employees')
    .select(`*, departments(name), shifts(name,start_time,end_time,grace_mins)`)
    .eq('auth_user_id', session.user.id)
    .single();
  if (error) throw error;
  return data;
}

/** Fetch all employees (admin use) */
export async function getAllEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(`*, departments(name), shifts(name,start_time,end_time,grace_mins)`)
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  return data;
}

/** Create a new employee (admin creates + invites via Supabase Auth) */
export async function createEmployee(payload) {
  // 1. Create auth user (sends invite email)
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
    payload.email, { redirectTo: `${window.location.origin}/set-password` }
  );
  if (authError) throw authError;

  // 2. Insert employee record
  const { data, error } = await supabase.from('employees').insert({
    auth_user_id:  authData.user.id,
    full_name:     payload.full_name,
    email:         payload.email,
    phone:         payload.phone,
    role:          payload.role || 'employee',
    department_id: payload.department_id,
    shift_id:      payload.shift_id,
    hourly_rate_ngn: payload.hourly_rate_ngn || 2500,
    gps_policy:    payload.gps_policy || 'office_only',
  }).select().single();
  if (error) throw error;
  return data;
}

/** Save face descriptor after enrollment */
export async function saveFaceDescriptor(employeeId, descriptor, photoUrl) {
  const { data, error } = await supabase
    .from('employees')
    .update({
      face_descriptor:  Array.from(descriptor), // Float32Array → plain array for JSON
      face_photo_url:   photoUrl,
      face_enrolled:    true,
      face_enrolled_at: new Date().toISOString(),
    })
    .eq('id', employeeId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Fetch all enrolled face descriptors (for buddy-punch detection) */
export async function getAllFaceDescriptors() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, face_descriptor')
    .eq('face_enrolled', true)
    .eq('is_active', true);
  if (error) throw error;
  // Rehydrate descriptor arrays
  return data.map(e => ({
    ...e,
    face_descriptor: e.face_descriptor ? new Float32Array(e.face_descriptor) : null,
  }));
}

// ─────────────────────────────────────────────────────────────
//  FACE PHOTO STORAGE
// ─────────────────────────────────────────────────────────────

/** Upload selfie to Supabase Storage, return public URL */
export async function uploadFacePhoto(employeeId, blob) {
  const path = `enrollments/${employeeId}/face.jpg`;
  const { error: upError } = await supabase.storage
    .from('face-photos')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (upError) throw upError;

  const { data } = supabase.storage.from('face-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
//  CLOCK-INS
// ─────────────────────────────────────────────────────────────

/** Get today's clock-in record for an employee (if exists) */
export async function getTodayClockIn(employeeId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('clock_ins')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('work_date', today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Record a clock-in event
 * @param {object} payload
 * {
 *   employee_id, shift (from employees.shifts),
 *   lat, lng, gps_distance_m, gps_status,
 *   face_match_score, face_verified,
 *   buddy_punch_flag, buddy_punch_score
 * }
 */
export async function clockIn(payload) {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);

  // Determine late status against shift
  const shift      = payload.shift;
  const graceMs    = (shift?.grace_mins || 10) * 60 * 1000;
  const [sh, sm]   = (shift?.start_time || '09:00').split(':').map(Number);
  const shiftStart = new Date(now);
  shiftStart.setHours(sh, sm, 0, 0);
  const isLate   = now > new Date(shiftStart.getTime() + graceMs);
  const lateMins = isLate ? Math.floor((now - shiftStart) / 60000) : 0;

  const { data, error } = await supabase
    .from('clock_ins')
    .insert({
      employee_id:       payload.employee_id,
      work_date:         today,
      clock_in_time:     now.toISOString(),
      lat:               payload.lat,
      lng:               payload.lng,
      gps_distance_m:    payload.gps_distance_m,
      gps_status:        payload.gps_status,
      face_match_score:  payload.face_match_score,
      face_verified:     payload.face_verified,
      buddy_punch_flag:  payload.buddy_punch_flag,
      buddy_punch_score: payload.buddy_punch_score,
      status:            isLate ? 'late' : 'present',
      is_late:           isLate,
      late_mins:         lateMins,
    })
    .select()
    .single();
  if (error) throw error;

  // Log to AI audit
  await logAuditEvent(data.id, payload.employee_id, 'face_verified', {
    score: payload.face_match_score,
    gps: payload.gps_status,
    buddy: payload.buddy_punch_flag,
  });

  return data;
}

/** Record a clock-out */
export async function clockOut(clockInId) {
  const { data, error } = await supabase
    .from('clock_ins')
    .update({ clock_out_time: new Date().toISOString() })
    .eq('id', clockInId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Fetch attendance records — admin view */
export async function getAttendanceRecords({ date, employeeId } = {}) {
  let q = supabase
    .from('clock_ins')
    .select(`*, employees(full_name, role, departments(name))`)
    .order('clock_in_time', { ascending: false });
  if (date)       q = q.eq('work_date', date);
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
//  GPS OVERRIDE
// ─────────────────────────────────────────────────────────────

export async function requestGpsOverride(clockInId, employeeId, reason) {
  const { data, error } = await supabase
    .from('gps_override_requests')
    .insert({ clock_in_id: clockInId, employee_id: employeeId, reason })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPendingOverrides() {
  const { data, error } = await supabase
    .from('gps_override_requests')
    .select(`*, employees(full_name), clock_ins(gps_distance_m, gps_status, clock_in_time)`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function resolveOverride(overrideId, approved, reviewerId, note) {
  const { data, error } = await supabase
    .from('gps_override_requests')
    .update({
      status:      approved ? 'approved' : 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', overrideId)
    .select()
    .single();
  if (error) throw error;

  if (approved) {
    await supabase
      .from('clock_ins')
      .update({ override_approved: true, override_by: reviewerId, override_note: note, override_at: new Date().toISOString() })
      .eq('id', data.clock_in_id);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
//  APP SETTINGS
// ─────────────────────────────────────────────────────────────

export async function getSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSettings(updates) {
  const { data, error } = await supabase
    .from('app_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
//  AI AUDIT LOG
// ─────────────────────────────────────────────────────────────

export async function logAuditEvent(clockInId, employeeId, eventType, details) {
  await supabase.from('ai_audit_log').insert({
    clock_in_id:  clockInId,
    employee_id:  employeeId,
    event_type:   eventType,
    details,
  });
}

// ─────────────────────────────────────────────────────────────
//  GPS UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Haversine distance between two GPS coords (returns metres)
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in metres
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get current GPS position — returns Promise<{lat, lng}>
 */
export function getCurrentPosition(highAccuracy = true) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Full GPS check against settings geofence
 * Returns: { lat, lng, distance_m, status, withinFence }
 */
export async function checkGpsLocation(settings) {
  const pos      = await getCurrentPosition();
  const distance = Math.round(haversineDistance(
    settings.office_lat, settings.office_lng, pos.lat, pos.lng
  ));
  const withinFence = distance <= settings.geofence_radius_m;
  return {
    lat:         pos.lat,
    lng:         pos.lng,
    distance_m:  distance,
    withinFence,
    status:      withinFence ? 'on_site' : 'outside_fence',
  };
