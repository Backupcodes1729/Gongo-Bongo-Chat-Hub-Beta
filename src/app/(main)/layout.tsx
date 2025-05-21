
"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { db, auth, rtdb, databaseRef, rtdbSet, rtdbOnDisconnect, rtdbServerTimestamp } from "@/lib/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { FiryLoadingScreen } from "@/components/common/FiryLoadingScreen"; // Import FiryLoadingScreen

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.uid) {
      const userDocRef = doc(db, "users", user.uid);
      const userStatusRtdbRef = databaseRef(rtdb, '/status/' + user.uid);

      // Set initial online status in Firestore
      updateDoc(userDocRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
      }).catch(console.error);

      // Set initial online status in RTDB & setup onDisconnect
      rtdbSet(userStatusRtdbRef, {
        isOnline: true,
        lastSeen: rtdbServerTimestamp(),
        displayName: user.displayName || user.email,
      }).then(() => {
        rtdbOnDisconnect(userStatusRtdbRef).set({
          isOnline: false,
          lastSeen: rtdbServerTimestamp(),
          displayName: user.displayName || user.email,
        }).catch((err) => console.error("Error setting onDisconnect for RTDB:", err));
      }).catch(err => console.error("Error setting initial RTDB status:", err));
      
      // Periodically update Firestore lastSeen to keep the user marked as active in Firestore
      // This also serves as a fallback if RTDB onDisconnect fails or for clients not listening to RTDB.
      const intervalId = setInterval(() => {
        if (auth.currentUser) { 
           updateDoc(userDocRef, {
             lastSeen: serverTimestamp(),
             isOnline: true, 
           }).catch(console.error);
        }
      }, 60000); // Every 60 seconds


      return () => {
        clearInterval(intervalId);
        // Note: Graceful logout (setting offline in RTDB & Firestore) is handled by AppHeader.
        // The onDisconnect hook handles abrupt closures for RTDB.
        // If the user navigates away from MainAppLayout but stays logged in (e.g. single page app navigation),
        // their RTDB status will remain online until onDisconnect fires or they log out.
      };
    }
  }, [user?.uid, user?.displayName, user?.email]);


  if (loading) {
    return <FiryLoadingScreen />; // Use FiryLoadingScreen
  }

  if (!user) {
    // This case should ideally be handled by the redirect, 
    // but as a fallback, showing a loading screen or null is fine.
    return <FiryLoadingScreen />; // Or return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
