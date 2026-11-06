"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { RecordModel } from "pocketbase";
import { getPocketBaseError, pb, verifyAdminSession } from "@/lib/pocketbase";
import type { FieldConfig, ResourceConfig } from "./school-config";
import { getField } from "./school-config";
import AdminLogin from "./AdminLogin";

type FormValues = Record<string, string | boolean>;
type RelationOptions = Record<string, RecordModel[]>;
type DisplayRecord = RecordModel & Record<string, unknown> & { expand?: Record<string, RecordModel | RecordModel[]> };

function initialValues(resource: ResourceConfig): FormValues {
  return Object.fromEntries(resource.fields.map((field) => [field.name, field.type === "boolean" ? false : ""]));
}

function valueForForm(record: DisplayRecord, field: FieldConfig): string | boolean {
  const value = record[field.name];
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "date" && typeof value === "string") return value.slice(0, 10);
  return value === null || value === undefined ? "" : String(value);
}

function relationLabel(record: DisplayRecord, field: FieldConfig) {
  const expanded = record.expand?.[field.name];
  const related = Array.isArray(expanded) ? expanded[0] : expanded;
  if (related && field.relation) return String(related[field.relation.labelField] || related.id);
  const raw = record[field.name];
  return Array.isArray(raw) ? `${raw.length} selecionados` : String(raw || "—");
}

function displayValue(record: DisplayRecord, field: FieldConfig) {
  if (field.type === "relation") return relationLabel(record, field);
  const value = record[field.name];
  if (field.type === "boolean") return value ? "Ativo" : "Inativo";
  if (field.type === "date" && typeof value === "string" && value) return new Date(value).toLocaleDateString("pt-BR");
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export default function ResourceManager({ resource }: { resource: ResourceConfig }) {
  const [records, setRecords] = useState<DisplayRecord[]>([]);
  const [relations, setRelations] = useState<RelationOptions>({});
  const [form, setForm] = useState<FormValues>(() => initialValues(resource));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const filter = search.trim() ? `${resource.searchField} ~ '${search.trim().replace(/'/g, "\\'")}'` : undefined;
      const result = await pb.collection(resource.collection).getList<DisplayRecord>(1, 100, {
        sort: "-created",
        expand: resource.fields.filter((field) => field.type === "relation").map((field) => field.name).join(","),
        ...(filter ? { filter } : {}),
      });
      setRecords(result.items);
    } catch (error) {
      setMessage({ type: "error", text: getPocketBaseError(error) });
    } finally {
      setLoading(false);
    }
  }, [resource, search]);

  useEffect(() => {
    const relationFields = resource.fields.filter((field) => field.type === "relation" && field.relation);
    let active = true;
    async function loadRelations() {
      try {
        const loaded = await Promise.all(relationFields.map(async (field) => {
          const relation = field.relation!;
          const result = await pb.collection(relation.collection).getList<RecordModel>(1, 200, { sort: relation.labelField });
          return [field.name, result.items] as const;
        }));
        if (active) setRelations(Object.fromEntries(loaded));
      } catch (error) {
        if (active) setMessage({ type: "error", text: `Não foi possível carregar relações: ${getPocketBaseError(error)}` });
      }
    }
    void loadRelations();
    return () => { active = false; };
  }, [resource]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRecords(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  const relationSummary = useMemo(() => resource.fields.filter((field) => field.type === "relation").length, [resource.fields]);

  function startCreate(clearMessageOrEvent: boolean | MouseEvent<HTMLButtonElement> = true) {
    setEditingId(null);
    setForm(initialValues(resource));
    if (clearMessageOrEvent === true || typeof clearMessageOrEvent !== "boolean") setMessage(null);
  }

  function startEdit(record: DisplayRecord) {
    setEditingId(record.id);
    setForm(Object.fromEntries(resource.fields.map((field) => [field.name, valueForForm(record, field)])));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(field: FieldConfig, value: string | boolean) {
    setForm((current) => ({ ...current, [field.name]: value }));
  }

  function validate() {
    const invalid = resource.fields.find((field) => field.required && (form[field.name] === "" || form[field.name] === null || form[field.name] === undefined));
    if (invalid) {
      setMessage({ type: "error", text: `Preencha o campo obrigatório: ${invalid.label}.` });
      return false;
    }
    return true;
  }

  function payload() {
    return Object.fromEntries(resource.fields.map((field) => {
      const value = form[field.name];
      if (field.type === "number") return [field.name, value === "" ? 0 : Number(value)];
      if (field.type === "boolean") return [field.name, Boolean(value)];
      return [field.name, value];
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setMessage(null);
    try {
      await verifyAdminSession();
      if (editingId) await pb.collection(resource.collection).update(editingId, payload());
      else await pb.collection(resource.collection).create(payload());
      const successMessage = `${resource.singular[0].toUpperCase()}${resource.singular.slice(1)} ${editingId ? "atualizado" : "cadastrado"} com sucesso.`;
      startCreate(false);
      setMessage({ type: "success", text: successMessage });
      await loadRecords();
    } catch (error) {
      setMessage({ type: "error", text: getPocketBaseError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function removeRecord(record: DisplayRecord) {
    if (!window.confirm(`Excluir este ${resource.singular}? Esta ação não pode ser desfeita.`)) return;
    setMessage(null);
    try {
      await verifyAdminSession();
      await pb.collection(resource.collection).delete(record.id);
      setMessage({ type: "success", text: `${resource.singular[0].toUpperCase()}${resource.singular.slice(1)} excluído com sucesso.` });
      if (editingId === record.id) startCreate();
      await loadRecords();
    } catch (error) {
      setMessage({ type: "error", text: getPocketBaseError(error) });
    }
  }

  return (
    <main className="min-h-screen pb-12">
      <header className="bg-[var(--navy)] text-white">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--teal)] text-sm font-black tracking-widest">DM</span><span className="hidden text-sm font-black tracking-[0.22em] sm:block">DMSAULA</span></Link><div className="flex items-center gap-3"><AdminLogin /><Link href="/#recursos" className="text-sm font-semibold text-slate-300 transition hover:text-white">← Todos os recursos</Link></div></div>
          <div className="pb-10 pt-12"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--orange)]">{resource.eyebrow} / PocketBase</p><div className="mt-4 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{resource.label}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">{resource.description} Consulte e gerencie os registros diretamente da collection <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-white">{resource.collection}</code>.</p></div><div className="flex gap-2 text-xs font-semibold text-slate-400"><span className="rounded-full border border-white/15 px-3 py-1.5">{resource.fields.length} campos</span>{relationSummary > 0 && <span className="rounded-full border border-white/15 px-3 py-1.5">{relationSummary} relações</span>}</div></div></div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8"><div className="grid gap-6 lg:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.28fr)] lg:items-start">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--teal)]">{editingId ? "Editar registro" : "Novo registro"}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--navy)]">{editingId ? "Atualize os dados" : `Cadastrar ${resource.singular}`}</h2></div>{editingId && <button type="button" onClick={startCreate} className="text-xs font-bold text-slate-400 underline-offset-4 hover:text-[var(--teal)] hover:underline">Cancelar</button>}</div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{resource.fields.map((field) => <FieldInput key={field.name} field={field} value={form[field.name]} relationOptions={relations[field.name] || []} onChange={updateField} />)}</div><button type="submit" disabled={saving} className="mt-6 w-full rounded-xl bg-[var(--teal)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--teal-dark)] disabled:cursor-wait disabled:opacity-60">{saving ? "Salvando..." : editingId ? "Salvar alterações" : `Cadastrar ${resource.singular}`}</button><p className="mt-3 text-center text-xs leading-5 text-slate-400">A API valida regras de acesso, campos obrigatórios e índices únicos.</p></form>

        <div className="min-w-0 rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--teal)]">Consulta</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--navy)]">Registros salvos</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">{loading ? "..." : `${records.length} encontrados`}</span></div><div className="mt-5 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar por ${getField(resource, resource.searchField)?.label.toLowerCase() || "texto"}`} className="field-input flex-1" /><button type="button" onClick={() => void loadRecords()} className="rounded-xl border border-[var(--line)] px-4 text-sm font-bold text-[var(--navy)] transition hover:border-[var(--teal)] hover:text-[var(--teal)]">Atualizar</button></div>{message && <div role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm leading-6 ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message.text}</div>}<div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--line)]"><table className="min-w-full text-left text-sm"><thead className="border-b border-[var(--line)] bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-400"><tr>{resource.previewFields.map((fieldName) => <th key={fieldName} className="whitespace-nowrap px-4 py-3 font-bold">{getField(resource, fieldName)?.label || fieldName}</th>)}<th className="px-4 py-3 text-right font-bold">Ações</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{loading && <tr><td colSpan={resource.previewFields.length + 1} className="px-4 py-10 text-center text-slate-400">Consultando o PocketBase...</td></tr>}{!loading && records.length === 0 && <tr><td colSpan={resource.previewFields.length + 1} className="px-4 py-10 text-center text-slate-400">Nenhum registro encontrado.</td></tr>}{!loading && records.map((record) => <tr key={record.id} className="transition hover:bg-slate-50/80">{resource.previewFields.map((fieldName) => <td key={fieldName} className="max-w-48 truncate whitespace-nowrap px-4 py-3.5 text-slate-600" title={displayValue(record, getField(resource, fieldName)!)}>{displayValue(record, getField(resource, fieldName)!)}</td>)}<td className="whitespace-nowrap px-4 py-3.5 text-right"><button type="button" onClick={() => startEdit(record)} className="mr-3 text-xs font-bold text-[var(--teal)] hover:underline">Editar</button><button type="button" onClick={() => void removeRecord(record)} className="text-xs font-bold text-rose-500 hover:underline">Excluir</button></td></tr>)}</tbody></table></div></div>
      </div></section>
    </main>
  );
}

