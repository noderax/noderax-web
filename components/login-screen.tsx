"use client";

import { startTransition, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  BellRing,
  Cpu,
  Globe,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Server,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { AnimatePresence, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { BrandBadge } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Reveal } from "@/components/magic/reveal";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Particles } from "@/components/ui/particles";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { motion } from "motion/react";
import { MagicCard } from "@/components/ui/magic-card";
import {
  useLogin,
  useVerifyMfaChallenge,
  useVerifyMfaRecovery,
} from "@/lib/hooks/use-auth-session";
import {
  buildWorkspacePath,
  clearPersistedWorkspaceSlug,
  persistWorkspaceSlug,
  pickDefaultWorkspace,
  readWorkspaceChildPath,
} from "@/lib/workspace";
import type { AuthSession, LoginResponseDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { AUTH_FLASH_ERROR_COOKIE } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

const overviewChips = [
  "Multi-Server Management",
  "Workspace Containers",
  "Team Orchestration",
  "Granular Alerts",
] as const;

const workspaceHighlights: readonly {
  title: string;
  description: string;
  icon: LucideIcon;
  toneClassName: string;
}[] = [
  {
    title: "Global Inventory",
    description:
      "Orchestrate thousands of nodes across multiple workspaces from a single plane.",
    icon: Server,
    toneClassName: "tone-brand",
  },
  {
    title: "Granular Notifications",
    description:
      "Fine-tune alerting with level-based filtering for Email and Telegram.",
    icon: BellRing,
    toneClassName: "tone-warning",
  },
  {
    title: "Team-Based Access",
    description:
      "Provision members and define team-scoped task targets with absolute precision.",
    icon: ShieldCheck,
    toneClassName: "tone-success",
  },
] as const;

const loginMessageCopy: Record<string, string> = {
  "invite-accepted":
    "Account activated. Sign in with the password you just created.",
  "password-reset": "Password reset complete. Sign in with your new password.",
  "password-updated": "Password updated. Sign in again to continue.",
};

const isAuthSession = (
  value: AuthSession | LoginResponseDto,
): value is AuthSession =>
  Array.isArray((value as AuthSession).scopes) &&
  typeof (value as AuthSession).tokenPreview === "string";

const isMfaChallenge = (
  value: AuthSession | LoginResponseDto,
): value is LoginResponseDto =>
  Boolean(
    !isAuthSession(value) &&
    value.requiresMfa &&
    typeof value.mfaChallengeToken === "string",
  );

const OSLogos = {
  Ubuntu: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="64"
      height="64"
      viewBox="0 0 32 32"
      preserveAspectRatio="xMidYMid"
    >
      <path
        d="M32 16c0 8.836-7.164 16-16 16S0 24.836 0 16 7.164 0 16 0s16 7.164 16 16z"
        fill="#dd4814"
      />
      <path
        d="M5.12 13.864c-1.18 0-2.137.956-2.137 2.137s.956 2.136 2.137 2.136S7.257 17.18 7.257 16 6.3 13.864 5.12 13.864zm15.252 9.71c-1.022.6-1.372 1.896-.782 2.917s1.895 1.372 2.917.782 1.372-1.895.782-2.917-1.896-1.37-2.917-.782zM9.76 16a6.23 6.23 0 0 1 2.653-5.105L10.852 8.28a9.3 9.3 0 0 0-3.838 5.394C7.69 14.224 8.12 15.06 8.12 16s-.432 1.776-1.106 2.326c.577 2.237 1.968 4.146 3.838 5.395l1.562-2.616A6.23 6.23 0 0 1 9.761 16zM16 9.76a6.24 6.24 0 0 1 6.215 5.687l3.044-.045a9.25 9.25 0 0 0-2.757-6.019c-.812.307-1.75.26-2.56-.208a2.99 2.99 0 0 1-1.461-2.118C17.7 6.84 16.86 6.72 16 6.72c-1.477 0-2.873.347-4.113.96l1.484 2.66c.8-.372 1.69-.58 2.628-.58zm0 12.48c-.94 0-1.83-.21-2.628-.58l-1.484 2.66c1.24.614 2.636.96 4.113.96a9.28 9.28 0 0 0 2.479-.338c.14-.858.65-1.648 1.46-2.118s1.75-.514 2.56-.207a9.25 9.25 0 0 0 2.757-6.019l-3.045-.045A6.24 6.24 0 0 1 16 22.24zm4.372-13.813c1.022.6 2.328.24 2.917-.78s.24-2.328-.78-2.918-2.328-.24-2.918.783-.24 2.327.782 2.917z"
        fill="#fff"
      />
    </svg>
  ),
  Debian: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 800"
      width="64"
      height="64"
    >
      <g fill="#d70751">
        <path d="M706.38 433.32c-19.85.473 3.78 10.398 29.776 14.18 7.1-5.672 13.706-11.343 19.378-16.542-16.07 3.78-32.6 3.78-49.153 2.363m106.812-26.468c11.816-16.542 20.323-34.03 23.63-52.462-2.836 13.234-9.925 24.577-16.542 36.392-37.338 23.16-3.308-13.706 0-27.885-40.173 50.098-5.672 29.776-7.1 43.954m39.24-102.56c2.363-35.92-7.1-24.577-10.398-10.87 3.78 2.363 6.617 25.522 10.398 10.87m-221.2-488.695c10.398 1.9 23.16 3.308 21.268 5.672 11.343-2.363 14.18-4.726-21.268-5.672m21.268 6.143l-7.562 1.418 7.1-.473.473-.945M982.866 318c1.418 32.14-9.453 47.735-18.905 75.148l-17.015 8.507c-14.18 27.412 1.418 17.487-8.507 39.228-21.74 19.378-66.64 60.97-80.82 64.75-10.398 0 7.1-12.288 9.453-17.015-29.303 20.323-23.63 30.248-68.53 42.536l-1.418-2.836c-110.595 52-264.67-51.044-262.308-191.887-.945 8.98-3.308 6.617-5.672 10.398-5.672-72.312 33.557-145.096 99.724-174.872 64.75-32.14 140.37-18.905 186.688 24.104-25.522-33.084-76.093-68.53-136.117-65.223-58.606.945-113.903 38.283-131.863 78.93-30.248 18.905-33.557 73.257-46.8 83.182-17.487 129.5 33.084 185.742 119.102 251.438 13.706 8.98 3.78 10.398 5.672 17.487-28.358-13.234-54.825-33.557-76.093-58.133 11.343 16.542 23.63 33.084 39.7 45.845-26.94-8.98-62.86-65.223-73.257-67.586 46.317 83.182 188.578 146.042 262.78 114.848-34.502 1.418-77.983.473-116.74-13.706-16.07-8.507-38.283-25.522-34.502-28.83 101.615 37.8 206.065 28.83 293.974-41.6 22.213-17.487 46.8-46.8 53.88-47.263-10.398 16.07 1.9 7.562-6.144 21.74 22.213-35.92-9.453-14.65 23.16-61.914l12.288 16.542c-4.726-29.776 36.865-66.168 32.6-112.958 9.453-14.18 10.398 15.597.473 48.68 14.18-36.865 3.78-42.536 7.1-73.257 3.78 10.398 8.98 21.268 11.816 31.666-8.98-35.447 9.453-60.024 13.706-80.347-4.726-1.9-14.18 15.597-16.07-26.467.473-18.432 5.2-9.453 7.1-14.18-3.78-1.9-12.76-16.07-18.432-43 4.254-6.144 10.87 16.542 16.542 17.015-3.78-21.268-9.925-37.338-9.925-53.88-16.542-34.502-5.672 4.726-19.378-14.65-17.487-54.825 14.65-12.76 16.542-37.338 26.467 38.283 41.6 98.306 48.68 122.883-5.2-30.248-13.706-59.55-24.577-87.436 8.035 3.308-12.76-61.914 10.398-18.905C1056.1 7.482 973.875-79 898.254-119.182c9.453 8.507 20.796 18.905 16.542 20.796-37.8-22.213-31.193-24.104-36.392-33.557-30.72-12.288-32.6.945-52.934 0-57.66-30.72-69.004-27.412-121.938-46.8l2.363 11.343c-38.283-12.76-44.427 4.726-86.018 0-2.363-1.9 13.234-7.1 26.467-8.98-36.865 4.726-35.447-7.1-71.367 1.418 8.98-6.144 18.432-10.398 27.885-15.597-30.248 1.9-72.312 17.487-59.078 3.308-49.153 22.213-136.6 52.934-185.742 98.78l-1.418-10.398C333.95-71.918 258.8-18.04 252.657 16.936l-6.144 1.418c-11.816 19.85-19.378 42.064-28.358 62.86-15.124 25.994-22.213 9.925-20.323 14.18-30.248 60.97-44.9 112.485-58.133 154.55 8.98 13.706 0 82.7 3.78 138.007-15.124 273.178 191.414 538.322 417.802 599.3 33.084 11.816 82.237 11.343 124.3 12.76-49.626-14.18-55.77-7.562-103.978-24.104-34.502-16.542-42.536-34.974-67.113-56.243l9.925 17.015c-48.208-17.015-27.885-21.268-67.113-33.557l10.398-13.706c-15.597-1.418-41.6-26.467-48.68-40.173l-17.015.473c-20.323-25.522-31.666-43.482-30.72-57.66l-7.562 8.507c-6.144-10.87-75.62-94.998-39.7-75.62-6.617-6.144-15.597-9.925-25.05-27.412l7.1-8.507c-17.487-22.213-31.666-51.044-30.72-60.496 9.453 12.288 15.597 14.65 22.213 17.015-43.954-108.704-46.317-6.144-79.4-110.595l7.1-.473c-5.2-8.035-8.507-17.015-12.76-25.522l2.836-30.248c-31.666-36.392-8.98-154.55-4.254-219.772 3.308-26.467 26.467-54.352 43.954-98.78l-10.87-1.9c20.323-35.92 117.2-143.68 161.638-138.007 21.74-27.412-4.254 0-8.507-7.1 47.735-49.153 62.387-34.974 94.525-43.482 34.502-20.323-29.776 8.035-13.234-8.035 60.024-15.124 42.536-34.974 120.52-42.536 8.035 4.726-18.905 7.1-25.994 13.234C622.724-92.24 730.956-86.57 800.905-53.958c81.292 37.8 172.5 150.295 176.3 256.164l4.254.945c-1.9 42.064 6.617 90.744-8.507 135.17l9.914-20.32m-492.95 142.732l-2.836 13.706c13.234 17.96 23.63 36.865 40.173 50.57-12.288-23.16-21.268-32.6-37.338-64.277m30.722-1.417c-7.1-7.562-10.87-17.015-15.597-25.994 4.254 16.07 13.234 29.776 21.74 43.954l-6.144-17.96m545.884-118.63l-2.836 7.562c-5.2 37.8-17.015 75.62-34.502 110.595 19.378-36.865 32.14-77.038 37.338-118.157m-431.507-534.54c13.234-4.726 33.084-2.836 47.263-6.144-18.432 1.418-36.865 2.363-55.297 4.726l8.035 1.418m-471.2 250.5c3.308 28.83-21.74 39.7 5.672 20.796 14.18-32.14-6.144-8.507-5.672-20.796m-31.666 132.8c6.144-18.905 7.562-30.72 9.925-41.6-17.487 21.74-8.035 26.467-9.925 41.6M2239.53 763.123c-4.2.1.8 2.2 6.3 3l4.1-3.5c-3.4.8-6.9.8-10.4.5m22.6-5.6c2.5-3.5 4.3-7.2 5-11.1-.6 2.8-2.1 5.2-3.5 7.7-7.9 4.9-.7-2.9 0-5.9-8.5 10.6-1.2 6.3-1.5 9.3m8.3-21.7c.5-7.6-1.5-5.2-2.2-2.3.8.5 1.4 5.4 2.2 2.3m-46.8-103.4c2.2.4 4.9.7 4.5 1.2 2.4-.5 3-1-4.5-1.2" />
        <path d="M2228.13 633.723l-1.6.3 1.5-.1.1-.2m69.9 105c.3 6.8-2 10.1-4 15.9l-3.6 1.8c-3 5.8.3 3.7-1.8 8.3-4.6 4.1-14.1 12.9-17.1 13.7-2.2 0 1.5-2.6 2-3.6-6.2 4.3-5 6.4-14.5 9l-.3-.6c-23.4 11-56-10.8-55.5-40.6-.2 1.9-.7 1.4-1.2 2.2-1.2-15.3 7.1-30.7 21.1-37 13.7-6.8 29.7-4 39.5 5.1-5.4-7-16.1-14.5-28.8-13.8-12.4.2-24.1 8.1-27.9 16.7-6.4 4-7.1 15.5-9.9 17.6-3.7 27.4 7 39.3 25.2 53.2 2.9 1.9.8 2.2 1.2 3.7-6-2.8-11.6-7.1-16.1-12.3 2.4 3.5 5 7 8.4 9.7-5.7-1.9-13.3-13.8-15.5-14.3 9.8 17.6 39.9 30.9 55.6 24.3-7.3.3-16.5.1-24.7-2.9-3.4-1.8-8.1-5.4-7.3-6.1 21.5 8 43.6 6.1 62.2-8.8 4.7-3.7 9.9-9.9 11.4-10-2.2 3.4.4 1.6-1.3 4.6 4.7-7.6-2-3.1 4.9-13.1l2.6 3.5c-1-6.3 7.8-14 6.9-23.9 2-3 2.2 3.3.1 10.3 3-7.8.8-9 1.5-15.5.8 2.2 1.9 4.5 2.5 6.7-1.9-7.5 2-12.7 2.9-17-1-.4-3 3.3-3.4-5.6.1-3.9 1.1-2 1.5-3-.8-.4-2.7-3.4-3.9-9.1.9-1.3 2.3 3.5 3.5 3.6-.8-4.5-2.1-7.9-2.1-11.4-3.5-7.3-1.2 1-4.1-3.1-3.7-11.6 3.1-2.7 3.5-7.9 5.6 8.1 8.8 20.8 10.3 26-1.1-6.4-2.9-12.6-5.2-18.5 1.7.7-2.7-13.1 2.2-4-5.3-19.5-22.7-37.8-38.7-46.3 2 1.8 4.4 4 3.5 4.4-8-4.7-6.6-5.1-7.7-7.1-6.5-2.6-6.9.2-11.2 0-12.2-6.5-14.6-5.8-25.8-9.9l.5 2.4c-8.1-2.7-9.4 1-18.2 0-.5-.4 2.8-1.5 5.6-1.9-7.8 1-7.5-1.5-15.1.3 1.9-1.3 3.9-2.2 5.9-3.3-6.4.4-15.3 3.7-12.5.7-10.4 4.7-28.9 11.2-39.3 20.9l-.3-2.2c-4.8 5.7-20.7 17.1-22 24.5l-1.3.3c-2.5 4.2-4.1 8.9-6 13.3-3.2 5.5-4.7 2.1-4.3 3-6.4 12.9-9.5 23.8-12.3 32.7 1.9 2.9 0 17.5.8 29.2-3.2 57.8 40.5 113.9 88.4 126.8 7 2.5 17.4 2.4 26.3 2.7-10.5-3-11.8-1.6-22-5.1-7.3-3.5-9-7.4-14.2-11.9l2.1 3.6c-10.2-3.6-5.9-4.5-14.2-7.1l2.2-2.9c-3.3-.3-8.8-5.6-10.3-8.5l-3.6.1c-4.3-5.4-6.7-9.2-6.5-12.2l-1.6 1.8c-1.3-2.3-16-20.1-8.4-16-1.4-1.3-3.3-2.1-5.3-5.8l1.5-1.8c-3.7-4.7-6.7-10.8-6.5-12.8 2 2.6 3.3 3.1 4.7 3.6-9.3-23-9.8-1.3-16.8-23.4l1.5-.1c-1.1-1.7-1.8-3.6-2.7-5.4l.6-6.4c-6.7-7.7-1.9-32.7-.9-46.5.7-5.6 5.6-11.5 9.3-20.9l-2.3-.4c4.3-7.6 24.8-30.4 34.2-29.2 4.6-5.8-.9 0-1.8-1.5 10.1-10.4 13.2-7.4 20-9.2 7.3-4.3-6.3 1.7-2.8-1.7 12.7-3.2 9-7.4 25.5-9 1.7 1-4 1.5-5.5 2.8 10.5-5.2 33.4-4 48.2 2.9 17.2 8 36.5 31.8 37.3 54.2l.9.2c-.4 8.9 1.4 19.2-1.8 28.6l2.1-4.3m-104.3 30.2l-.6 2.9c2.8 3.8 5 7.8 8.5 10.7-2.6-4.9-4.5-6.9-7.9-13.6m6.5-.3c-1.5-1.6-2.3-3.6-3.3-5.5.9 3.4 2.8 6.3 4.6 9.3l-1.3-3.8m115.5-25.1l-.6 1.6c-1.1 8-3.6 16-7.3 23.4 4.1-7.8 6.8-16.3 7.9-25m-91.3-113.1c2.8-1 7-.6 10-1.3-3.9.3-7.8.5-11.7 1l1.7.3m-99.7 53c.7 6.1-4.6 8.4 1.2 4.4 3-6.8-1.3-1.8-1.2-4.4m-6.7 28.1c1.3-4 1.6-6.5 2.1-8.8-3.7 4.6-1.7 5.6-2.1 8.8" />
      </g>
      <path d="M2068.13 997.423c0 36.7 19.5 36.7 22.4 36.7 8.1 0 13.3-4.4 15.5-12.1l.3 11.6c2.5-.1 5-.4 9-.4 1.4 0 2.6 0 3.6.1 1 0 2.1.1 3.3.3-2.1-4.2-3.6-13.5-3.6-33.9 0-19.8 0-53.3 1.7-63.5-4.7 2.2-8.7 3.7-17.6 4.4 3.5 3.8 3.5 5.7 3.5 22.9-2.5-.8-5.6-1.7-10.9-1.7-23.4.2-27.2 20.5-27.2 35.6m37.8-15.3c-.1.1-.1 21.1-.4 26.6-.3 4.4-.7 13.9-10 13.9-9.6 0-12-11.1-12.8-15.9-.9-5.3-.9-9.8-.9-11.7 0-6.3.4-23.7 15.1-23.7 4.4 0 6.9 1.3 8.9 2.3zm68 10c0-15.2-3-30.2-22.3-30.2-26.6 0-26.6 29.4-26.6 35.7 0 26.4 11.9 36.9 31.8 36.9 8.9 0 13.2-1.3 15.5-2-.1-4.7.5-7.7 1.3-11.7-2.7 1.7-6.3 3.9-14.1 3.9-20.3 0-20.6-18.5-20.6-24.9h34.7l.3-7.7m-35.1-1.3c.1-10.8 2.3-20.5 11.6-20.5 10.2 0 10.9 11.2 10.7 20.5zm40.1 21.1c0 9.6 0 15.1-1.6 19.3 5.3 2.1 12 3.3 19.9 3.3 5.1 0 19.8 0 27.8-16.3 3.8-7.6 5.1-17.7 5.1-25.4 0-4.7-.5-15-4.3-21.5-3.6-6.1-9.5-9.2-15.8-9.2-12.5 0-16.2 10.4-18.1 15.8 0-6.6.1-29.8 1.2-41.7-8.5 3.9-13.7 4.6-19.3 5.1 5.1 2.1 5.1 10.7 5.1 38.7v31.9m37.4-14.2c0 12.1-2.2 28.4-17.3 28.4-2.1 0-4.7-.4-6.4-.8-.3-4.7-.3-12.8-.3-22.1 0-11.2 1.2-17.1 2.1-19.9 2.7-9.2 8.9-9.4 10-9.4 10 0 11.9 13.6 11.9 23.8zm38.9 36c-2.6-.4-4.4-.7-8.2-.7-4.2 0-7 .3-10 .7 1.3-2.5 1.8-3.7 2.2-12.1.5-11.6.7-42.6-.3-49.1-.7-5-1.8-5.7-3.6-7 10.7-1 13.7-1.8 18.6-4.2-1 5.7-1.2 8.6-1.2 17.3-.3 44.9-.4 49.7 2.5 55.1m5.9-20.9c0 8.2 2.5 16.4 9.8 19.9 3.3 1.4 6.5 1.4 7.6 1.4 12 0 16-8.9 18.5-14.3-.1 5.7 0 9.2.4 13.8 2.3-.1 4.7-.4 8.6-.4 2.2 0 4.3.3 6.5.4-1.4-2.2-2.2-3.5-2.6-8.6-.3-4.9-.3-9.9-.3-16.8l.1-26.6c0-9.9-2.6-19.7-22.2-19.7-12.9 0-20.5 3.9-24.2 5.9 1.6 2.9 2.9 5.3 4 10.9 5.1-4.4 11.7-6.8 18.5-6.8 10.8 0 10.8 7.2 10.8 17.3-2.5-.1-4.6-.4-8.1-.4-16.5.2-27.4 6.6-27.4 24m35.8-16c-.3 8.2-.4 13.9-2.6 18.5-2.7 5.9-7.3 7.6-10.7 7.6-7.8 0-9.5-6.5-9.5-12.9 0-12.2 10.9-13.2 15.9-13.2zm75.1 24c.1 4.4.1 9.1 2 12.9-2.9-.3-4.6-.7-9.9-.7-3.1 0-4.8.3-7.3.7.5-1.7.8-2.3 1-4.6.4-3 .7-13 .7-16.5v-14.1c0-6.1 0-15-.4-18.1-.3-2.2-.9-8.2-8.5-8.2-7.4 0-9.9 5.5-10.8 9.9-1 4.6-1 9.5-1 28.8.1 16.7.1 18.2 1.4 22.8-2.2-.3-4.9-.5-8.9-.5-3.1 0-5.2.1-7.8.5.9-2.1 1.4-3.1 1.7-10.4.3-7.2.8-42.4-.4-50.7-.6-5.1-2-6.3-3.4-7.6 10.6-.5 13.9-2.2 17.2-3.9v13.8c1.6-4 4.8-13 17.9-13 16.3 0 16.4 11.9 16.5 19.7v39.2" />
      <path
        d="M2256.33 942.823l-10.8 10.8-10.8-10.8 10.8-10.8 10.8 10.8"
        fill="#d70751"
      />
    </svg>
  ),
  CentOS: () => (
    <svg
      width="2500"
      height="2500"
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid"
    >
      <path d="M235.463 197.578c-4.935-1.135-10.169-1.842-15.465-1.842-9.051 0-17.286 1.566-23.366 4.092a2.061 2.061 0 0 0-1.146 1.829c0 .287.074.586.186.829.717 2.085-.465 4.345-6.343 5.639-8.718 1.913-14.222 10.907-17.375 13.898-3.698 3.51-14.14 5.669-12.57 3.577 1.229-1.637 5.931-6.744 8.791-12.264 2.557-4.932 4.834-6.333 7.97-11.039.923-1.381 4.49-6.228 5.527-10.065 1.166-3.745.772-8.441 1.22-10.374.64-2.789 3.274-8.846 3.473-12.261.114-1.937-8.071 2.755-11.955 2.755-3.884 0-7.67-2.321-11.139-2.493-4.295-.202-7.054 3.312-10.941 2.698-2.22-.35-4.086-2.304-7.966-2.452-5.521-.202-12.268 3.066-24.937 2.661-12.466-.404-23.979-15.75-25.553-18.189-1.839-2.867-4.089-2.867-6.541-.62s-5.474.485-6.336-1.021c-1.634-2.863-6.006-11.227-12.776-12.978-9.361-2.425-14.104 5.184-13.488 11.24.624 6.148 4.598 7.869 6.441 11.136 1.836 3.271 2.779 5.383 6.238 6.831 2.456 1.018 3.369 2.534 2.638 4.548-.64 1.755-3.194 2.156-4.871 2.236-3.567.169-6.067-.798-7.892-1.963-2.119-1.348-3.844-3.227-5.696-6.417-2.143-3.517-5.514-5.049-9.445-5.049-1.873 0-3.625.495-5.181 1.296-6.157 3.2-13.49 5.1-21.383 5.1l-8.899.004C2.348 156.072 0 142.312 0 128.003 0 57.307 57.31 0 128.003 0 198.696 0 256 57.307 256 128.003c0 25.651-7.545 49.543-20.537 69.575" />
      <path
        d="M235.463 197.575c-4.935-1.135-10.169-1.85-15.465-1.85-9.051 0-17.286 1.57-23.366 4.1a2.057 2.057 0 0 0-1.146 1.829c0 .29.074.586.186.832.717 2.082-.465 4.338-6.343 5.632-8.718 1.917-14.222 10.91-17.375 13.895-3.698 3.516-14.14 5.675-12.57 3.58 1.229-1.633 5.931-6.74 8.791-12.257 2.557-4.932 4.834-6.34 7.97-11.042.923-1.378 4.49-6.228 5.527-10.065 1.166-3.742.772-8.441 1.22-10.375.64-2.792 3.274-8.845 3.473-12.267.114-1.931-8.071 2.762-11.955 2.762-3.884 0-7.67-2.325-11.139-2.493-4.295-.202-7.054 3.311-10.941 2.701-2.22-.357-4.086-2.314-7.966-2.458-5.521-.199-12.268 3.068-24.937 2.661-12.466-.405-23.979-15.751-25.553-18.193-1.839-2.86-4.089-2.86-6.541-.613-2.452 2.246-5.474.481-6.336-1.028-1.634-2.856-6.006-11.22-12.776-12.975-9.361-2.425-14.104 5.187-13.488 11.244.624 6.147 4.598 7.869 6.441 11.136 1.836 3.271 2.779 5.379 6.238 6.824 2.456 1.024 3.369 2.537 2.638 4.555-.64 1.751-3.194 2.152-4.871 2.233-3.567.172-6.067-.799-7.892-1.957-2.119-1.358-3.844-3.231-5.696-6.424-2.143-3.517-5.514-5.056-9.445-5.056-1.873 0-3.625.502-5.181 1.3-6.157 3.21-13.49 5.107-21.383 5.107l-8.899.003C23.747 219.544 71.619 256 128.003 256c45.039 0 84.645-23.259 107.46-58.425"
        fill="#FFF"
      />
      <path d="M156.194 185.839c.656.643 1.792 2.803.404 5.545-.778 1.451-1.614 2.475-3.112 3.671-1.799 1.442-5.319 3.109-10.146.047-2.597-1.647-2.752-2.199-6.336-1.734-2.56.333-3.578-2.251-2.658-4.4.92-2.142 4.702-3.877 9.405-1.121 2.112 1.243 5.413 3.863 8.3 1.542 1.195-.96 1.913-1.6 3.573-3.52a.42.42 0 0 1 .57-.03" />
      <path
        d="M200.232 93.945c-1.263 4.251-3.061 9.691-11.065 13.801-1.165.593-1.61-.384-1.071-1.304 3.021-5.144 3.56-6.43 4.44-8.461 1.229-2.965 1.872-7.185-.573-15.99-4.813-17.324-14.858-40.479-22.154-47.99-7.047-7.249-19.81-9.29-31.347-6.329-4.247 1.091-12.561 5.413-27.978 1.94-26.678-6.01-30.632 7.35-32.161 13.17-1.533 5.821-5.208 22.363-5.208 22.363-1.226 6.734-2.83 18.449 38.595 26.338 19.298 3.678 20.282 8.663 21.134 12.254 1.532 6.431 3.981 10.109 6.737 11.945 2.758 1.839 0 3.361-3.059 3.675-8.219.852-38.595-7.859-56.566-18.069-14.703-8.987-14.952-17.078-11.587-23.942-22.208-2.402-38.875 2.085-41.897 12.598-5.187 18.044 39.674 48.865 90.752 64.33 53.605 16.232 108.736 4.901 114.864-28.79 2.785-15.31-10.109-26.634-31.856-31.539m-82.189-32.993c-14.787 1.071-16.323 2.667-19.092 5.615-3.904 4.16-9.048-5.396-9.048-5.396-3.089-.651-6.831-5.626-4.81-10.274 1.987-4.598 5.662-3.217 6.814-1.785 1.402 1.741 4.389 4.591 8.27 4.49 3.88-.105 8.357-.92 14.602-.92 6.326 0 10.58 2.361 10.819 4.392.206 1.732-.512 3.369-7.555 3.878m15.532-24.432a.424.424 0 0 1-.068.007c-.229 0-.414-.178-.414-.391 0-.154.094-.289.233-.35 2.866-1.516 7.144-2.718 12.038-3.217a46.24 46.24 0 0 1 4.285-.242c.242 0 .485.003.731.006 8.205.186 14.774 3.446 14.676 7.283-.098 3.837-6.824 6.797-15.03 6.612-2.658-.06-5.15-.444-7.296-1.064a.566.566 0 0 1-.438-.539.56.56 0 0 1 .445-.536c5.12-1.185 8.572-3.122 8.33-4.951-.323-2.422-7.02-3.743-14.956-2.944-.869.087-1.718.198-2.536.326"
        fill="#C00"
      />
    </svg>
  ),
};

