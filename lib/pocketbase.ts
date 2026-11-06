"use client";

import PocketBase, { BaseAuthStore, ClientResponseError, RecordModel } from "pocketbase";

const pocketBaseUrl = (
  process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090"
).replace(/\/$/, "");

export const pb = new PocketBase(pocketBaseUrl);

// The public auth flow must not reuse the administrator's persisted auth store.
// BaseAuthStore keeps this client stateless and prevents a regular user's
// registration/verification from replacing an active administrator session.
const publicPb = new PocketBase(pocketBaseUrl, new BaseAuthStore());

const standardUserCollection = "users";

export type SchoolRecord = RecordModel & Record<string, unknown>;

export async function registerStandardUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await publicPb.collection(standardUserCollection).create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    passwordConfirm: password,
  });

  await publicPb.collection(standardUserCollection).requestVerification(normalizedEmail);
  return record;
}

export async function requestStandardUserVerification(email: string) {
  return publicPb.collection(standardUserCollection).requestVerification(email.trim().toLowerCase());
}

export async function confirmStandardUserVerification(token: string) {
  const normalizedToken = token.trim();
  if (!normalizedToken) throw new Error("Informe o token recebido no e-mail de confirmação.");
  return publicPb.collection(standardUserCollection).confirmVerification(normalizedToken);
}

export function isAdminAuthenticated() {
  return Boolean(
    pb.authStore.token &&
      pb.authStore.isValid &&
      (pb.authStore.isSuperuser || pb.authStore.record?.collectionName === "_superusers"),
  );
}

export async function signInAsSuperuser(email: string, password: string) {
  pb.authStore.clear();
  const response = await pb.collection("_superusers").authWithPassword(email, password);

  if (!response.token || !isAdminAuthenticated()) {
    pb.authStore.clear();
    throw new Error("O PocketBase não devolveu uma sessão válida de superusuário.");
  }

  await pb.collection("_superusers").authRefresh();
  if (!isAdminAuthenticated()) {
    pb.authStore.clear();
    throw new Error("A sessão do superusuário não foi validada pelo PocketBase.");
  }

  return response;
}

export async function verifyAdminSession() {
  if (!isAdminAuthenticated()) {
    pb.authStore.clear();
    throw new Error("Faça login com o superusuário do PocketBase para continuar.");
  }

  try {
    await pb.collection("_superusers").authRefresh();
  } catch (error) {
    pb.authStore.clear();
    throw new Error(`A sessão expirou ou foi rejeitada pelo PocketBase: ${getPocketBaseError(error)}`);
  }

  if (!isAdminAuthenticated()) {
    pb.authStore.clear();
    throw new Error("A sessão atual não tem permissão de superusuário.");
  }
}

export function getPocketBaseError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.status === 401) {
      return "E-mail ou senha do superusuário inválidos. Use uma conta cadastrada no painel do PocketBase em /_/.";
    }

    const fieldErrors = Object.values(error.response?.data || {})
      .map((value) => {
        if (value && typeof value === "object" && "message" in value) {
          return String(value.message);
        }
        return "";
      })
      .filter(Boolean);

    return fieldErrors[0] || error.response?.message || "Não foi possível concluir a operação.";
  }

  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a operação.";
}
