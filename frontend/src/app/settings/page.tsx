"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Workspace preferences and account options.">
      <Card className="max-w-2xl border-border/80">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Settings are available here. More controls can be added in later slices.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Dark mode and account controls are available from the sidebar for now.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
