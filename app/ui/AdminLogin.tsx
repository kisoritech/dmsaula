"use client";

import { FormEvent, useEffect, useState } from "react";
import { getPocketBaseError, isAdminAuthenticated, pb, signInAsSuperuser } from "@/lib/pocketbase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setAuthenticated(Boolean(record) && isAdminAuthenticated());
    }, true);
    return unsubscribe;
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await signInAsSuperuser(email.trim(), password);
      setPassword("");
      setMessage("Administrador autenticado.");
    } catch (error) {
      setMessage(getPocketBaseError(error));
    } finally {
      setBusy(false);
    }
  }

  if (authenticated) {
    return (
      <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Administrador conectado</span>
        <button type="button" onClick={() => pb.authStore.clear()} className="rounded-full border border-white/15 px-3 py-1.5 transition hover:border-white/40 hover:text-white">Sair</button>
      </div>
    );
  }

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white transition hover:border-white/40">
        <span className="h-2 w-2 rounded-full bg-amber-300" /> Entrar como administrador <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <form onSubmit={login} className="absolute right-0 z-20 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
        <p className="text-sm font-bold">Login do superusuário</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Esta autenticação usa a collection reservada <code>_superusers</code>. O e-mail precisa existir no painel <code>/_/</code>.</p>
        <div className="mt-4 space-y-3"><input aria-label="E-mail do superusuário" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@escola.com" className="field-input" /><input aria-label="Senha do superusuário" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha do PocketBase" className="field-input" /></div>
        <button type="submit" disabled={busy} className="mt-3 w-full rounded-xl bg-[var(--teal)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--teal-dark)] disabled:cursor-wait disabled:opacity-60">{busy ? "Autenticando..." : "Entrar"}</button>
        {message && <p className="mt-3 text-xs leading-5 text-slate-500">{message}</p>}
      </form>
    </details>
  );
}
