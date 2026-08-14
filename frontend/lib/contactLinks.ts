/** Helpers de contato: WhatsApp e provedores de e-mail. */

export function digitsOnly(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

/** Monta número E.164 BR para wa.me (com DDI 55 quando fizer sentido). */
export function whatsappDigits(phone: string): string | null {
  let d = digitsOnly(phone);
  if (!d) return null;
  // remove zeros à esquerda excessivos
  d = d.replace(/^0+/, "");
  if (d.length < 10) return null;
  // já tem DDI
  if (d.startsWith("55") && d.length >= 12) return d;
  // celular/fix BR sem DDI (10 ou 11 dígitos)
  if (d.length === 10 || d.length === 11) return `55${d}`;
  // outros com tamanho razoável
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

export function whatsappUrl(phone: string): string | null {
  const d = whatsappDigits(phone);
  if (!d) return null;
  return `https://wa.me/${d}`;
}

export type EmailProvider =
  | "gmail"
  | "outlook"
  | "yahoo"
  | "icloud"
  | "proton"
  | "unknown";

export function detectEmailProvider(email: string): EmailProvider {
  const domain = (email.split("@")[1] || "").toLowerCase().trim();
  if (!domain) return "unknown";
  if (
    domain === "gmail.com" ||
    domain === "googlemail.com" ||
    domain.endsWith(".gmail.com")
  ) {
    return "gmail";
  }
  if (
    ["outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.com.br"].includes(
      domain
    ) ||
    domain.endsWith(".outlook.com")
  ) {
    return "outlook";
  }
  if (domain === "yahoo.com" || domain === "yahoo.com.br" || domain.startsWith("yahoo.")) {
    return "yahoo";
  }
  if (["icloud.com", "me.com", "mac.com"].includes(domain)) {
    return "icloud";
  }
  if (domain === "proton.me" || domain === "protonmail.com") {
    return "proton";
  }
  return "unknown";
}

export const EMAIL_PROVIDER_META: Record<
  EmailProvider,
  { label: string; bg: string; border: string; text: string; iconBg: string }
> = {
  gmail: {
    label: "Gmail",
    bg: "bg-[#EA4335]/15",
    border: "border-[#EA4335]/35",
    text: "text-[#F28B82]",
    iconBg: "bg-[#EA4335]",
  },
  outlook: {
    label: "Outlook",
    bg: "bg-[#0078D4]/15",
    border: "border-[#0078D4]/35",
    text: "text-[#6CB6F3]",
    iconBg: "bg-[#0078D4]",
  },
  yahoo: {
    label: "Yahoo",
    bg: "bg-[#6001D2]/20",
    border: "border-[#6001D2]/40",
    text: "text-[#C4A8FF]",
    iconBg: "bg-[#6001D2]",
  },
  icloud: {
    label: "iCloud",
    bg: "bg-white/10",
    border: "border-white/25",
    text: "text-white/80",
    iconBg: "bg-[#A2AAAD]",
  },
  proton: {
    label: "Proton",
    bg: "bg-[#6D4AFF]/15",
    border: "border-[#6D4AFF]/35",
    text: "text-[#B5A5FF]",
    iconBg: "bg-[#6D4AFF]",
  },
  unknown: {
    label: "E-mail",
    bg: "bg-violet-500/15",
    border: "border-violet-400/35",
    text: "text-violet-200",
    iconBg: "bg-violet-600",
  },
};

/** Abre compose no webmail (nova aba) ou mailto para provedores genéricos. */
export function emailComposeUrl(email: string): string {
  const to = encodeURIComponent(email.trim());
  const provider = detectEmailProvider(email);
  switch (provider) {
    case "gmail":
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}`;
    case "outlook":
      return `https://outlook.live.com/mail/0/deeplink/compose?to=${to}`;
    case "yahoo":
      return `https://compose.mail.yahoo.com/?to=${to}`;
    case "proton":
      return `https://mail.proton.me/u/0/mailto?to=${to}`;
    default:
      return `mailto:${email.trim()}`;
  }
}
