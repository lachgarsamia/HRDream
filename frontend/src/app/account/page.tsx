"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";

export default function AccountPage() {
  const { user } = useAuth();

  return (
    <AppShell title="Account" subtitle="Profile and workspace membership details.">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your authenticated account for CV Shortlister.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
          <p><span className="text-muted-foreground">User ID:</span> {user?.id}</p>
          <p className="text-muted-foreground">Use Settings to customize appearance, language and delight behavior.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
