"use client";

import { selectFieldAction } from "@/app/actions";
import { logoutAction } from "@/app/auth-actions";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bug,
  Camera,
  CircleDollarSign,
  ClipboardPlus,
  CloudSun,
  Droplets,
  LayoutDashboard,
  Leaf,
  ListChecks,
  LogOut,
  Map,
  Menu,
  NotebookPen,
  Package,
  Plus,
  Settings,
  Tractor,
  UserRound,
  Wheat,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Logo } from "./logo";

const nav = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Farm Map", "/map", Map],
  ["Tasks", "/tasks", ListChecks],
  ["Irrigation", "/irrigation", Droplets],
  ["Activities", "/activities", ClipboardPlus],
  ["Crop Cycle", "/crop-cycle", Wheat],
  ["Weather", "/weather", CloudSun],
  ["Expenses & Budget", "/expenses", CircleDollarSign],
  ["Inventory", "/inventory", Package],
  ["Equipment", "/equipment", Tractor],
  ["Field Journal", "/journal", NotebookPen],
  ["Crop Guide", "/guide", BookOpen],
  ["Reports", "/reports", BarChart3],
  ["Settings", "/settings", Settings],
] as const;

const mobilePrimary = [
  ["Home", "/dashboard", LayoutDashboard],
  ["Map", "/map", Map],
  ["Tasks", "/tasks", ListChecks],
] as const;

type Sheet = "log" | "more" | null;
type ShellData = {
  user: { id: string; name: string; email: string; role: "ADMIN" | "OPERATOR" };
  farm: { id: string; name: string };
  field: { id: string; name: string };
  fields: Array<{ id: string; name: string; crop: string }>;
  selectedSector: { id: string; name: string } | null;
  taskCount: number;
  notificationCount: number;
};

const operatorRoutes = new Set([
  "/dashboard",
  "/map",
  "/prepare",
  "/land-design",
  "/tasks",
  "/irrigation",
  "/activities",
  "/weather",
  "/journal",
  "/guide",
  "/account",
]);

