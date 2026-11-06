"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getPocketBaseError, isAdminAuthenticated, pb, signInAsSuperuser } from "@/lib/pocketbase";
import { resources } from "./school-config";

type CountState = Record<string, number | null>;

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
        <p className="text-right text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function AccessPanel({ onAuthChange }: { onAuthChange: (authenticated: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      const isAuthenticated = Boolean(record) && isAdminAuthenticated();
      setAuthenticated(isAuthenticated);
      onAuthChange(isAuthenticated);
    }, true);
    return unsubscribe;
  }, [onAuthChange]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await signInAsSuperuser(email.trim(), password);
      setPassword("");
      setMessage("Acesso liberado para operações de escrita.");
    } catch (error) {
      setMessage(getPocketBaseError(error));
    } finally {
      setBusy(false);
    }
  }

  if (authenticated) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
        <span className="inline-flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {pb.authStore.record?.email || "Usuário autenticado"}
        </span>
        <button type="button" onClick={() => { pb.authStore.clear(); setMessage(""); }} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/40 hover:text-white">
          Sair
        </button>
      </div>
    );
  }

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40">
        <span className="h-2 w-2 rounded-full bg-amber-300" /> Entrar para editar <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <form onSubmit={handleSubmit} className="absolute right-0 z-20 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
        <p className="text-sm font-bold">Acesso de administrador</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Use uma conta cadastrada em PocketBase → <code>/_/</code>. A conta comum da collection <code>users</code> não libera este acesso administrativo.</p>
        <div className="mt-4 space-y-3">
          <input aria-label="E-mail" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="aluno@teste.com" className="field-input" />
          <input aria-label="Senha" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" className="field-input" />
        </div>
        <button type="submit" disabled={busy} className="mt-3 w-full rounded-xl bg-[var(--teal)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--teal-dark)] disabled:cursor-wait disabled:opacity-60">{busy ? "Validando..." : "Entrar"}</button>
        {message && <p className="mt-3 text-xs leading-5 text-slate-500">{message}</p>}
      </form>
    </details>
  );
}

export default function SchoolDashboard() {
  const [counts, setCounts] = useState<CountState>({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCounts() {
      setLoading(true);
      try {
        await pb.health.check();
        const results = await Promise.all(resources.map(async (resource) => {
          try {
            const response = await pb.collection(resource.collection).getList(1, 1);
            return [resource.collection, response.totalItems] as const;
          } catch {
            return [resource.collection, null] as const;
          }
        }));
        if (active) { setCounts(Object.fromEntries(results)); setConnected(true); }
      } catch {
        if (active) setConnected(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCounts();
    return () => { active = false; };
  }, []);

  const totalRecords = Object.values(counts).reduce<number>((total, count) => total + (count || 0), 0);

  return (
    <main className="min-h-screen pb-12">
      <header className="bg-[var(--navy)] text-white">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--teal)] text-sm font-black tracking-widest">DM</span>
              <span><span className="block text-sm font-black tracking-[0.22em]">DMSAULA</span><span className="block text-xs text-slate-400">Gestão acadêmica</span></span>
            </Link>
            <div className="flex items-center gap-3">
              <span className={`hidden items-center gap-2 text-xs font-semibold sm:inline-flex ${connected ? "text-emerald-300" : "text-amber-300"}`}><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-300"}`} />{connected ? "PocketBase conectado" : "PocketBase indisponível"}</span>
              <Link href="/aluno/cadastro" className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white transition hover:border-white/40">Criar conta</Link>
              <AccessPanel onAuthChange={setAuthenticated} />
            </div>
          </div>
          <div className="grid gap-8 pb-10 pt-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--orange)]">Visão geral / 2026</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">Tudo que a sua secretaria precisa, em um só lugar.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Consulte as collections do PocketBase e mantenha cursos, pessoas, turmas e matrículas sempre sincronizados.</p>
            </div>
            <div className="grid grid-cols-2 gap-3"><StatCard label="Registros" value={loading ? "—" : String(totalRecords)} detail="em todas as collections" /><StatCard label="Recursos" value={String(resources.length).padStart(2, "0")} detail="módulos disponíveis" /></div>
          </div>
        </div>
      </header>

      <section id="recursos" className="mx-auto max-w-7xl px-5 pt-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--teal)]">Acesso rápido</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--navy)]">Explore seus dados</h2></div><p className="max-w-sm text-right text-sm leading-6 text-slate-500">Cada módulo já está conectado ao nome real da collection e aos campos definidos no esquema.</p></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => <Link key={resource.slug} href={`/dados/${resource.slug}`} className="resource-card group"><div className={`resource-icon tone-${resource.tone}`}>{resource.icon}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{resource.eyebrow}</p><span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-[var(--teal)]">→</span></div><h3 className="mt-2 text-lg font-semibold text-[var(--navy)]">{resource.label}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{resource.description}</p><div className="mt-5 flex items-center gap-2 text-xs font-bold text-[var(--teal)]"><span>{loading ? "Consultando..." : `${counts[resource.collection] ?? "—"} registros`}</span><span className="text-slate-300">•</span><span>{resource.fields.length} campos</span></div></div></Link>)}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600">✓</span><div><p className="text-sm font-semibold text-[var(--navy)]">Validação de dados ativa</p><p className="text-xs text-slate-500">Campos obrigatórios, relações e mensagens da API são tratados na interface.</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${authenticated ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{authenticated ? "Edição liberada" : "Somente consulta"}</span></div>
      </section>
    </main>
  );
}
