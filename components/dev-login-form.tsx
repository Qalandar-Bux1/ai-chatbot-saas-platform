"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import LoadingDots from "@/components/loading-dots";
import { Icons } from "./icons";

interface DevLoginFormProps {
  enabled?: boolean;
}

export default function DevLoginForm({ enabled = false }: DevLoginFormProps) {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  if (!enabled) return null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          await signIn("dev-login", {
            callbackUrl: searchParams?.get("from") || "/welcome",
          });
        } finally {
          setLoading(false);
        }
      }}
      className="flex flex-col space-y-3 px-4 mb-4 sm:px-16"
    >
      <button
        disabled={loading}
        className={`${loading
          ? "cursor-not-allowed border-gray-200 bg-gray-100"
          : "border-blue-800 bg-blue-700 text-white hover:bg-blue-800"
          } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
      >
        {loading ? (
          <LoadingDots color="#808080" />
        ) : (
          <div className="flex flex-row items-center">
            <Icons.bot className="mr-2 h-4 w-4" />
            <p>Sign In (Local Dev)</p>
          </div>
        )}
      </button>
      <p className="text-xs text-muted-foreground text-left">
        Local development shortcut. Disable with `DEV_LOGIN_ENABLED=false`.
      </p>
    </form>
  );
}