function RotatingOSCluster() {
  const [index, setIndex] = useState(0);
  const items = [
    { name: "Ubuntu", component: OSLogos.Ubuntu },
    { name: "Debian", component: OSLogos.Debian },
    { name: "CentOS", component: OSLogos.CentOS },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <div className="relative size-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center bg-background border-2 border-muted rounded-xl p-2 shadow-xl"
          style={{ perspective: 1000 }}
        >
          {items[index].component()}
        </motion.div>
      </AnimatePresence>

      {/* Ghost nodes for cluster effect */}
      <div className="absolute -top-1 -right-1 size-8 rounded-lg bg-background border-2 border-muted/50 p-1 opacity-40 -z-10 scale-90 grayscale" />
      <div className="absolute -bottom-1 -left-1 size-8 rounded-lg bg-background border-2 border-muted/50 p-1 opacity-40 -z-10 scale-90 grayscale" />
    </div>
  );
}

function TerminalSimulation() {
  const { resolvedTheme } = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
      const isDark = resolvedTheme !== "light";
  const terminalTheme = isDark
    ? {
        shell:
          "bg-[#0a0a0b] border-2 border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
        header: "bg-white/[0.03] border-b border-white/[0.05]",
        title: "text-muted-foreground/50",
        statusDot:
          "bg-tone-success-foreground shadow-[0_0_8px_var(--tone-success-foreground)]",
        statusText: "text-tone-success-foreground",
        lineNumber: "text-muted-foreground/30",
        info: "text-blue-400",
        auth: "text-purple-400",
        ok: "text-tone-success-foreground",
        warn: "text-yellow-400",
        command: "text-primary",
        defaultLog: "text-foreground/80",
        cursor: "bg-primary",
        overlay:
          "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0)_34%,rgba(0,0,0,0.1))]",
      }
    : {
        shell:
          "bg-[#f7efe6] border-2 border-black/[0.08] shadow-[0_20px_50px_rgba(73,34,16,0.16)]",
        header: "bg-black/[0.03] border-b border-black/[0.07]",
        title: "text-[#5f5147]",
        statusDot:
          "bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.35)]",
        statusText: "text-emerald-700",
        lineNumber: "text-[#8b7768]",
        info: "text-sky-700",
        auth: "text-violet-700",
        ok: "text-emerald-700",
        warn: "text-amber-700",
        command: "text-rose-700",
        defaultLog: "text-[#2f241d]",
        cursor: "bg-rose-700",
        overlay:
          "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.52),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0)_38%,rgba(110,78,52,0.035))]",
      };

  const logTemplates = [
    "[INFO] Initializing secure handshake with control plane...",
    "[AUTH] Verifying operator certificate (noderax-ca-01)...",
    "[CONN] Establishing encrypted tunnel to node clusters...",
    "[DATA] Streaming telemetry peak: 1.2 GB/s detected.",
    "[SYNC] Synchronizing global task inventory (14,204 nodes)...",
    "[LOAD] CPU: 42.1% | MEM: 61.8% | NET: 890Mbps",
    "[OK]   Workspace 'prod-alpha' is reachable and synchronized.",
    "[WARN] Latency spike (42ms) detected on EU-Central cluster.",
    "[CMD]  Executing scheduled heartbeat checks on cluster-04...",
    "[SSH]  Encrypted session established with edge-node-88.",
    "[DB]   Writing event history to immutable ledger...",
    "[OK]   Cluster 'edge-us-east' authentication successful.",
  ];

  useEffect(() => {
    const currentLogs: string[] = [
      "Noderax Terminal v4.0.2 ready.",
      "Copyright (c) 2026 Noderax Infrastructure.",
    ];
    setLogs(currentLogs);

    const interval = setInterval(() => {
      const nextLog =
        logTemplates[Math.floor(Math.random() * logTemplates.length)];
      setLogs((prev) => [
        ...prev.slice(-14),
        `[${new Date().toLocaleTimeString("en-GB")}] ${nextLog}`,
      ]);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="relative group perspective-1000">
      <div className="absolute -inset-[1px] bg-gradient-to-r from-muted/50 via-primary/30 to-muted/50 rounded-2xl opacity-40 blur-[1px]" />
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl",
          terminalTheme.shell,
        )}
      >
        {/* Terminal Header */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3",
            terminalTheme.header,
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-red-500/30 border border-red-500/40" />
              <div className="size-2.5 rounded-full bg-yellow-500/30 border border-yellow-500/40" />
              <div className="size-2.5 rounded-full bg-green-500/30 border border-green-500/40" />
            </div>
            <span
              className={cn(
                "ml-2 text-[10px] font-bold uppercase tracking-[0.2em]",
                terminalTheme.title,
              )}
            >
              Operator Console
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-1.5 rounded-full animate-pulse",
                terminalTheme.statusDot,
              )}
            />
            <span
              className={cn(
                "text-[10px] font-mono font-bold tracking-tighter",
                terminalTheme.statusText,
              )}
            >
              NODE_BRIDGE_CONNECTED
            </span>
          </div>
        </div>

        {/* Terminal Body */}
        <div
          ref={scrollRef}
          className="relative p-6 h-[340px] overflow-y-auto font-mono text-[13px] leading-relaxed scrollbar-none"
        >
          {/* Terminal glass overlay */}
          <div
            className={cn(
              "absolute inset-0 pointer-events-none",
              terminalTheme.overlay,
            )}
          />

          {logs.map((log, i) => (
            <div
              key={i}
              className="flex gap-3 mb-1.5 animate-in fade-in slide-in-from-left-2 duration-300"
            >
              <span
                className={cn(
                  "min-w-[28px] select-none",
                  terminalTheme.lineNumber,
                )}
              >
                {i + 104}
              </span>
              <span
                className={cn(
                  "break-all",
                  log.includes("[INFO]")
                    ? terminalTheme.info
                    : log.includes("[AUTH]") || log.includes("[SSH]")
                      ? terminalTheme.auth
                      : log.includes("[OK]")
                        ? terminalTheme.ok
                        : log.includes("[WARN]")
                          ? terminalTheme.warn
                          : log.includes("[CMD]") || log.includes("[LOAD]")
                            ? terminalTheme.command
                            : terminalTheme.defaultLog,
                )}
              >
                {log}
              </span>
            </div>
          ))}
          <div className="flex gap-3 items-center">
            <span
              className={cn(
                "min-w-[28px] select-none",
                terminalTheme.lineNumber,
              )}
            >
              {logs.length + 104}
            </span>
            <span className={cn("h-4 w-2 animate-pulse", terminalTheme.cursor)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DataFlowAnimation() {
  return (
    <div className="relative flex items-center justify-between px-6 py-10 bg-muted/20 rounded-2xl border-2 border-muted/50 overflow-hidden shadow-inner min-h-[140px]">
      {/* Brand Red Pulse (Faint/Transparent) */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in oklch, var(--primary) 60%, transparent) 0%, transparent 70%)",
        }}
      >
        <div className="absolute inset-0 animate-pulse bg-current" />
      </div>

      {/* Nodes */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="size-10 rounded-xl bg-background border-2 border-primary/20 flex items-center justify-center shadow-lg text-primary">
          <Monitor className="size-5" />
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-tighter">
          Operator
        </span>
      </div>

      {/* Path 1: Forward (Web -> API) */}
      <div className="relative flex-1 h-[2px] bg-muted/40 mx-2">
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
          initial={{ left: "0%" }}
          animate={{ left: ["0%", "100%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="size-14 rounded-xl bg-background border-2 border-primary flex items-center justify-center shadow-xl text-tone-brand-foreground tone-brand scale-110">
          <Cpu className="size-7" />
        </div>
        <span className="text-[10px] uppercase font-bold text-primary tracking-tighter">
          Control Plane
        </span>
      </div>

      {/* Path 2: Bidirectional (API <-> Edge) */}
      <div className="relative flex-1 h-[2px] bg-muted/40 mx-2">
        {/* Forward Packet */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-tone-success-foreground shadow-[0_0_10px_var(--tone-success-foreground)]"
          initial={{ left: "0%" }}
          animate={{ left: ["0%", "100%"] }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "linear",
            delay: 0.2,
          }}
        />

        {/* Backward Packet */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary/80 shadow-[0_0_10px_var(--primary)]"
          initial={{ left: "100%" }}
          animate={{ left: ["100%", "0%"] }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "linear",
            delay: 1.1,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2">
        <RotatingOSCluster />
        <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-tighter">
          Edge Cluster
        </span>
      </div>
    </div>
  );
}

function InfraTelemetry() {
  const [success, setSuccess] = useState(124);
  const [running, setRunning] = useState(8);
  const [canceled, setCanceled] = useState(2);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) setSuccess((s) => s + 1);
      setRunning(Math.floor(Math.random() * 5) + 5);
      if (Math.random() > 0.95) setCanceled((c) => c + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* <DataFlowAnimation /> */}

      <div className="grid grid-cols-3 gap-3">
        {/* Success */}
        <div className="rounded-xl border border-border/70 bg-background/40 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-1.5 rounded-full bg-tone-success animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Success
            </p>
          </div>
          <p className="font-mono text-lg font-bold text-tone-success leading-none">
            {success}
          </p>
        </div>

        {/* Running */}
        <div className="rounded-xl border border-border/70 bg-background/40 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              className="size-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Running
            </p>
          </div>
          <p className="font-mono text-lg font-bold text-primary leading-none">
            {running}
          </p>
        </div>

        {/* Canceled */}
        <div className="rounded-xl border border-border/70 bg-background/40 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-1.5 rounded-full bg-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Canceled
            </p>
          </div>
          <p className="font-mono text-lg font-bold text-muted-foreground leading-none">
            {canceled}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginBackdrop() {
  const { resolvedTheme } = useTheme();
  const reduceMotion = Boolean(useReducedMotion());
  const particleColor = resolvedTheme === "dark" ? "#f5f5f5" : "#7f1d1d";

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--background)_94%,white),var(--background))]" />

      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 20%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 26%), radial-gradient(circle at 84% 18%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 22%), linear-gradient(180deg, transparent, color-mix(in oklch, var(--background) 86%, transparent))",
        }}
      />

      {!reduceMotion ? (
        <Particles
          className="absolute inset-0"
          quantity={70}
          ease={80}
          staticity={45}
          size={0.8}
          color={particleColor}
        />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,color-mix(in_oklch,var(--background)_52%,transparent)_70%,var(--background)_100%)]" />
    </>
  );
}

