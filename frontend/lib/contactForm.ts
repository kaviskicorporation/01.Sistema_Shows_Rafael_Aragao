/** Tipos e defaults do formulário público de contratação. */

export type ContactFieldType = "text" | "email" | "tel" | "textarea" | "select";
export type ContactFieldWidth = "full" | "half";

export interface ContactOption {
  id: string;
  label: string;
}

export interface ContactFormField {
  id: string;
  key: string;
  type: ContactFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  width: ContactFieldWidth;
  options?: "areas" | "categories" | "custom" | null;
  custom_options?: ContactOption[];
}

export interface ContactFormConfig {
  submit_label: string;
  areas: ContactOption[];
  categories: ContactOption[];
  fields: ContactFormField[];
}

export const DEFAULT_CONTACT_FORM: ContactFormConfig = {
  submit_label: "Solicitar informações",
  areas: [
    { id: "eventos", label: "Eventos e Entretenimento" },
    { id: "comercio", label: "Comércio / Varejo" },
    { id: "industria", label: "Indústria" },
    { id: "tecnologia", label: "Tecnologia" },
    { id: "saude", label: "Saúde" },
    { id: "educacao", label: "Educação" },
    { id: "agronegocio", label: "Agronegócio" },
    { id: "construcao", label: "Construção Civil" },
    { id: "publico", label: "Setor Público / Prefeitura" },
    { id: "servicos", label: "Serviços" },
    { id: "outros", label: "Outros" },
  ],
  categories: [
    { id: "corporativo", label: "Evento corporativo" },
    { id: "particular", label: "Evento particular" },
    { id: "prefeitura", label: "Prefeitura" },
    { id: "casa_shows", label: "Casa de shows" },
    { id: "teatro", label: "Teatro" },
    { id: "festival", label: "Festival" },
    { id: "comercial", label: "Comercial" },
    { id: "outros", label: "Outros" },
  ],
  fields: [
    {
      id: "name",
      key: "name",
      type: "text",
      label: "Nome / Empresa",
      placeholder: "Seu nome ou empresa",
      required: true,
      enabled: true,
      width: "full",
    },
    {
      id: "area",
      key: "area",
      type: "select",
      options: "areas",
      label: "Área de atuação",
      placeholder: "Selecione...",
      required: true,
      enabled: true,
      width: "half",
    },
    {
      id: "category",
      key: "category",
      type: "select",
      options: "categories",
      label: "Tipo de evento",
      placeholder: "Selecione...",
      required: true,
      enabled: true,
      width: "half",
    },
    {
      id: "email",
      key: "email",
      type: "email",
      label: "E-mail",
      placeholder: "voce@email.com",
      required: true,
      enabled: true,
      width: "half",
    },
    {
      id: "phone",
      key: "phone",
      type: "tel",
      label: "Telefone",
      placeholder: "(00) 00000-0000",
      required: true,
      enabled: true,
      width: "half",
    },
    {
      id: "message",
      key: "message",
      type: "textarea",
      label: "Mensagem (opcional)",
      placeholder: "Conte mais sobre o seu evento...",
      required: false,
      enabled: true,
      width: "full",
    },
  ],
};

export const SYSTEM_FIELD_KEYS = new Set([
  "name",
  "area",
  "category",
  "email",
  "phone",
  "message",
]);

export function slugifyOption(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || `item_${Date.now()}`;
}
