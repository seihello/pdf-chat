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

  return (
    <div className="flex flex-col items-stretch gap-y-4 px-2 py-12 sm:py-24">
      <h1 className="rounded-sm px-8 py-4 text-center text-3xl font-bold text-white sm:text-4xl">
        Talk about your file with AI!
      </h1>
      {isLoading ? (
        <div className="flex items-center justify-center">
          Checking status...
        </div>
      ) : isRunning ? (
        <MainView />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-y-8">
          <p>
            {`I'm sorry. The service is currently unavailable due to maintenance. Please
          try again later.`}
          </p>
          <img src="/maintenance.svg" className="h-auto w-96" />
        </div>
      )}
    </div>
  );
}