function RackUnit({ children, u }: { children: React.ReactNode; u: string }) {
  return (
    <div className="relative group/rack">
      {/* Side Rack Rail Markings */}
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 select-none">
        <span className="text-[10px] font-mono font-bold text-muted-foreground/30">
          {u}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border-2 border-muted/50 bg-[#0c0c0c] shadow-2xl">
        {/* Rack Mounting Screws */}
        <div className="absolute right-2 top-2 size-1.5 rounded-full bg-muted/40 shadow-inner" />
        <div className="absolute right-2 bottom-2 size-1.5 rounded-full bg-muted/40 shadow-inner" />
        <div className="absolute left-2 top-2 size-1.5 rounded-full bg-muted/40 shadow-inner" />
        <div className="absolute left-2 bottom-2 size-1.5 rounded-full bg-muted/40 shadow-inner" />

        {/* Industrial Detail: Air Vents / Grille */}
        <div className="absolute top-0 left-10 right-10 flex h-1 gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 bg-muted/10" />
          ))}
        </div>

        <div className="relative z-10 p-1">{children}</div>

        {/* Bottom Air Vents */}
        <div className="absolute bottom-0 left-10 right-10 flex h-1 gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 bg-muted/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export const LoginScreen = ({
  nextPath,
  message,
  flashError,
}: {
  nextPath?: string;
  message?: string;
  flashError?: string | null;
}) => {
  const router = useRouter();
  const reduceMotion = Boolean(useReducedMotion());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(
    null,
  );
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const loginMutation = useLogin();
  const verifyMfaChallengeMutation = useVerifyMfaChallenge();
  const verifyMfaRecoveryMutation = useVerifyMfaRecovery();
  const authProvidersQuery = useQuery({
    queryKey: ["auth", "providers"],
    queryFn: apiClient.getAuthProviders,
    staleTime: 60_000,
  });
  const setActiveWorkspaceSlug = useAppStore(
    (state) => state.setActiveWorkspaceSlug,
  );

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const rememberValue = useWatch({
    control: form.control,
    name: "remember",
  });
  const loginMessage = message ? loginMessageCopy[message] : null;
  const decodedFlashError = flashError ? decodeURIComponent(flashError) : null;

  useEffect(() => {
    if (!flashError) {
      return;
    }

    document.cookie = `${AUTH_FLASH_ERROR_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }, [flashError]);

  const finishLogin = async () => {
    const workspaces = await apiClient.getWorkspaces();
    const preferredWorkspace =
      pickDefaultWorkspace(workspaces) ?? workspaces[0] ?? null;
    const workspaceTargetPath = resolveWorkspaceTargetPath(nextPath);

    if (preferredWorkspace) {
      setActiveWorkspaceSlug(preferredWorkspace.slug);
      persistWorkspaceSlug(preferredWorkspace.slug);
    } else {
      setActiveWorkspaceSlug(null);
      clearPersistedWorkspaceSlug();
    }

    const destination = preferredWorkspace
      ? workspaceTargetPath
        ? buildWorkspacePath(preferredWorkspace.slug, workspaceTargetPath)
        : nextPath?.startsWith("/")
          ? nextPath
          : buildWorkspacePath(preferredWorkspace.slug, "dashboard")
      : "/workspaces";

    startTransition(() => {
      router.replace(destination);
      router.refresh();
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);

    try {
      const result = await loginMutation.mutateAsync(values);

      if (isMfaChallenge(result)) {
        setMfaChallengeToken(result.mfaChallengeToken ?? null);
        setMfaCode("");
        setRecoveryCode("");
        setUseRecoveryCode(false);
        return;
      }

      if (isAuthSession(result)) {
        await finishLogin();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Sign in failed unexpectedly.",
      );
    }
  });

  const onSubmitMfa = async () => {
    if (!mfaChallengeToken) {
      return;
    }

    setErrorMessage(null);

    try {
      if (useRecoveryCode) {
        await verifyMfaRecoveryMutation.mutateAsync({
          challengeToken: mfaChallengeToken,
          recoveryCode,
          remember: rememberValue,
        });
      } else {
        await verifyMfaChallengeMutation.mutateAsync({
          challengeToken: mfaChallengeToken,
          token: mfaCode,
          remember: rememberValue,
        });
      }

      await finishLogin();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Multi-factor verification failed unexpectedly.",
      );
    }
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background">
      <LoginBackdrop />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Reveal
          delay={0.03}
          className="flex items-start justify-between gap-4 sm:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <BrandBadge size="lg" priority />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Noderax</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Noderax is an agent-based infrastructure management platform.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </Reveal>

        <div className="grid min-h-0 flex-1 items-start gap-6 py-6 lg:items-center lg:gap-14 lg:py-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <Reveal
            delay={0.08}
            className="hidden lg:flex lg:min-h-0 lg:flex-col lg:justify-center"
          >
            <div className="max-w-xl space-y-7 pl-8">
              <div className="space-y-4">
                <div className="tone-brand w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Operator workspace
                </div>

                <h1 className="text-balance text-3xl font-semibold tracking-tight xl:text-[2.6rem] xl:leading-[1.1]">
                  Secure access to the Noderax control plane.
                </h1>

                <p className="max-w-lg text-base leading-7 text-muted-foreground">
                  Sign in to reach dashboard snapshots, node inventory, task
                  execution, event history, settings, and authenticated realtime
                  updates through the Next.js proxy layer.
                </p>

                <div className="flex flex-wrap gap-2">
                  {overviewChips.map((chip) => (
                    <div
                      key={chip}
                      className="rounded-full border border-border/70 bg-background/70 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl"
                    >
                      {chip}
                    </div>
                  ))}
                </div>

                {/* <div className="pt-2">
                  <InfraTelemetry />
                </div> */}
              </div>

              <div className="pt-2">
                <TerminalSimulation />
              </div>
            </div>
          </Reveal>

          <Reveal
            delay={0.14}
            className="mx-auto w-full max-w-md lg:max-w-none"
          >
            <Card className="relative overflow-hidden border-border/70 bg-background/82 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <CardHeader className="border-border/70 border-b px-6 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <BrandBadge size="md" />
                  <div className="min-w-0">
                    <CardTitle className="text-[1.65rem]">Sign in</CardTitle>
                    <CardDescription className="mt-1">
                      Enter your operator credentials to access the workspace.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-6 py-5 sm:px-7">
                <div className="flex flex-wrap gap-2 lg:hidden">
                  {overviewChips.map((chip) => (
                    <div
                      key={chip}
                      className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {chip}
                    </div>
                  ))}
                </div>

                {loginMessage || decodedFlashError ? (
                  <div
                    className={cn(
                      "rounded-[18px] border px-4 py-3 text-sm leading-6",
                      decodedFlashError ? "tone-danger" : "tone-success",
                    )}
                  >
                    <div>
                      {decodedFlashError
                        ? "Single sign-on could not be completed. Try again or use password login."
                        : loginMessage}
                    </div>
                    {decodedFlashError ? (
                      <div className="mt-2 text-xs leading-5 text-muted-foreground">
                        {decodedFlashError}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!mfaChallengeToken ? (
                  <form className="space-y-3.5" onSubmit={onSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="operator@noderax.io"
                        aria-invalid={Boolean(form.formState.errors.email)}
                        className="h-11 rounded-[16px] px-4"
                        {...form.register("email")}
                      />
                      {form.formState.errors.email ? (
                        <p className="text-sm text-tone-danger">
                          {form.formState.errors.email.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        aria-invalid={Boolean(form.formState.errors.password)}
                        className="h-11 rounded-[16px] px-4"
                        {...form.register("password")}
                      />
                      {form.formState.errors.password ? (
                        <p className="text-sm text-tone-danger">
                          {form.formState.errors.password.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="surface-subtle flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Remember this browser
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Keep the secure cookie session available on this
                          device.
                        </p>
                      </div>
                      <Switch
                        checked={rememberValue}
                        onCheckedChange={(checked) =>
                          form.setValue("remember", Boolean(checked), {
                            shouldDirty: true,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    {errorMessage ? (
                      <div className="tone-danger rounded-[18px] border px-4 py-3 text-sm leading-6">
                        {errorMessage}
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      size="lg"
                      className="group h-11 w-full rounded-[16px] text-base"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending
                        ? "Signing in..."
                        : "Enter dashboard"}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>

                    {authProvidersQuery.data?.length ? (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          <div className="h-px flex-1 bg-border" />
                          <span>Single sign-on</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid gap-2">
                          {authProvidersQuery.data.map((provider) => (
                            <Button
                              key={provider.slug}
                              type="button"
                              variant="outline"
                              className="h-11 rounded-[16px]"
                              onClick={() => {
                                const next = nextPath?.startsWith("/")
                                  ? nextPath
                                  : "/dashboard";
                                window.location.assign(
                                  `/api/auth/oidc/${provider.slug}/start?next=${encodeURIComponent(
                                    next,
                                  )}`,
                                );
                              }}
                            >
                              Continue with {provider.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="tone-brand rounded-[18px] border px-4 py-3 text-sm leading-6">
                      Enter the six-digit code from your authenticator app to
                      finish signing in.
                    </div>

                    <div className="surface-subtle flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Use recovery code instead
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Switch if you cannot access your authenticator app
                          right now.
                        </p>
                      </div>
                      <Switch
                        checked={useRecoveryCode}
                        onCheckedChange={setUseRecoveryCode}
                      />
                    </div>

                    {!useRecoveryCode ? (
                      <div className="space-y-2">
                        <Label>Authenticator code</Label>
                        <OTPInput
                          maxLength={6}
                          pattern={REGEXP_ONLY_DIGITS}
                          value={mfaCode}
                          onChange={setMfaCode}
                          containerClassName="flex items-center justify-between gap-2"
                          render={({ slots }) => (
                            <>
                              {slots.map((slot, index) => (
                                <div
                                  key={index}
                                  className={cn(
                                    "flex h-11 w-full items-center justify-center rounded-[16px] border bg-background text-base font-semibold sm:text-[15px]",
                                    slot.isActive
                                      ? "border-primary shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_32%,transparent)]"
                                      : "border-border",
                                  )}
                                >
                                  {slot.char ?? slot.placeholderChar ?? ""}
                                </div>
                              ))}
                            </>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="recovery-code">Recovery code</Label>
                        <Input
                          id="recovery-code"
                          value={recoveryCode}
                          onChange={(event) =>
                            setRecoveryCode(event.target.value)
                          }
                          placeholder="Enter one recovery code"
                          className="h-10 rounded-[16px] px-4 text-sm uppercase tracking-[0.03em] placeholder:text-[13px]"
                        />
                      </div>
                    )}

                    {errorMessage ? (
                      <div className="tone-danger rounded-[18px] border px-4 py-3 text-sm leading-6">
                        {errorMessage}
                      </div>
                    ) : null}

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-[16px] text-sm"
                        onClick={() => {
                          setMfaChallengeToken(null);
                          setMfaCode("");
                          setRecoveryCode("");
                          setUseRecoveryCode(false);
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="group h-10 rounded-[16px] text-sm"
                        disabled={
                          verifyMfaChallengeMutation.isPending ||
                          verifyMfaRecoveryMutation.isPending ||
                          (!useRecoveryCode
                            ? mfaCode.length !== 6
                            : recoveryCode.trim().length < 6)
                        }
                        onClick={onSubmitMfa}
                      >
                        {verifyMfaChallengeMutation.isPending ||
                        verifyMfaRecoveryMutation.isPending
                          ? "Verifying..."
                          : "Verify and continue"}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex-col items-stretch gap-3 border-border/70 px-6 py-5 sm:px-7">
                <div className="flex items-start gap-3 rounded-[18px] border border-border/70 bg-background/76 px-4 py-3">
                  <div className="tone-brand flex size-9 items-center justify-center rounded-2xl border">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Protected route access
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      `/login` unlocks the proxy layer and workspace routes
                      after authentication.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="tone-brand flex size-8 items-center justify-center rounded-full border">
                    <KeyRound className="size-4" />
                  </div>
                  <p>
                    Admins also gain access to user management after sign-in.
                  </p>
                </div>
              </CardFooter>

              {!reduceMotion ? (
                <>
                  <BorderBeam
                    duration={8}
                    size={110}
                    colorFrom="#fb923c"
                    colorTo="#ef4444"
                  />
                  <BorderBeam
                    duration={8}
                    delay={4}
                    size={110}
                    reverse
                    colorFrom="#7f1d1d"
                    colorTo="#fca5a5"
                  />
                </>
              ) : null}
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

const resolveWorkspaceTargetPath = (nextPath?: string) => {
  if (!nextPath?.startsWith("/")) {
    return "dashboard";
  }

  if (nextPath === "/" || nextPath === "/dashboard") {
    return "dashboard";
  }

  if (
    nextPath === "/nodes" ||
    nextPath.startsWith("/nodes/") ||
    nextPath === "/tasks" ||
    nextPath.startsWith("/tasks/") ||
    nextPath === "/events" ||
    nextPath === "/scheduled-tasks"
  ) {
    return nextPath.replace(/^\/+/, "");
  }

  if (nextPath.startsWith("/w/")) {
    return readWorkspaceChildPath(nextPath);
  }

  return null;
};
