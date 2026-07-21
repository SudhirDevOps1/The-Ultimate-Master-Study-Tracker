import { useEffect } from "react";
import { db as dexieDb } from "@/lib/db";
import { auth, db as firestoreDb, isFirebaseConfigured } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useAppStore } from "@/store/useAppStore";

export function useCloudSync() {
  const setCloudSyncStatus = useAppStore(state => state.setCloudSyncStatus);
  const setUser = useAppStore(state => state.setUser);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        setUser({ uid: user.uid, email: user.email, displayName: user.displayName });
        setCloudSyncStatus("syncing");
        try {
          await syncDexieToFirestore(user.uid);
          setCloudSyncStatus("synced");
        } catch (error) {
          console.error("Cloud sync failed:", error);
          setCloudSyncStatus("error");
        }
      } else {
        setUser(null);
        setCloudSyncStatus("idle");
      }
    });

    return () => unsubscribe();
  }, [setCloudSyncStatus, setUser]);
}

async function syncDexieToFirestore(uid: string) {
  if (!firestoreDb) return;
  
  // Example sync logic for subjects
  const subjects = await dexieDb.subjects.toArray();
  const subjectsRef = collection(firestoreDb, `users/${uid}/subjects`);
  
  for (const subject of subjects) {
    await setDoc(doc(subjectsRef, subject.id), subject, { merge: true });
  }

  // Example sync logic for sessions
  const sessions = await dexieDb.sessions.toArray();
  const sessionsRef = collection(firestoreDb, `users/${uid}/sessions`);
  
  for (const session of sessions) {
    await setDoc(doc(sessionsRef, session.id), session, { merge: true });
  }

  // Add more sync logic for settings/goals here
}
