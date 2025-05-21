
// This is now a client component
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Sun, Moon, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CustomAvatar } from "@/components/common/CustomAvatar";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase'; // Import auth and db
import { updateProfile, updateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

const NOTIFICATION_SETTINGS_KEY = 'gongoBongoNotificationSettings';

interface NotificationSettings {
  desktopEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  const [currentDisplayName, setCurrentDisplayName] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPhotoURL, setCurrentPhotoURL] = useState("");
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);


  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    desktopEnabled: false,
    emailEnabled: false,
    soundEnabled: true,
  });
  const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }

    const storedNotificationSettings = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (storedNotificationSettings) {
      try {
        setNotificationSettings(JSON.parse(storedNotificationSettings));
      } catch (e) {
        console.error("Error parsing notification settings from localStorage", e);
      }
    }

    if ('Notification' in window) {
      setDesktopNotificationPermission(Notification.permission);
    } else {
      console.warn("Desktop notifications not supported by this browser.");
    }
  }, []);

  useEffect(() => {
    if (user) {
      setCurrentDisplayName(user.displayName || "");
      setCurrentEmail(user.email || "");
      setCurrentPhotoURL(user.photoURL || "");
    }
  }, [user]);

  useEffect(() => {
    if (!isMounted) return;

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(notificationSettings));
    }
  }, [notificationSettings, isMounted]);

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleDesktopNotificationChange = async (checked: boolean) => {
    if (!('Notification' in window)) {
      toast({ title: "Unsupported", description: "Desktop notifications are not supported by your browser.", variant: "destructive" });
      return;
    }

    if (checked) {
      if (desktopNotificationPermission === 'granted') {
        setNotificationSettings(prev => ({ ...prev, desktopEnabled: true }));
        toast({ title: "Preference Saved", description: "Desktop notifications enabled." });
      } else if (desktopNotificationPermission === 'default') {
        const permission = await Notification.requestPermission();
        setDesktopNotificationPermission(permission);
        if (permission === 'granted') {
          setNotificationSettings(prev => ({ ...prev, desktopEnabled: true }));
          toast({ title: "Success", description: "Desktop notifications enabled." });
        } else {
          setNotificationSettings(prev => ({ ...prev, desktopEnabled: false }));
          toast({ title: "Permission Not Granted", description: `Desktop notifications permission was ${permission}. You may need to allow them in browser settings.`, variant: "destructive" });
        }
      } else if (desktopNotificationPermission === 'denied') {
        setNotificationSettings(prev => ({ ...prev, desktopEnabled: false }));
        toast({ title: "Permission Denied", description: "Desktop notifications are blocked. Please enable them in your browser/OS settings for this site.", variant: "destructive" });
      }
    } else {
      setNotificationSettings(prev => ({ ...prev, desktopEnabled: false }));
      toast({ title: "Preference Saved", description: "Desktop notifications disabled." });
    }
  };

  const handleEmailNotificationChange = (checked: boolean) => {
    setNotificationSettings(prev => ({ ...prev, emailEnabled: checked }));
    toast({ title: "Preference Saved", description: `Email notifications ${checked ? 'enabled' : 'disabled'}. (Backend not implemented)`});
  };
  
  const handleSoundNotificationChange = (checked: boolean) => {
    setNotificationSettings(prev => ({ ...prev, soundEnabled: checked }));
    toast({ title: "Preference Saved", description: `Sound notifications ${checked ? 'enabled' : 'disabled'}.`});
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);

    try {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      const firestoreUpdates: { displayName?: string; email?: string; photoURL?: string } = {};

      if (currentDisplayName !== (user.displayName || "")) {
        authUpdates.displayName = currentDisplayName;
        firestoreUpdates.displayName = currentDisplayName;
      }
      if (currentPhotoURL !== (user.photoURL || "")) {
        authUpdates.photoURL = currentPhotoURL;
        firestoreUpdates.photoURL = currentPhotoURL;
      }
      if (currentEmail !== (user.email || "")) {
        // Email update is separate
        firestoreUpdates.email = currentEmail;
      }
      
      // Update Firebase Auth profile (displayName, photoURL)
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(auth.currentUser, authUpdates);
      }

      // Update Firebase Auth email (if changed)
      if (currentEmail !== (user.email || "")) {
        try {
          await updateEmail(auth.currentUser, currentEmail);
        } catch (error: any) {
          if (error.code === 'auth/requires-recent-login') {
            toast({
              title: "Re-authentication Required",
              description: "Changing your email requires you to sign in again. Please log out and log back in to change your email.",
              variant: "destructive",
              duration: 7000,
            });
          } else {
            throw error; // Re-throw other email update errors
          }
        }
      }
      
      // Reload user to get fresh data from Auth (important for AuthProvider to sync)
      await auth.currentUser.reload();

      // Update Firestore document (AuthProvider will also sync, but this ensures immediate reflection if needed)
      // However, relying on AuthProvider's sync after user.reload() is cleaner.
      // For this iteration, we ensure AuthProvider picks it up.
      // If direct Firestore update is needed here, it would be:
      // const userDocRef = doc(db, "users", user.uid);
      // await updateDoc(userDocRef, firestoreUpdates);


      toast({ title: "Success", description: "Profile updated successfully!" });
      setIsEditingPhoto(false); // Hide photo URL input after save
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };


  if (!isMounted || authLoading) {
    return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    ); 
  }

  const isDesktopSwitchDisabled = desktopNotificationPermission === 'denied';
  const desktopSwitchChecked = (desktopNotificationPermission === 'granted' && notificationSettings.desktopEnabled);

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 bg-background">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          Settings
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Settings */}
        <Card className="md:col-span-1">
          <form onSubmit={handleSaveProfile}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Profile
              </CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <CustomAvatar 
                  src={currentPhotoURL || undefined} 
                  alt={currentDisplayName || "User"} 
                  className="h-24 w-24 mb-2" 
                  data-ai-hint="person avatar"
                  fallback={(currentDisplayName || "U").charAt(0).toUpperCase()}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingPhoto(!isEditingPhoto)}>
                  {isEditingPhoto ? "Cancel Photo Edit" : "Change Photo"}
                </Button>
                {isEditingPhoto && (
                  <div className="w-full space-y-1">
                    <Label htmlFor="photoUrl">Photo URL</Label>
                    <Input 
                      id="photoUrl" 
                      type="url" 
                      placeholder="https://example.com/image.png"
                      value={currentPhotoURL}
                      onChange={(e) => setCurrentPhotoURL(e.target.value)} 
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  id="displayName" 
                  value={currentDisplayName} 
                  onChange={(e) => setCurrentDisplayName(e.target.value)} 
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={currentEmail} 
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSavingProfile}>
                {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Notification Settings */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="desktopNotifications" className={`flex flex-col space-y-1 ${isDesktopSwitchDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                <span>Desktop Notifications</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs sm:text-sm">
                  Receive notifications on your computer.
                </span>
                 {desktopNotificationPermission === 'denied' && (
                  <span className="text-xs text-destructive">Permission blocked in browser.</span>
                )}
              </Label>
              <Switch 
                id="desktopNotifications" 
                checked={desktopSwitchChecked}
                onCheckedChange={handleDesktopNotificationChange}
                disabled={isDesktopSwitchDisabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailNotifications" className="flex flex-col space-y-1 cursor-pointer">
                <span>Email Notifications</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs sm:text-sm">
                  Get important updates via email.
                </span>
              </Label>
              <Switch 
                id="emailNotifications" 
                checked={notificationSettings.emailEnabled}
                onCheckedChange={handleEmailNotificationChange}
              />
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="soundNotifications" className="flex flex-col space-y-1 cursor-pointer">
                <span>Sound Notifications</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs sm:text-sm">
                  Play a sound for new messages.
                </span>
              </Label>
              <Switch 
                id="soundNotifications" 
                checked={notificationSettings.soundEnabled}
                onCheckedChange={handleSoundNotificationChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="darkMode" className="flex items-center gap-2 cursor-pointer">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span>Dark Mode</span>
              </Label>
              <Switch 
                id="darkMode" 
                checked={theme === 'dark'}
                onCheckedChange={handleThemeChange}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Switches theme for your current session.
            </p>
          </CardContent>
        </Card>
        
        {/* Security Settings */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Security
            </CardTitle>
            <CardDescription>Manage your account security.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" disabled>Change Password</Button>
            <Button variant="outline" className="w-full" disabled>Two-Factor Authentication</Button>
            <Button variant="destructive" className="w-full" disabled>Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
