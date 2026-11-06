"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  confirmStandardUserVerification,
  getPocketBaseError,
  registerStandardUser,
  requestStandardUserVerification,
} from "@/lib/pocketbase";

type RegistrationState = "register" | "pending" | "confirmed";

export default function UserRegistration({ initialToken = "" }: { initialToken?: string }) {
  const [state, setState] = useState<RegistrationState>(initialToken ? "pending" : "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(Boolean(initialToken));
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const confirmToken = useCallback(async (value: string) => {
    const normalizedToken = value.trim();
    if (!normalizedToken) {
      setMessageType("error");
      setMessage("Cole o token recebido no e-mail de confirmação.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      await confirmStandardUserVerification(normalizedToken);
      setState("confirmed");
      setToken("");
      setMessageType("success");
      setMessage("E-mail confirmado com sucesso. Sua conta já pode ser usada no sistema.");
    } catch (error) {
      setMessageType("error");
      setMessage(getPocketBaseError(error));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!initialToken) return;
    const timer = window.setTimeout(() => void confirmToken(initialToken), 0);
    return () => window.clearTimeout(timer);
  }, [confirmToken, initialToken]);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== passwordConfirm) {
      setMessageType("error");
      setMessage("As senhas precisam ser iguais.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      await registerStandardUser({ name, email, password });
      setState("pending");
      setMessageType("success");
      setMessage(`Conta criada. Enviamos o link de confirmação para ${email.trim().toLowerCase()}.`);
      setPassword("");
      setPasswordConfirm("");
    } catch (error) {
      setMessageType("error");
      setMessage(getPocketBaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!email.trim()) {
      setMessageType("error");
      setMessage("Informe o e-mail usado no cadastro para reenviar a confirmação.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      await requestStandardUserVerification(email);
      setMessageType("success");
      setMessage("Um novo e-mail de confirmação foi enviado.");
    } catch (error) {
      setMessageType("error");
      setMessage(getPocketBaseError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-[var(--navy)]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--teal)] text-sm font-black tracking-widest text-white">DM</span>
            <span><span className="block text-sm font-black tracking-[0.22em]">DMSAULA</span><span className="block text-xs text-slate-500">Gestão acadêmica</span></span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-[var(--teal)] hover:text-[var(--teal-dark)]">Voltar ao início</Link>
        </header>

        <section className="mx-auto mt-12 max-w-xl rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--teal)]">Acesso do aluno</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--navy)]">
            {state === "register" ? "Crie sua conta" : state === "pending" ? "Confirme seu e-mail" : "Conta confirmada"}
          </h1>

          {state === "register" && (
            <form onSubmit={handleRegister} className="mt-7 space-y-4">
              <label className="block text-sm font-semibold text-[var(--navy)]">Nome completo<input className="field-input mt-2" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: João Lima" /></label>
              <label className="block text-sm font-semibold text-[var(--navy)]">E-mail<input className="field-input mt-2" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></label>
              <label className="block text-sm font-semibold text-[var(--navy)]">Senha<input className="field-input mt-2" required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /></label>
              <label className="block text-sm font-semibold text-[var(--navy)]">Confirme a senha<input className="field-input mt-2" required minLength={8} type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="Repita sua senha" /></label>
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-[var(--teal)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--teal-dark)] disabled:cursor-wait disabled:opacity-60">{busy ? "Criando conta..." : "Criar conta"}</button>
            </form>
          )}

          {state === "pending" && (
            <div className="mt-6 space-y-5">
              <p className="text-sm leading-6 text-slate-600">Abra o e-mail de confirmação e acesse o link. Se o link trouxer você para esta tela, a confirmação será concluída automaticamente.</p>
              <div className="rounded-2xl bg-slate-50 p-4">
                <label className="block text-sm font-semibold text-[var(--navy)]">Ou cole aqui o token do e-mail<input className="field-input mt-2" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Token de confirmação" /></label>
                <button type="button" onClick={() => void confirmToken(token)} disabled={busy} className="mt-3 w-full rounded-xl border border-[var(--teal)] px-4 py-3 text-sm font-bold text-[var(--teal)] transition hover:bg-teal-50 disabled:cursor-wait disabled:opacity-60">{busy ? "Confirmando..." : "Confirmar e-mail"}</button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Não recebeu?</span><button type="button" onClick={() => void resendVerification()} disabled={busy} className="font-bold text-[var(--teal)] hover:underline disabled:opacity-60">Reenviar confirmação</button></div>
            </div>
          )}

          {state === "confirmed" && <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-sm leading-6 text-emerald-800"><p className="font-bold">Tudo certo!</p><p className="mt-1">Seu endereço de e-mail foi validado dentro do DMSAULA.</p><Link href="/" className="mt-4 inline-flex rounded-xl bg-[var(--teal)] px-4 py-2.5 font-bold text-white hover:bg-[var(--teal-dark)]">Ir para o sistema</Link></div>}

          {message && <p role="status" className={`mt-5 rounded-xl px-4 py-3 text-sm leading-6 ${messageType === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p>}
        </section>
      </div>
    </main>
  );
}
