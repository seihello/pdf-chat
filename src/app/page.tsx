"use client";
import MainView from "@/components/home/main-view";
import isSupabaseRunning from "@/lib/supabase/is-supabase-running";
import { useEffect, useState } from "react";

export default function RootPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const getSupabaseRunning = async () => {
      try {
        const isRunning = await isSupabaseRunning();
        setIsRunning(isRunning);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    getSupabaseRunning();
  }, []);

  return isLoading ? (
    <div className="flex h-80 items-center justify-center">
      Checking status...
    </div>
  ) : isRunning ? (
    <MainView />
  ) : (
    <div className="flex h-80 items-center justify-center">
      {`I'm sorry. The service is currently unavailable due to maintenance. Please
      try again later.`}
    </div>
  );
}