export function AppShell({ children, data }: { children: React.ReactNode; data: ShellData }) {
  const path = usePathname();
  const [sheet, setSheet] = useState<Sheet>(null);
  const router = useRouter();
  const [switching, startSwitch] = useTransition();
  const visibleNav = data.user.role === "ADMIN" ? nav : nav.filter(([, href]) => operatorRoutes.has(href));
  const moreNav = visibleNav.filter(([, href]) => !mobilePrimary.some(([, primaryHref]) => primaryHref === href));
  const initials = data.user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const routeIsActive = (href: string) => path === href || path.startsWith(`${href}/`);
  const moreIsActive = !mobilePrimary.some(([, href]) => routeIsActive(href));

  function chooseField(fieldId: string) {
    startSwitch(async () => {
      const result = await selectFieldAction(fieldId);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] border-r bg-white md:flex md:flex-col">
        <div className="px-5 py-6">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
          {visibleNav.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#587066] hover:bg-farm-50 hover:text-farm-900",
                routeIsActive(href) && "bg-farm-50 text-farm-900",
              )}
            >
              <Icon size={18} />
              {label}
              {label === "Tasks" && data.taskCount > 0 && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {data.taskCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="rounded-xl bg-[#f7f9f6] p-3">
            <Link href="/account" className="flex items-center gap-3 rounded-lg hover:bg-white" aria-label="Open my account">
              <div className="grid size-9 place-items-center rounded-full bg-[#dcebdd] text-sm font-bold text-farm-700">{initials}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{data.user.name}</p>
                <p className="text-xs text-slate-500">{data.user.role === "ADMIN" ? "Administrator" : "Operator"} · My account</p>
              </div>
            </Link>
            <form action={logoutAction}>
              <button className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-red-200 hover:text-red-700">
                <LogOut size={16} /> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-white/95 px-3 backdrop-blur md:ml-[244px] md:justify-between md:px-8">
        <div className="shrink-0 md:hidden">
          <Logo compact />
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="text-xs font-medium text-slate-500">{data.farm.name}</p>
          <div className="flex items-center gap-3">
            {data.fields.length > 1 && (
              <select
                aria-label="Selected production area"
                value={data.field.id}
                disabled={switching}
                onChange={(event) => chooseField(event.target.value)}
                className="max-w-48 bg-transparent text-sm font-semibold outline-none"
              >
                {data.fields.map((field) => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
            )}
            <Link href="/map" className="truncate text-sm font-semibold text-farm-700 hover:underline">
              Working sector: {data.selectedSector?.name ?? "Choose on Farm Map"}
            </Link>
          </div>
        </div>
        <Link
          href="/map"
          className="min-w-0 flex-1 truncate rounded-lg border bg-farm-50 px-2.5 py-2 text-xs font-semibold text-farm-800 md:hidden"
          aria-label={`Working sector: ${data.selectedSector?.name ?? "not selected"}. Open Farm Map.`}
        >
          {data.selectedSector?.name ?? "Choose sector"}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <button className="relative hidden size-11 place-items-center rounded-xl border bg-white md:grid" aria-label={`${data.notificationCount} unread notifications`}>
            <Bell size={19} />
            {data.notificationCount > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-amber-500" />}
          </button>
          <Link href="/account" className="grid size-11 place-items-center rounded-full bg-farm-100 text-sm font-bold text-farm-700 md:hidden" aria-label="My account">
            {initials}
          </Link>
        </div>
      </header>

      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] md:ml-[244px] md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(4.625rem+env(safe-area-inset-bottom))] grid-cols-5 border-t bg-white px-2 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile navigation">
        {mobilePrimary.map(([label, href, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={routeIsActive(href) ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500",
              routeIsActive(href) && "text-farm-700",
            )}
          >
            <Icon size={21} />{label}
            {label === "Tasks" && data.taskCount > 0 && <span className="sr-only">{data.taskCount} open tasks</span>}
          </Link>
        ))}
        <button onClick={() => setSheet("log")} className="relative flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-bold text-farm-700" aria-label="Open quick log">
          <span className="absolute -top-5 grid size-14 place-items-center rounded-full border-4 border-white bg-farm-700 text-white shadow-lg"><Plus size={26} /></span>
          <span className="mt-8">Log</span>
        </button>
        <button
          onClick={() => setSheet("more")}
          aria-expanded={sheet === "more"}
          className={cn("flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500", moreIsActive && "text-farm-700")}
        >
          <Menu size={21} />More
        </button>
      </nav>

      {sheet === "log" && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setSheet(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="quick-log-title" className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div><p id="quick-log-title" className="text-lg font-bold">Quick log</p><p className="text-sm text-slate-500">What happened in the field?</p></div>
              <button onClick={() => setSheet(null)} className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100" aria-label="Close quick log"><X /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Irrigated now", Droplets, "/activities?type=irrigation"],
                ["Field note", NotebookPen, "/journal?new=1"],
                ["Fertilizer", Leaf, "/activities?type=fertilizer"],
                ["Pest inspection", Bug, "/activities?type=pest"],
                ["Upload photo", Camera, "/journal?new=1"],
                ["Other activity", Plus, "/activities"],
              ].map(([label, Icon, href]) => (
                <Link href={href as string} key={label as string} onClick={() => setSheet(null)} className="flex min-h-20 items-center gap-3 rounded-2xl border bg-[#fafbf9] p-3 font-semibold">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-farm-100 text-farm-700"><Icon size={20} /></span>{label as string}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {sheet === "more" && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setSheet(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="more-menu-title" className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p id="more-menu-title" className="text-lg font-bold">FarmPulse menu</p><p className="text-sm text-slate-500">All tools available to your account</p></div>
              <button onClick={() => setSheet(null)} className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100" aria-label="Close menu"><X /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreNav.map(([label, href, Icon]) => (
                <Link
                  href={href}
                  key={href}
                  onClick={() => setSheet(null)}
                  className={cn("flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-sm font-semibold", routeIsActive(href) ? "border-farm-200 bg-farm-50 text-farm-900" : "bg-[#fafbf9]")}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-farm-700"><Icon size={19} /></span>{label}
                </Link>
              ))}
              <Link href="/account" onClick={() => setSheet(null)} className={cn("flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-sm font-semibold", routeIsActive("/account") ? "border-farm-200 bg-farm-50 text-farm-900" : "bg-[#fafbf9]")}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-farm-700"><UserRound size={19} /></span>My account
              </Link>
            </div>
            <form action={logoutAction} className="mt-4 border-t pt-4">
              <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700">
                <LogOut size={18} />Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