function FieldInput({ field, value, relationOptions, onChange }: { field: FieldConfig; value: string | boolean; relationOptions: RecordModel[]; onChange: (field: FieldConfig, value: string | boolean) => void }) {
  const label = <label htmlFor={field.name} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}</label>;
  if (field.type === "boolean") return <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] px-3.5 py-3 text-sm font-semibold text-slate-600 sm:col-span-2 lg:col-span-1 xl:col-span-2"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(field, event.target.checked)} className="h-4 w-4 accent-[var(--teal)]" />{field.label}</label>;
  if (field.type === "select") return <div>{label}<select id={field.name} required={field.required} value={String(value)} onChange={(event) => onChange(field, event.target.value)} className="field-input"><option value="">Selecione...</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
  if (field.type === "relation") return <div>{label}<select id={field.name} required={field.required} value={String(value)} onChange={(event) => onChange(field, event.target.value)} className="field-input"><option value="">Selecione...</option>{relationOptions.map((option) => <option key={option.id} value={option.id}>{String(option[field.relation?.labelField || "name"] || option.id)}</option>)}</select>{relationOptions.length === 0 && <p className="mt-1 text-xs text-amber-600">Cadastre o recurso relacionado primeiro.</p>}</div>;
  return <div>{label}<input id={field.name} required={field.required} type={field.type} min={field.type === "number" && field.name.includes("nota") ? 0 : undefined} max={field.type === "number" && field.name.includes("nota") ? 10 : undefined} value={String(value)} onChange={(event) => onChange(field, event.target.value)} placeholder={field.placeholder} className="field-input" /></div>;
}
