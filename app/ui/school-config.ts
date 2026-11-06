export type FieldType = "text" | "email" | "number" | "date" | "boolean" | "select" | "relation";

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  relation?: { collection: string; labelField: string };
};

export type ResourceConfig = {
  slug: string;
  collection: string;
  label: string;
  singular: string;
  eyebrow: string;
  description: string;
  icon: string;
  tone: "teal" | "orange" | "blue" | "purple" | "green" | "rose";
  searchField: string;
  fields: FieldConfig[];
  previewFields: string[];
};

export const resources: ResourceConfig[] = [
  {
    slug: "alunos", collection: "tb_aluno", label: "Alunos", singular: "aluno", eyebrow: "Cadastro principal",
    description: "Consulte e mantenha os alunos cadastrados na collection existente do PocketBase.", icon: "00", tone: "teal", searchField: "nome",
    fields: [
      { name: "nome", label: "Nome completo", type: "text", required: true, placeholder: "Ex.: João Lima" },
      { name: "idade", label: "Idade", type: "number", required: true, placeholder: "Ex.: 20" },
      { name: "email", label: "E-mail", type: "email", required: true, placeholder: "aluno@escola.com" },
      { name: "UF", label: "UF", type: "text", placeholder: "Ex.: MT" },
    ], previewFields: ["nome", "idade", "email", "UF"],
  },
  {
    slug: "produtos", collection: "tb_produto", label: "Produtos", singular: "produto", eyebrow: "Cadastro auxiliar",
    description: "Consulte os produtos cadastrados no PocketBase.", icon: "07", tone: "orange", searchField: "nome",
    fields: [
      { name: "nome", label: "Nome do produto", type: "text", placeholder: "Ex.: Material didático" },
      { name: "valor", label: "Valor", type: "number", placeholder: "Ex.: 99.90" },
    ], previewFields: ["nome", "valor"],
  },
  {
    slug: "cursos", collection: "tb_curso", label: "Cursos", singular: "curso", eyebrow: "Estrutura acadêmica",
    description: "Organize os cursos e a carga horária oferecida pela instituição.", icon: "01", tone: "teal", searchField: "nome",
    fields: [
      { name: "nome", label: "Nome do curso", type: "text", required: true, placeholder: "Ex.: Análise e Desenvolvimento de Sistemas" },
      { name: "carga_horaria", label: "Carga horária", type: "number", placeholder: "Ex.: 2400" },
      { name: "ativo", label: "Curso ativo", type: "boolean" },
    ], previewFields: ["nome", "carga_horaria", "ativo"],
  },
  {
    slug: "professores", collection: "tb_professores", label: "Professores", singular: "professor", eyebrow: "Equipe acadêmica",
    description: "Mantenha os dados de contato e a titulação do corpo docente.", icon: "02", tone: "orange", searchField: "nome",
    fields: [
      { name: "nome", label: "Nome completo", type: "text", required: true, placeholder: "Ex.: Ana Souza" },
      { name: "email", label: "E-mail", type: "email", required: true, placeholder: "professor@escola.com" },
      { name: "titulacao", label: "Titulação", type: "select", options: ["graduado", "espeicalista", "mestre", "doutor"] },
    ], previewFields: ["nome", "email", "titulacao"],
  },
  {
    slug: "disciplinas", collection: "tb_disciplinas", label: "Disciplinas", singular: "disciplina", eyebrow: "Matriz curricular",
    description: "Consulte códigos, carga horária e o curso de cada disciplina.", icon: "03", tone: "blue", searchField: "nome",
    fields: [
      { name: "codigo", label: "Código", type: "text", required: true, placeholder: "Ex.: BD1" },
      { name: "nome", label: "Nome da disciplina", type: "text", required: true, placeholder: "Ex.: Banco de Dados I" },
      { name: "carga_horaria", label: "Carga horária", type: "number", placeholder: "Ex.: 80" },
      { name: "curso", label: "Curso", type: "relation", relation: { collection: "tb_curso", labelField: "nome" } },
    ], previewFields: ["codigo", "nome", "curso", "carga_horaria"],
  },
  {
    slug: "estudantes", collection: "tb_estudantes", label: "Estudantes", singular: "estudante", eyebrow: "Vida acadêmica",
    description: "Cadastre e acompanhe os estudantes vinculados aos cursos.", icon: "04", tone: "purple", searchField: "nome",
    fields: [
      { name: "ra", label: "Registro acadêmico", type: "text", required: true, placeholder: "Ex.: RA001" },
      { name: "nome", label: "Nome completo", type: "text", required: true, placeholder: "Ex.: João Lima" },
      { name: "email", label: "E-mail", type: "email", placeholder: "estudante@aluno.com" },
      { name: "data_nascimento", label: "Data de nascimento", type: "date" },
      { name: "curso", label: "Curso", type: "relation", relation: { collection: "tb_curso", labelField: "nome" } },
    ], previewFields: ["ra", "nome", "email", "curso"],
  },
  {
    slug: "turmas", collection: "tb_turmas", label: "Turmas", singular: "turma", eyebrow: "Operação letiva",
    description: "Defina as turmas, períodos e responsáveis por cada disciplina.", icon: "05", tone: "green", searchField: "codigo",
    fields: [
      { name: "codigo", label: "Código da turma", type: "text", required: true, placeholder: "Ex.: BD1-2026-1" },
      { name: "ano", label: "Ano", type: "number", required: true, placeholder: "Ex.: 2026" },
      { name: "semestre", label: "Semestre", type: "select", options: ["1", "2"] },
      { name: "disciplina", label: "Disciplina", type: "relation", relation: { collection: "tb_disciplinas", labelField: "nome" } },
      { name: "professor", label: "Professor", type: "relation", relation: { collection: "tb_professores", labelField: "nome" } },
    ], previewFields: ["codigo", "ano", "semestre", "disciplina", "professor"],
  },
  {
    slug: "matriculas", collection: "tb_matriculas", label: "Matrículas", singular: "matrícula", eyebrow: "Acompanhamento",
    description: "Acompanhe notas, frequência e situação dos estudantes nas turmas.", icon: "06", tone: "rose", searchField: "situacao",
    fields: [
      { name: "estudante", label: "Estudante", type: "relation", required: true, relation: { collection: "tb_estudantes", labelField: "nome" } },
      { name: "turma", label: "Turma", type: "relation", required: true, relation: { collection: "tb_turmas", labelField: "codigo" } },
      { name: "nota1", label: "Nota 1", type: "number", placeholder: "0 a 10" },
      { name: "nota2", label: "Nota 2", type: "number", placeholder: "0 a 10" },
      { name: "frequencia", label: "Frequência (%)", type: "number", placeholder: "0 a 100" },
      { name: "situacao", label: "Situação", type: "select", options: ["cursando", "aprovado", "reprovado", "trancado"] },
    ], previewFields: ["estudante", "turma", "nota1", "nota2", "frequencia", "situacao"],
  },
];

export function getResource(slug: string) {
  return resources.find((resource) => resource.slug === slug);
}

export function getField(resource: ResourceConfig, name: string) {
  return resource.fields.find((field) => field.name === name);
}
