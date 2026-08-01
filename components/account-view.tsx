"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { changeOwnPasswordAction } from "@/app/actions";
import { logoutAction } from "@/app/auth-actions";
import { PageHeader, Status } from "@/components/ui";

type Account = { name: string; email: string; role: "ADMIN" | "OPERATOR" };

export function AccountView({ account }: { account: Account }) {
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await changeOwnPasswordAction(Object.fromEntries(formData));
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      setMessage({ ok: true, text: "Password changed. Signing you out securely…" });
      await logoutAction();
    });
  }

  return <div className="mx-auto max-w-3xl p-4 md:p-8">
    <PageHeader eyebrow="Personal settings" title="My account" description="Review your identity and manage your own password."/>
    <section className="card p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-farm-50 text-farm-700"><UserRound size={21}/></span>
        <div className="min-w-0"><h2 className="truncate font-bold">{account.name}</h2><p className="truncate text-sm text-slate-500">{account.email}</p></div>
        <Status tone="green">{account.role==="ADMIN"?"Administrator":"Operator"}</Status>
      </div>
    </section>
    <form action={submit} className="card mt-4 p-5">
      <div className="flex items-start gap-3"><KeyRound className="mt-0.5 shrink-0 text-farm-600"/><div><h2 className="font-bold">Change password</h2><p className="mt-1 text-sm text-slate-500">You will be signed out after the change and must log in with your new password.</p></div></div>
      <div className="mt-5 space-y-4">
        <label className="text-sm font-semibold">Current password<input className="input mt-1" name="currentPassword" type={show?"text":"password"} autoComplete="current-password" minLength={8} maxLength={128} required/></label>
        <label className="text-sm font-semibold">New password<input className="input mt-1" name="newPassword" type={show?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} required/><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 12 characters.</span></label>
        <label className="text-sm font-semibold">Confirm new password<input className="input mt-1" name="confirmPassword" type={show?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} required/></label>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="size-4 accent-farm-700" checked={show} onChange={event=>setShow(event.target.checked)}/>{show?<EyeOff size={16}/>:<Eye size={16}/>}Show passwords</label>
      </div>
      {message&&<p role="alert" aria-live="polite" className={`mt-4 rounded-xl p-3 text-sm font-medium ${message.ok?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{message.text}</p>}
      <button className="btn-primary mt-5" disabled={pending}>{pending?<Loader2 size={17} className="animate-spin"/>:<ShieldCheck size={17}/>} {pending?"Updating…":"Update password"}</button>
    </form>
  </div>;
}
