
"use client";
// Note: The AuthForm component itself handles tab switching.
// We can rely on the user to click the "Sign Up" tab or link.
// Alternatively, we could pass a prop to AuthForm to default to a tab,
// but for simplicity, we'll use the same component.

import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FiryLoadingScreen } from "@/components/common/FiryLoadingScreen"; // Import FiryLoadingScreen

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/chat");
    }
  }, [user, loading, router]);

  if (loading || (!loading && user)) {
     return <FiryLoadingScreen />; // Use FiryLoadingScreen
  }
  
  return <AuthForm />;
}
