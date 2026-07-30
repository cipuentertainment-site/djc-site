"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";

import {
  sendAdminMagicLinkAction,
  type LoginActionResult,
} from "@/app/admin/login/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LoginActionResult>();
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const actionResult = await sendAdminMagicLinkAction(email);
      setResult(actionResult);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <ResultMessage result={result} />
      <Button className="w-full" onClick={submit} disabled={isPending}>
        <Mail className="h-4 w-4" />
        {isPending ? "Sending..." : "Send Magic Link"}
      </Button>
    </div>
  );
}
