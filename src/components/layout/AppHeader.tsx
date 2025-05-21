
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomAvatar } from "@/components/common/CustomAvatar";
import { useAuth } from "@/hooks/useAuth";
import { auth, db, rtdb, databaseRef, rtdbSet, rtdbServerTimestamp } from "@/lib/firebase"; // Import RTDB items
import { signOut } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIconLucide, Settings, LifeBuoy } from "lucide-react";
import { LogoIcon } from "@/components/icons/LogoIcon";

export function AppHeader() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    if (user) {
      try {
        // Update Firestore status
        const userFirestoreRef = doc(db, "users", user.uid);
        await updateDoc(userFirestoreRef, {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });

        // Update RTDB status
        const userRtdbRef = databaseRef(rtdb, '/status/' + user.uid);
        await rtdbSet(userRtdbRef, {
          isOnline: false,
          lastSeen: rtdbServerTimestamp(),
          displayName: user.displayName || user.email,
        });

      } catch (error) {
        console.error("Error updating user status on sign out:", error);
      }
    }
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
      <Link href="/chat" className="flex items-center gap-2">
        <LogoIcon className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold text-foreground hidden sm:inline-block">
          Gongo Bongo
        </span>
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <CustomAvatar
                  src={user.photoURL}
                  alt={user.displayName || user.email || "User"}
                  fallback={(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  className="h-9 w-9"
                  data-ai-hint="person avatar"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <UserIconLucide className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LifeBuoy className="mr-2 h-4 w-4" />
                <span>Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => router.push("/login")}>Login</Button>
        )}
      </div>
    </header>
  );
}

