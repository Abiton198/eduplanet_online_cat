/**
 * studentId.js — shared student identity for EduCAT
 *
 * Priority order:
 *   1. Firestore students/{uid}.name  (most reliable — set at registration)
 *   2. Firebase Auth displayName      (fallback if Firestore not populated)
 *   3. Firebase Auth email prefix     (e.g. "john.doe" from john.doe@school.com)
 *   4. localStorage cached value      (used while async fetch is pending)
 *   5. "stu_<random>"                 (last resort for unauthenticated users)
 *
 * The resolved name is cached in localStorage under "educat_sid" so
 * CATTutor, AIExamMocker, and ExamResultsDisplay all share the same key
 * without re-fetching on every render.
 */

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase"; // adjust path if needed

const CACHE_KEY = "educat_sid";

// ── Synchronous read — returns whatever is cached right now ─────────────────
// Use this for the initial render before the async resolution completes.
export function getCachedStudentId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CACHE_KEY) || null;
}

// ── Write a resolved name to cache ──────────────────────────────────────────
function cache(name) {
  if (typeof window !== "undefined" && name) {
    localStorage.setItem(CACHE_KEY, name);
  }
  return name;
}

// ── Resolve from Firebase Auth + Firestore, cache result ────────────────────
// Returns a Promise<string> — resolves as soon as the name is known.
export async function resolveStudentId(user) {
  if (!user) {
    // Not logged in — use cached value or generate anonymous ID
    const cached = getCachedStudentId();
    if (cached) return cached;
    const anon = "guest_" + Math.random().toString(36).slice(2, 8);
    return cache(anon);
  }

  // 1. Try Firestore profile name
  try {
    const snap = await getDoc(doc(db, "students", user.uid));
    if (snap.exists()) {
      const name = (snap.data().name || "").trim();
      if (name) return cache(name);
    }
  } catch (_) { /* Firestore unavailable — fall through */ }

  // 2. Firebase Auth displayName
  if (user.displayName && user.displayName.trim()) {
    return cache(user.displayName.trim());
  }

  // 3. Email prefix (john.doe@school.com → "john.doe")
  if (user.email) {
    const prefix = user.email.split("@")[0].trim();
    if (prefix) return cache(prefix);
  }

  // 4. Cached value from a previous session
  const cached = getCachedStudentId();
  if (cached) return cached;

  // 5. Last resort
  const fallback = "stu_" + Math.random().toString(36).slice(2, 8);
  return cache(fallback);
}

// ── React hook — resolves on mount, re-resolves when auth changes ────────────
// Usage:  const studentId = useStudentId();
import { useState, useEffect } from "react";

export function useStudentId() {
  const [studentId, setStudentId] = useState(getCachedStudentId);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      const id = await resolveStudentId(user);
      setStudentId(id);
    });
    return () => unsub();
  }, []);

  return studentId;
}