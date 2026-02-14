"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useMemo } from "react";
import en from "@/i18n/messages/en.json";
import fr from "@/i18n/messages/fr.json";
import { useSettingsStore } from "@/lib/settings";

const messages = { en, fr } as const;

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSettingsStore((state) => state.locale);
  const activeMessages = useMemo(() => messages[locale], [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={activeMessages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
