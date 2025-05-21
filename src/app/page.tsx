
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FiryLoadingScreen } from "@/components/common/FiryLoadingScreen";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/chat");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return <FiryLoadingScreen />;
}
