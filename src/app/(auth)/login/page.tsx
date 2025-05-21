
"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FiryLoadingScreen } from "@/components/common/FiryLoadingScreen"; // Import FiryLoadingScreen

export default function LoginPage() {
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
