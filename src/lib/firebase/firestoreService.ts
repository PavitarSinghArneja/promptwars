/**
 * Aegis Bridge — Firestore Service
 * Write and read triage reports. Authenticated users only.
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

/**
 * Save a triage report to Firestore.
 * Returns the document ID on success.
 */
export async function saveTriageReport(
  data: TriageOutput,
  responderId: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    responderId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Fetch the last N triage reports for a responder.
 */
export async function getTriageHistory(
  responderId: string,
  limitCount = 10
): Promise<TriageRecord[]> {
  const q = query(
    collection(db, COLLECTION),
    where("responderId", "==", responderId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TriageRecord));
}
