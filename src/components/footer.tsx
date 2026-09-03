"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { ContactSheet } from "@/components/contact-sheet";

export function Footer() {
  const { t } = useLanguage();
  const [isContactOpen, setContactOpen] = useState(false);

  return (
    <>
      <footer id="contact" className="py-6 w-full shrink-0 border-t">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/#about" className="text-xs hover:underline underline-offset-4 text-muted-foreground">
              {t('footer.about')}
            </Link>
            <Link
              href="#contact"
              className="text-xs hover:underline underline-offset-4 text-muted-foreground"
              onClick={(e) => { e.preventDefault(); setContactOpen(true); }}
            >
              {t('footer.contact')}
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground text-center">
            {t('footer.copyright')}
          </p>
          <div className="w-24 hidden sm:block"></div>
        </div>
      </footer>
      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
