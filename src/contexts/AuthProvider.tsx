
"use client";

import type { ReactNode } from "react";
import React, { createContext, useEffect, useState }  from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db, rtdb, databaseRef, rtdbSet, rtdbServerTimestamp } from "@/lib/firebase"; // Added RTDB imports
import type { User } from "@/lib/types";
import { doc, setDoc, serverTimestamp, getDoc, Timestamp } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); 
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userStatusRtdbRef = databaseRef(rtdb, '/status/' + firebaseUser.uid); // RTDB ref
        
        const authProfileData = {
          email: firebaseUser.email, 
          displayName: firebaseUser.displayName, 
          photoURL: firebaseUser.photoURL, 
        };

        try {
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const newUserDocumentData = {
              uid: firebaseUser.uid,
              ...authProfileData, 
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              isOnline: true,
              lastSeen: serverTimestamp(),
            };
            await setDoc(userRef, newUserDocumentData);
            // Set RTDB status
            await rtdbSet(userStatusRtdbRef, {
              isOnline: true,
              lastSeen: rtdbServerTimestamp(),
              displayName: firebaseUser.displayName, // Optional: store displayName in RTDB for convenience
            });
            
            const createdSnap = await getDoc(userRef); // Re-fetch to get server timestamps
            setUser(createdSnap.exists() ? createdSnap.data() as User : firebaseUser as User);

          } else {
            const updateData: Partial<User> = {
              ...authProfileData, 
              lastLogin: serverTimestamp(),
              isOnline: true, // Explicitly set online on login/auth state change
              lastSeen: serverTimestamp(),
            };
            await setDoc(userRef, updateData, { merge: true });
             // Update RTDB status
            await rtdbSet(userStatusRtdbRef, {
              isOnline: true,
              lastSeen: rtdbServerTimestamp(),
              displayName: firebaseUser.displayName,
            });
            
            const updatedSnap = await getDoc(userRef); // Re-fetch to get server timestamps
            setUser(updatedSnap.exists() ? updatedSnap.data() as User : firebaseUser as User);
          }
        } catch (error) {
          console.error("Error managing user document in AuthProvider:", error);
          setUser(firebaseUser as User); // Fallback
        }
      } else {
        setUser(null);
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

