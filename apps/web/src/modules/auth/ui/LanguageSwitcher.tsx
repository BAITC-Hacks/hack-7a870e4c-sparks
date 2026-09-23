"use client";

import { useLocale, useTranslations } from "next-intl";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui";
import { usePathname, useRouter } from "@/shared/configs/i18/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Select value={locale} onValueChange={(nextLocale) =>
      router.replace(pathname + window.location.search + window.location.hash, { locale: nextLocale, scroll: false })
    }>
      <SelectTrigger aria-label={t("language")} className="w-20"><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>
        <SelectItem value="ru">RU</SelectItem>
        <SelectItem value="kk">ҚАЗ</SelectItem>
      </SelectGroup></SelectContent>
    </Select>
  );
}
