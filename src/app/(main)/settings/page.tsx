
// This is now a client component
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Sun, Moon, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CustomAvatar } from "@/components/common/CustomAvatar";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { updateProfile, updateEmail, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'; // Added deleteDoc
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from 'next/navigation';

const NOTIFICATION_SETTINGS_KEY = 'gongoBongoNotificationSettings';

interface NotificationSettings {
  desktopEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
}

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});
type ChangePasswordFormInputs = z.infer<typeof changePasswordSchema>;


export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  const [currentDisplayName, setCurrentDisplayName] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPhotoURL, setCurrentPhotoURL] = useState("");
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [openChangePasswordDialog, setOpenChangePasswordDialog] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);


  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPasswordForm } = useForm<ChangePasswordFormInputs>({
    resolver: zodResolver(changePasswordSchema),
  });


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
      console.log("Initial Notification.permission:", Notification.permission);
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
        console.log("Notification permission request result:", permission);
        setDesktopNotificationPermission(permission);
        if (permission === 'granted') {
          setNotificationSettings(prev => ({ ...prev, desktopEnabled: true }));
          toast({ title: "Success", description: "Desktop notifications enabled." });
        } else {
          setNotificationSettings(prev => ({ ...prev, desktopEnabled: false }));
          toast({ title: "Permission Not Granted", description: `Desktop notifications permission was ${permission}. You may need to allow them in browser settings.`, variant: "destructive", duration: 7000 });
        }
      } else if (desktopNotificationPermission === 'denied') {
        setNotificationSettings(prev => ({ ...prev, desktopEnabled: false }));
        toast({ title: "Permission Denied by Browser", description: "Desktop notifications are blocked by your browser. Please enable them in your browser/OS settings for this site to use this feature.", variant: "destructive", duration: 9000 });
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
      
      if (currentDisplayName !== (user.displayName || "")) {
        authUpdates.displayName = currentDisplayName;
      }
      if (currentPhotoURL !== (user.photoURL || "")) {
        authUpdates.photoURL = currentPhotoURL;
      }
      
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(auth.currentUser, authUpdates);
      }

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
          } else if (error.code === 'auth/operation-not-allowed') {
             toast({
              title: "Email Update Not Allowed",
              description: error.message || "Could not update email. This may be due to project settings (e.g., email verification needed) or other restrictions.",
              variant: "destructive",
              duration: 9000,
            });
          } else if (error.code === 'auth/invalid-email') {
             toast({
              title: "Invalid Email",
              description: "The new email address is not valid.",
              variant: "destructive",
              duration: 5000,
            });
          }
          else {
            console.error("Error updating email in Auth:", error);
            toast({
              title: "Email Update Error",
              description: error.message || "An unexpected error occurred while updating your email.",
              variant: "destructive",
              duration: 7000,
            });
          }
          setIsSavingProfile(false);
          return;
        }
      }
      
      await auth.currentUser.reload();
      toast({ title: "Success", description: "Profile updated successfully!" });
      setIsEditingPhoto(false); 
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onSubmitChangePassword: SubmitHandler<ChangePasswordFormInputs> = async (data) => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "You are not logged in.", variant: "destructive" });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser, data.newPassword);
      toast({ title: "Success", description: "Password updated successfully." });
      setOpenChangePasswordDialog(false);
      resetPasswordForm();
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast({
          title: "Action Requires Recent Login",
          description: "For security, please log out and log back in before changing your password.",
          variant: "destructive",
          duration: 7000,
        });
      } else {
        toast({ title: "Error", description: error.message || "Could not update password.", variant: "destructive" });
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "You are not logged in.", variant: "destructive" });
      return;
    }
    setIsDeletingAccount(true);
    try {
      // Optional: Delete user's Firestore document
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await deleteDoc(userDocRef); // This is optional, depends on your data retention policy

      await deleteUser(auth.currentUser);
      toast({ title: "Account Deleted", description: "Your account has been successfully deleted." });
      // AuthProvider and MainAppLayout will handle redirect on auth state change
      router.push('/login'); // Force redirect
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast({
          title: "Action Requires Recent Login",
          description: "For security, please log out and log back in before deleting your account.",
          variant: "destructive",
          duration: 7000,
        });
      } else {
        toast({ title: "Error", description: error.message || "Could not delete account.", variant: "destructive" });
      }
    } finally {
      setIsDeletingAccount(false);
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
                  <span className="text-xs text-destructive font-medium">Permission blocked by browser.</span>
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
                disabled // Feature not implemented
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
            <Dialog open={openChangePasswordDialog} onOpenChange={setOpenChangePasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">Change Password</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your new password below. Make sure it's at least 6 characters long.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitPassword(onSubmitChangePassword)} className="space-y-4">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" {...registerPassword("newPassword")} />
                    {passwordErrors.newPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" {...registerPassword("confirmPassword")} />
                    {passwordErrors.confirmPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword.message}</p>}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isUpdatingPassword}>
                      {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="w-full" disabled>
              Two-Factor Authentication
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive"/>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Yes, Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    