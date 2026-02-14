"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/lib/settings";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();

  const locale = useSettingsStore((state) => state.locale);
  const density = useSettingsStore((state) => state.density);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const seasonalEffects = useSettingsStore((state) => state.seasonalEffects);

  const setLocale = useSettingsStore((state) => state.setLocale);
  const setDensity = useSettingsStore((state) => state.setDensity);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const setSeasonalEffects = useSettingsStore((state) => state.setSeasonalEffects);
  const triggerSnow = useSettingsStore((state) => state.triggerSnow);

  return (
    <AppShell title={t("title")} subtitle={t("subtitle")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("appearance")}</CardTitle>
            <CardDescription>Theme, motion and density preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <div className="flex flex-wrap gap-2">
                {(["system", "light", "dark"] as const).map((value) => (
                  <Button key={value} type="button" variant={theme === value ? "default" : "outline"} size="sm" onClick={() => setTheme(value)}>
                    {value}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("density")}</Label>
              <div className="flex gap-2">
                <Button type="button" variant={density === "normal" ? "default" : "outline"} size="sm" onClick={() => setDensity("normal")}>{t("normal")}</Button>
                <Button type="button" variant={density === "dense" ? "default" : "outline"} size="sm" onClick={() => setDensity("dense")}>{t("dense")}</Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <div>
                <p className="text-sm font-medium">{t("reducedMotion")}</p>
                <p className="text-xs text-muted-foreground">Disable non-essential animation and delight effects.</p>
              </div>
              <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("language")}</CardTitle>
            <CardDescription>UI locale for the platform interface.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button type="button" variant={locale === "en" ? "default" : "outline"} size="sm" onClick={() => setLocale("en")}>English</Button>
              <Button type="button" variant={locale === "fr" ? "default" : "outline"} size="sm" onClick={() => setLocale("fr")}>Français</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("notifications")}</CardTitle>
            <CardDescription>Feedback behavior for long-running actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium">{t("toasts")}</p>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium">{t("sound")}</p>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("delight")}</CardTitle>
            <CardDescription>Optional micro-interactions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium">{t("seasonal")}</p>
              <Switch checked={seasonalEffects} onCheckedChange={setSeasonalEffects} />
            </div>
            <Button type="button" variant="outline" onClick={triggerSnow}>{t("trySnow")}</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" id="profile">
          <CardHeader>
            <CardTitle>{t("privacy")}</CardTitle>
            <CardDescription>{t("privacyText")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <p className="text-sm font-medium">{t("about")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("version")}: {process.env.NEXT_PUBLIC_APP_VERSION || "dev"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Build: {process.env.NEXT_PUBLIC_BUILD_SHA || "local"}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <p className="text-sm font-medium">Preferences persistence</p>
              <p className="mt-1 text-xs text-muted-foreground">Preferences are stored locally and applied instantly across routes.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
