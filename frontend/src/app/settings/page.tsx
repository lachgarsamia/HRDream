"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { DelightLabCards } from "@/components/settings/delight-lab-cards";
import { useTypingPulse } from "@/hooks/use-typing-pulse";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ThemePreference, useSettingsStore } from "@/lib/settings";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();

  const locale = useSettingsStore((state) => state.locale);
  const density = useSettingsStore((state) => state.density);
  const accentPreset = useSettingsStore((state) => state.accentPreset);
  const customAccentHex = useSettingsStore((state) => state.customAccentHex);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);
  const smoothTransitions = useSettingsStore((state) => state.smoothTransitions);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const seasonalEffects = useSettingsStore((state) => state.seasonalEffects);
  const seasonalStyle = useSettingsStore((state) => state.seasonalStyle);
  const snowIntensity = useSettingsStore((state) => state.snowIntensity);
  const auroraEnabled = useSettingsStore((state) => state.auroraEnabled);
  const auroraOpacity = useSettingsStore((state) => state.auroraOpacity);
  const typingAmbience = useSettingsStore((state) => state.typingAmbience);
  const partyMode = useSettingsStore((state) => state.partyMode);
  const confettiStyle = useSettingsStore((state) => state.confettiStyle);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const focusMode = useSettingsStore((state) => state.focusMode);

  const setLocale = useSettingsStore((state) => state.setLocale);
  const setDensity = useSettingsStore((state) => state.setDensity);
  const setAccentPreset = useSettingsStore((state) => state.setAccentPreset);
  const setCustomAccentHex = useSettingsStore((state) => state.setCustomAccentHex);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const setAnimationsEnabled = useSettingsStore((state) => state.setAnimationsEnabled);
  const setSmoothTransitions = useSettingsStore((state) => state.setSmoothTransitions);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const setSeasonalEffects = useSettingsStore((state) => state.setSeasonalEffects);
  const setSeasonalStyle = useSettingsStore((state) => state.setSeasonalStyle);
  const setSnowIntensity = useSettingsStore((state) => state.setSnowIntensity);
  const setAuroraEnabled = useSettingsStore((state) => state.setAuroraEnabled);
  const setAuroraOpacity = useSettingsStore((state) => state.setAuroraOpacity);
  const setTypingAmbience = useSettingsStore((state) => state.setTypingAmbience);
  const setPartyMode = useSettingsStore((state) => state.setPartyMode);
  const setConfettiStyle = useSettingsStore((state) => state.setConfettiStyle);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const setFocusMode = useSettingsStore((state) => state.setFocusMode);
  const triggerSnow = useSettingsStore((state) => state.trySnow);
  const triggerConfetti = useSettingsStore((state) => state.burstConfetti);
  const { pulsing: previewPulsing, onType: previewTypingPulse } = useTypingPulse(500);

  return (
    <AppShell title={t("title")} subtitle={t("subtitle")}>
      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-6">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
          <TabsTrigger value="motion">Motion</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="delight">Delight Lab</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{t("appearance")}</CardTitle>
              <CardDescription>Theme, density and focus behavior.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border/70 p-3">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  {(["system", "light", "dark"] as const).map((value) => (
                    <Button key={value} type="button" variant={theme === value ? "default" : "outline"} size="sm" onClick={() => setTheme(value as ThemePreference)}>
                      {value}
                    </Button>
                  ))}
                </div>
                <Label>Accent color</Label>
                <div className="flex flex-wrap gap-2">
                  {(["system", "indigo", "emerald", "rose", "amber", "cyan", "custom"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={accentPreset === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAccentPreset(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
                {accentPreset === "custom" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-accent">Custom accent</Label>
                    <Input
                      id="custom-accent"
                      type="color"
                      value={customAccentHex}
                      className="h-9 w-20 p-1"
                      onChange={(event) => setCustomAccentHex(event.target.value)}
                    />
                  </div>
                ) : null}
                <Label>{t("density")}</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={density === "normal" ? "default" : "outline"} size="sm" onClick={() => setDensity("normal")}>{t("normal")}</Button>
                  <Button type="button" variant={density === "dense" ? "default" : "outline"} size="sm" onClick={() => setDensity("dense")}>{t("dense")}</Button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Focus mode</p>
                  <Switch checked={focusMode} onCheckedChange={setFocusMode} />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
                <p className="text-sm font-medium">Preview</p>
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-sm font-medium">Candidate review list</p>
                  <p className="text-xs text-muted-foreground">Theme and density changes apply instantly across tables and cards.</p>
                  <div className="mt-2 h-2 w-full rounded bg-muted">
                    <div className="h-full w-2/3 rounded bg-primary" />
                  </div>
                  <div className="mt-2 inline-flex items-center rounded-full border border-border/70 px-2 py-1 text-[11px]">
                    Active theme mode: {theme}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle>{t("language")}</CardTitle>
              <CardDescription>UI translation for navigation and core workflows.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button type="button" variant={locale === "en" ? "default" : "outline"} size="sm" onClick={() => setLocale("en")}>English</Button>
              <Button type="button" variant={locale === "fr" ? "default" : "outline"} size="sm" onClick={() => setLocale("fr")}>Français</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="motion">
          <Card>
            <CardHeader>
              <CardTitle>Motion</CardTitle>
              <CardDescription>Animation controls with reduced-motion safety.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingSwitch label="Animations" checked={animationsEnabled} onCheckedChange={setAnimationsEnabled} />
              <SettingSwitch label={t("reducedMotion")} checked={reducedMotion} onCheckedChange={setReducedMotion} />
              <SettingSwitch label="Smooth transitions" checked={smoothTransitions} onCheckedChange={setSmoothTransitions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t("notifications")}</CardTitle>
              <CardDescription>Feedback channels for uploads and runs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingSwitch label={t("toasts")} checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              <p className="text-xs text-muted-foreground">In-app toast notifications are persisted and applied globally.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delight">
          <Card>
            <CardHeader>
              <CardTitle>Delight Lab</CardTitle>
              <CardDescription>Optional high-end interactions. Always accessibility-safe.</CardDescription>
            </CardHeader>
            <CardContent>
              <DelightLabCards
                seasonalEffects={seasonalEffects}
                seasonalStyle={seasonalStyle}
                snowIntensity={snowIntensity}
                auroraEnabled={auroraEnabled}
                auroraOpacity={auroraOpacity}
                typingAmbience={typingAmbience}
                partyMode={partyMode}
                confettiStyle={confettiStyle}
                soundEnabled={soundEnabled}
                setSeasonalEffects={setSeasonalEffects}
                setSeasonalStyle={setSeasonalStyle}
                setSnowIntensity={setSnowIntensity}
                setAuroraEnabled={setAuroraEnabled}
                setAuroraOpacity={setAuroraOpacity}
                setTypingAmbience={setTypingAmbience}
                setPartyMode={setPartyMode}
                setConfettiStyle={setConfettiStyle}
                setSoundEnabled={setSoundEnabled}
                onTrySnow={triggerSnow}
                onBurstConfetti={triggerConfetti}
                onTypingPulseDemo={previewTypingPulse}
              />
              <div className="mt-3 rounded-lg border border-border/70 p-3">
                <Label htmlFor="typing-preview">Typing pulse preview</Label>
                <Input
                  id="typing-preview"
                  placeholder="Type to preview"
                  onChange={previewTypingPulse}
                  className={`mt-2 h-9 transition-all duration-200 ${
                    previewPulsing ? "ring-2 ring-primary/40 shadow-[0_0_0_6px_rgba(99,102,241,0.2),0_8px_22px_-14px_rgba(79,70,229,0.7)]" : ""
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card id="shortcuts">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>{t("privacyText")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                <p className="text-sm font-medium">{t("about")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("version")}: {process.env.NEXT_PUBLIC_APP_VERSION || "dev"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Build: {process.env.NEXT_PUBLIC_BUILD_SHA || "local"}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                <p className="text-sm font-medium">Keyboard shortcuts</p>
                <p className="mt-1 text-xs text-muted-foreground">⌘K Command Palette · G then H for home (coming soon).</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function SettingSwitch({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
      <p className="text-sm font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
