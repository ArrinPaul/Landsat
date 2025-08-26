"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/hooks/use-language"
import { AuthProvider } from "@/hooks/use-auth"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <LanguageProvider>
        <AuthProvider>
            {children}
            <Toaster />
        </AuthProvider>
      </LanguageProvider>
    </NextThemesProvider>
  )
}
