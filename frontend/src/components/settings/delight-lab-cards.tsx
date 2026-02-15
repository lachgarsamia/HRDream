"use client";

import React from "react";
import { Sparkles, Snowflake, Sun, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ConfettiStyle, SeasonalStyle } from "@/lib/settings";
import { cn } from "@/lib/utils";

type DelightLabCardsProps = {
  seasonalEffects: boolean;
  seasonalStyle: SeasonalStyle;
  snowIntensity: number;
  auroraEnabled: boolean;
  auroraOpacity: number;
  typingAmbience: boolean;
  partyMode: boolean;
  confettiStyle: ConfettiStyle;
  soundEnabled: boolean;
  setSeasonalEffects: (value: boolean) => void;
  setSeasonalStyle: (value: SeasonalStyle) => void;
  setSnowIntensity: (value: number) => void;
  setAuroraEnabled: (value: boolean) => void;
  setAuroraOpacity: (value: number) => void;
  setTypingAmbience: (value: boolean) => void;
  setPartyMode: (value: boolean) => void;
  setConfettiStyle: (value: ConfettiStyle) => void;
  setSoundEnabled: (value: boolean) => void;
  onTrySnow: () => void;
  onBurstConfetti: () => void;
  onTypingPulseDemo: () => void;
};

function ChoicePills<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? "default" : "outline"}
          className="h-8"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function SliderField({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs font-medium">{value.toFixed(2)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  );
}

function DelightSwitch({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-primary">{icon}</span>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

export function DelightLabCards(props: DelightLabCardsProps) {
  const {
    seasonalEffects,
    seasonalStyle,
    snowIntensity,
    auroraEnabled,
    auroraOpacity,
    typingAmbience,
    partyMode,
    confettiStyle,
    soundEnabled,
    setSeasonalEffects,
    setSeasonalStyle,
    setSnowIntensity,
    setAuroraEnabled,
    setAuroraOpacity,
    setTypingAmbience,
    setPartyMode,
    setConfettiStyle,
    setSoundEnabled,
    onTrySnow,
    onBurstConfetti,
    onTypingPulseDemo,
  } = props;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Snowflake className="h-4 w-4 text-primary" />
            Seasonal
          </CardTitle>
          <CardDescription>Theme-aware ambient layer for dark and light workspaces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DelightSwitch
            icon={<Snowflake className="h-4 w-4" />}
            title="Seasonal effects"
            description="Dark mode uses snow. Light mode can use petals or sunbeams."
            checked={seasonalEffects}
            onCheckedChange={setSeasonalEffects}
          />
          <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
            <Label className="text-xs text-muted-foreground">Seasonal style</Label>
            <ChoicePills
              value={seasonalStyle}
              onChange={setSeasonalStyle}
              options={[
                { value: "auto", label: "Auto" },
                { value: "snow", label: "Snow" },
                { value: "petals", label: "Petals" },
                { value: "sunbeams", label: "Sunbeams" },
              ]}
            />
            <SliderField id="snow-intensity" label="Intensity" min={0.4} max={2} step={0.05} value={snowIntensity} onChange={setSnowIntensity} />
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={onTrySnow}>
              Try snow (10s)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Waves className="h-4 w-4 text-primary" />
            Atmosphere
          </CardTitle>
          <CardDescription>Subtle depth and responsive input feedback.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DelightSwitch
            icon={<Sun className="h-4 w-4" />}
            title="Aurora background"
            description="Layered gradient parallax behind cards."
            checked={auroraEnabled}
            onCheckedChange={setAuroraEnabled}
          />
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <SliderField id="aurora-opacity" label="Aurora opacity" min={0.15} max={0.9} step={0.05} value={auroraOpacity} onChange={setAuroraOpacity} />
          </div>
          <DelightSwitch
            icon={<Sparkles className="h-4 w-4" />}
            title="Typing ambience"
            description="500ms ring and glow pulse on active filters."
            checked={typingAmbience}
            onCheckedChange={setTypingAmbience}
          />
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onTypingPulseDemo}>
            Preview typing pulse
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Energy
          </CardTitle>
          <CardDescription>Premium celebration moments for completed shortlist runs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DelightSwitch
            icon={<Sparkles className="h-4 w-4" />}
            title="Party mode"
            description="Confetti burst on success events (rate-limited)."
            checked={partyMode}
            onCheckedChange={setPartyMode}
          />
          <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
            <Label className="text-xs text-muted-foreground">Confetti style</Label>
            <ChoicePills
              value={confettiStyle}
              onChange={setConfettiStyle}
              options={[
                { value: "celebration", label: "Celebration" },
                { value: "streamers", label: "Streamers" },
                { value: "sparkle", label: "Sparkle" },
              ]}
            />
            <div className={cn("flex items-center justify-between rounded-md border border-border/70 px-2.5 py-2")}>
              <p className="text-xs text-muted-foreground">Sound</p>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={onBurstConfetti}>
              Burst confetti
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

