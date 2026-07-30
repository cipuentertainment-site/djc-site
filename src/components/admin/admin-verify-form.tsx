"use client";

import { useState, useTransition } from "react";
import { LockKeyhole } from "lucide-react";

import {
  verifyAdminPasswordAction,
  type VerifyActionResult,
} from "@/app/admin/verify/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminVerifyForm() {
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<VerifyActionResult>();
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const actionResult = await verifyAdminPasswordAction(password);
      setResult(actionResult);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {result ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {result.message}
        </p>
      ) : null}
      <Button className="w-full" onClick={submit} disabled={isPending}>
        <LockKeyhole className="h-4 w-4" />
        {isPending ? "Checking..." : "Continue"}
      </Button>
    </div>
  );
}
