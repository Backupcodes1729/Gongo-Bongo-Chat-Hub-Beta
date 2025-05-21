
"use client";

import React, { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase"; // Added db
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore"; // Added doc, setDoc, serverTimestamp, getDoc
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { LogoIcon } from "@/components/icons/LogoIcon";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = z.object({
  displayName: z.string().min(3, { message: "Display name must be at least 3 characters" }).max(30, { message: "Display name must be at most 30 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormInputs = z.infer<typeof loginSchema>;
type SignupFormInputs = z.infer<typeof signupSchema>;

export function AuthForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      toast({ title: "Success", description: "Signed in with Google successfully." });
      // AuthProvider handles Firestore document creation for Google Sign-In
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onLoginSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: "Success", description: "Logged in successfully." });
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      if (userCredential.user) {
        // Update Firebase Auth profile with display name
        await updateProfile(userCredential.user, {
          displayName: data.displayName,
          // photoURL can be set here later if we allow avatar upload during signup
        });
        // Reload the user to ensure the local Auth state has the displayName
        await userCredential.user.reload();

        // Create/update the user document in Firestore
        const userDocRef = doc(db, "users", userCredential.user.uid);
        
        const userDataToSet = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: data.displayName, // Use displayName from the form directly
          photoURL: userCredential.user.photoURL, // Use photoURL from reloaded Auth user (might be null)
          lastLogin: serverTimestamp(),
        };

        // Check if document exists to conditionally add createdAt
        // This is a safeguard, typically it won't exist for a new signup.
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          await setDoc(userDocRef, {
            ...userDataToSet,
            createdAt: serverTimestamp(),
          });
        } else {
          // If it somehow exists (e.g., due to a very rapid AuthProvider trigger, though unlikely here),
          // merge the data. This ensures our form's displayName takes precedence.
          await setDoc(userDocRef, userDataToSet, { merge: true });
        }
      }

      toast({ title: "Success", description: "Account created successfully!" });
      signupForm.reset();
      // No need to setActiveTab or router.push; AuthProvider and page/layout useEffects will handle redirection.
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="items-center text-center">
        <LogoIcon className="h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-2xl">Gongo Bongo Chat Hub</CardTitle>
        <CardDescription>
          {activeTab === "login" ? "Welcome back! Sign in to continue." : "Create an account to get started."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="m@example.com" {...loginForm.register("email")} />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" {...loginForm.register("password")} />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              {error && activeTab === "login" && (
                <div className="flex items-center text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-displayName">Display Name</Label>
                <Input id="signup-displayName" type="text" placeholder="Your Name" {...signupForm.register("displayName")} />
                {signupForm.formState.errors.displayName && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.displayName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="m@example.com" {...signupForm.register("email")} />
                {signupForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" {...signupForm.register("password")} />
                {signupForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirmPassword">Confirm Password</Label>
                <Input id="signup-confirmPassword" type="password" {...signupForm.register("confirmPassword")} />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              {error && activeTab === "signup" && (
                 <div className="flex items-center text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                   <AlertTriangle className="h-4 w-4 mr-2" />
                   {error}
                 </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
              <path
                fill="currentColor"
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.05 1.67-3.42 0-6.17-2.95-6.17-6.5s2.75-6.5 6.17-6.5c1.83 0 3.18.79 4.1 1.73l2.52-2.38C18.03 2.39 15.88 1.5 12.48 1.5c-5.48 0-9.94 4.44-9.94 9.93s4.46 9.93 9.94 9.93c2.7 0 4.86-.92 6.48-2.61s2.38-4.06 2.38-6.88c0-.5-.05-.92-.15-1.34H12.48z"
              />
            </svg>
          )}
          Google
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        {activeTab === "login" ? (
          <p>
            Don't have an account?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => { signupForm.reset(); setError(null); setActiveTab("signup");}}>
              Sign up
            </Button>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => { loginForm.reset(); setError(null); setActiveTab("login");}}>
              Login
            </Button>
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
    

    