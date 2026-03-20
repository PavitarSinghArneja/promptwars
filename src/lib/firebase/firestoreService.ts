/**
 * Aegis Bridge — Firestore Service
 * Write and read triage reports. Authenticated users only.
 * No-ops gracefully when Firestore is not configured.
 */
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./client";
import type { TriageOutput } from "@/lib/triageSchema";

export interface TriageRecord extends TriageOutput {
  id?: string;
  responderId: string;
  createdAt: Timestamp | null;
}

const COLLECTION = "triageReports";

export async function saveTriageReport(
  data: TriageOutput,
  responderId: string
): Promise<string> {
  if (!db) return "";
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    responderId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getTriageHistory(
  responderId: string,
  limitCount = 10
): Promise<TriageRecord[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("responderId", "==", responderId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TriageRecord));
}
