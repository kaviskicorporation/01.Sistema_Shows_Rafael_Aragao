"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Bold,
  Italic,
  Link2,
  Mail,
  Maximize2,
  Minimize2,
  Paperclip,
  RefreshCw,
  Reply,
  Send,
  Underline,
  X,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { CardEmailAttachment, CardEmailMessage } from "@/lib/types";
import ThemedSelect from "@/components/ui/ThemedSelect";

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("pt-BR");
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = (now.getTime() - that.getTime()) / 86400000;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR");
}

function canonicalSubject(raw: string) {
  return (raw || "")
    .replace(/^\s*((re|fwd|fw|res|enc)\s*:\s*)+/gi, "")
    .trim()
    .toLowerCase();
}

function replySubject(raw: string) {
  const core = (raw || "").replace(/^\s*((re|fwd|fw|res|enc)\s*:\s*)+/gi, "").trim();
  return core ? `Re: ${core}` : "";
}

type ThreadOpt = {
  key: string;
  label: string;
  lastId: number;
  count: number;
};

export default function EmailThreadPanel({
  emails,
  leadEmail,
  writable,
  sending,
  onSend,
  onSync,
}: {
  emails: CardEmailMessage[];
  leadEmail: string;
  writable: boolean;
  sending: boolean;
  onSend: (payload: {
    subject: string;
    body: string;
    kind: "text" | "html";
    files: File[];
    replyTo?: number;
  }) => Promise<void>;
  onSync?: () => Promise<string>;
}) {
  const threads = useMemo<ThreadOpt[]>(() => {
    const map = new Map<string, ThreadOpt>();
    for (const m of emails) {
      if (m.is_bounce) continue;
      const key = canonicalSubject(m.subject);
      if (!key) continue;
      const prev = map.get(key);
      if (prev) {
        prev.lastId = m.id;
        prev.count += 1;
      } else {
        map.set(key, {
          key,
          label: m.subject.replace(/^\s*((re|fwd|fw|res|enc)\s*:\s*)+/gi, "").trim(),
          lastId: m.id,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [emails]);

  const [threadKey, setThreadKey] = useState("new");
  const [newSubject, setNewSubject] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"text" | "html">("text");
  const [files, setFiles] = useState<File[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [openMail, setOpenMail] = useState<CardEmailMessage | null>(null);
  const [htmlReady, setHtmlReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const htmlRef = useRef<HTMLDivElement>(null);
  const initThread = useRef(false);

  const activeThread = threads.find((t) => t.key === threadKey);
  const isNew = threadKey === "new" || !activeThread;
  const subjectValue = isNew ? newSubject : replySubject(activeThread.label);

  useEffect(() => {
    if (!threads.length) return;
    if (!initThread.current) {
      initThread.current = true;
      setThreadKey(threads[threads.length - 1].key);
      return;
    }
    if (threadKey !== "new" && !threads.some((t) => t.key === threadKey)) {
      setThreadKey(threads[threads.length - 1].key);
    }
  }, [threads, threadKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [emails.length, expanded]);

  async function sync() {
    if (!onSync || syncing) return;
    setSyncing(true);
    setSyncMsg("");
    try {
      setSyncMsg(await onSync());
    } catch {
      setSyncMsg("Não foi possível ler a caixa de entrada.");
    } finally {
      setSyncing(false);
    }
  }

  function htmlBody() {
    return (htmlRef.current?.innerHTML || "").trim();
  }

  function htmlText() {
    return (htmlRef.current?.innerText || "").trim();
  }

  function applyFormat(cmd: string) {
    htmlRef.current?.focus();
    document.execCommand(cmd, false);
  }

  function applyLink() {
    const url = window.prompt("URL do link");
    if (!url) return;
    htmlRef.current?.focus();
    document.execCommand("createLink", false, url);
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const payloadBody = kind === "html" ? htmlBody() : body.trim();
    const hasBody = kind === "html" ? Boolean(htmlText()) : Boolean(body.trim());
    if (!subjectValue.trim() || !hasBody || sending) return;
    await onSend({
      subject: subjectValue.trim(),
      body: payloadBody,
      kind,
      files,
      replyTo: isNew ? undefined : activeThread?.lastId,
    });
    setBody("");
    setFiles([]);
    if (htmlRef.current) htmlRef.current.innerHTML = "";
    setHtmlReady(false);
    if (fileRef.current) fileRef.current.value = "";
    if (isNew) setNewSubject("");
  }

  const canSend =
    !sending &&
    Boolean(subjectValue.trim()) &&
    (kind === "html" ? htmlReady : Boolean(body.trim()));

  const panel = (
    <section
      className={`flex min-h-0 flex-col ${
        expanded
          ? "h-full rounded-2xl border border-indigo-300/20 bg-[#141414] p-4"
          : "h-full"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-300">
          <Mail size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-indigo-200">
            Troca de e-mails
          </p>
          <p className="truncate text-[10px] text-white/35">
            Fio com {leadEmail || "este lead"}
          </p>
        </div>
        {onSync && (
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-200 hover:bg-indigo-400/15 disabled:opacity-50"
            title="Buscar novas respostas na caixa de entrada"
          >
            <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Buscando" : "Buscar respostas"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-indigo-200 hover:bg-indigo-400/15"
          title={expanded ? "Reduzir" : "Ampliar troca de e-mails"}
        >
          {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {syncMsg && (
        <p className="mb-2 rounded-xl bg-indigo-400/10 px-2.5 py-1.5 text-[10px] text-indigo-100">
          {syncMsg}
        </p>
      )}

      <div
        className={`min-h-0 flex-1 space-y-2.5 overflow-y-auto crm-scroll ${
          expanded ? "pr-1" : ""
        }`}
      >
        {emails.length === 0 && (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl bg-indigo-400/[0.06] text-center">
            <Mail size={22} className="text-indigo-300/70" />
            <p className="max-w-[16rem] text-xs text-white/45">
              Nenhuma troca ainda. Ao cadastrar, a confirmação entra aqui como
              envio da equipe. Respostas do lead aparecem do outro lado.
            </p>
          </div>
        )}
        {emails.map((m, i) => {
          const mine = m.direction === "out";
          const bounce = m.is_bounce;
          const showDay =
            i === 0 ||
            dayKey(m.created_at) !== dayKey(emails[i - 1].created_at);
          return (
            <div key={m.id}>
              {showDay && (
                <p className="mb-2 mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-indigo-300/50">
                  {dayLabel(m.created_at)}
                </p>
              )}
              <div className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    bounce
                      ? "bg-red-400/25 text-red-200"
                      : mine
                        ? "bg-indigo-400 text-ink"
                        : "bg-white/10 text-white/70"
                  }`}
                >
                  {bounce ? <AlertTriangle size={12} /> : mine ? "RA" : "IN"}
                </div>
                <div className={`max-w-[82%] ${mine ? "items-end" : ""}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 ${
                      bounce
                        ? "rounded-tl-md border border-red-400/30 bg-red-400/10 text-red-50"
                        : mine
                          ? "rounded-tr-md bg-indigo-400/25 text-white"
                          : "rounded-tl-md bg-white/[0.07] text-white/90"
                    }`}
                  >
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-[11px] font-semibold ${
                          bounce ? "text-red-200" : "text-indigo-200"
                        }`}
                      >
                        {bounce
                          ? "Não entregue"
                          : mine
                            ? "Equipe"
                            : m.from_email}
                      </span>
                      <span
                        className="text-[10px] text-white/35"
                        title={formatDateTime(m.created_at)}
                      >
                        {relativeTime(m.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenMail(m)}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-indigo-200/70 hover:bg-black/30 hover:text-indigo-100"
                        title="Abrir em pop-up"
                      >
                        <Maximize2 size={11} />
                      </button>
                    </div>
                    <p className="mb-1 truncate text-[10px] text-white/40">
                      De: {m.from_email} · Para: {m.to_email}
                    </p>
                    {m.subject && (
                      <p className="mb-1 truncate text-[11px] font-medium text-white/55">
                        Assunto: {m.subject}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpenMail(m)}
                      className="block w-full cursor-zoom-in text-left"
                      title="Abrir e-mail em pop-up"
                    >
                      <div className="relative max-h-24 overflow-hidden">
                        <MessageBody message={m} compact />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                    </button>
                    {m.files?.length > 0 && (
                      <AttachmentChips files={m.files} />
                    )}
                    {writable && !bounce && m.subject && (
                      <button
                        type="button"
                        onClick={() =>
                          setThreadKey(canonicalSubject(m.subject) || "new")
                        }
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-200/80 hover:text-indigo-100"
                      >
                        <Reply size={10} />
                        Responder neste assunto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {writable && (
        <form
          onSubmit={(e) => void submit(e)}
          className="mt-2 space-y-2 rounded-2xl bg-indigo-400/10 p-2"
        >
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <ThemedSelect
              compact
              value={threadKey}
              onChange={setThreadKey}
              className="w-full sm:max-w-[58%]"
              options={[
                ...threads.map((t) => ({
                  value: t.key,
                  label: `Responder: ${t.label} (${t.count})`,
                })),
                { value: "new", label: "Novo assunto" },
              ]}
            />
            {isNew ? (
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Assunto novo"
                className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-gold"
              />
            ) : (
              <p className="min-w-0 flex-1 truncate px-1 text-[11px] text-white/45">
                Continua em: {subjectValue}
              </p>
            )}
          </div>
          {kind === "html" ? (
            <div>
              <div className="mb-1 flex gap-1 px-1">
                <FormatBtn label="Negrito" onClick={() => applyFormat("bold")}>
                  <Bold size={12} />
                </FormatBtn>
                <FormatBtn label="Itálico" onClick={() => applyFormat("italic")}>
                  <Italic size={12} />
                </FormatBtn>
                <FormatBtn
                  label="Sublinhado"
                  onClick={() => applyFormat("underline")}
                >
                  <Underline size={12} />
                </FormatBtn>
                <FormatBtn label="Link" onClick={applyLink}>
                  <Link2 size={12} />
                </FormatBtn>
              </div>
              <div
                ref={htmlRef}
                contentEditable
                data-placeholder="Corpo do e-mail em HTML"
                onInput={() => setHtmlReady(Boolean(htmlText()))}
                className={`email-html overflow-y-auto rounded-xl border-0 bg-transparent px-2 py-2 text-sm outline-none empty:before:text-white/30 empty:before:content-[attr(data-placeholder)] ${
                  expanded ? "min-h-[220px]" : "min-h-[96px] max-h-48"
                }`}
              />
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={expanded ? 10 : 3}
              placeholder="Corpo do e-mail"
              className={`w-full resize-y rounded-xl border-0 bg-transparent px-2 py-2 text-sm outline-none ${
                expanded ? "min-h-[220px]" : "max-h-48 min-h-[72px]"
              }`}
            />
          )}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-white/70"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-white/40 hover:text-white"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const next = Array.from(e.target.files || []);
                if (next.length) setFiles((prev) => [...prev, ...next]);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-indigo-200 hover:bg-indigo-400/15"
              title="Anexar arquivo"
            >
              <Paperclip size={16} />
            </button>
            <div className="min-w-0 flex-1" />
            <div className="flex rounded-full bg-black/40 p-0.5">
              <button
                type="button"
                onClick={() => setKind("text")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  kind === "text"
                    ? "bg-indigo-400 text-ink"
                    : "text-white/45 hover:text-white/80"
                }`}
              >
                Texto
              </button>
              <button
                type="button"
                onClick={() => setKind("html")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  kind === "html"
                    ? "bg-indigo-400 text-ink"
                    : "text-white/45 hover:text-white/80"
                }`}
              >
                HTML
              </button>
            </div>
            <button
              type="submit"
              disabled={!canSend}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-400 text-ink disabled:opacity-40"
              title="Enviar e-mail"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      )}
    </section>
  );

  if (!expanded && !openMail) return panel;

  return (
    <>
      {expanded ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6">
          <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col">
            {panel}
          </div>
        </div>
      ) : (
        panel
      )}
      {openMail && (
        <MessagePopup
          message={openMail}
          writable={writable}
          onClose={() => setOpenMail(null)}
          onReply={() => {
            if (openMail.subject) {
              setThreadKey(canonicalSubject(openMail.subject) || "new");
            }
            setOpenMail(null);
          }}
        />
      )}
    </>
  );
}

function FormatBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-indigo-200 hover:bg-indigo-400/15"
    >
      {children}
    </button>
  );
}

function MessageBody({
  message,
  compact = false,
}: {
  message: CardEmailMessage;
  compact?: boolean;
}) {
  if (message.body_kind === "html" && message.body_html_safe) {
    return (
      <div
        className={`email-html leading-relaxed [&_a]:text-indigo-200 [&_a]:underline ${
          compact ? "text-[13px]" : "text-[15px]"
        }`}
        dangerouslySetInnerHTML={{ __html: message.body_html_safe }}
      />
    );
  }
  return (
    <p
      className={`whitespace-pre-wrap leading-relaxed ${
        compact ? "text-[13px]" : "text-[15px]"
      }`}
    >
      {message.body_text || " "}
    </p>
  );
}

function AttachmentChips({ files }: { files: CardEmailAttachment[] }) {
  if (!files?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {files.map((f) => (
        <a
          key={f.id}
          href={f.file_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-indigo-100 hover:bg-black/50"
        >
          <Paperclip size={10} />
          {f.name}
        </a>
      ))}
    </div>
  );
}

function MessagePopup({
  message,
  writable,
  onClose,
  onReply,
}: {
  message: CardEmailMessage;
  writable: boolean;
  onClose: () => void;
  onReply: () => void;
}) {
  const mine = message.direction === "out";
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={message.subject || "E-mail"}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-start gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              message.is_bounce
                ? "bg-red-400/25 text-red-200"
                : mine
                  ? "bg-indigo-400 text-ink"
                  : "bg-white/10 text-white/80"
            }`}
          >
            {message.is_bounce ? (
              <AlertTriangle size={14} />
            ) : mine ? (
              "RA"
            ) : (
              "IN"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-white">
              {message.subject || "(sem assunto)"}
            </p>
            <p className="mt-0.5 text-[12px] text-white/55">
              De: {message.from_email}
            </p>
            <p className="text-[12px] text-white/55">Para: {message.to_email}</p>
            <p className="mt-0.5 text-[11px] text-white/35">
              {formatDateTime(message.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
            title="Fechar"
          >
            <X size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 crm-scroll">
          <MessageBody message={message} />
          <AttachmentChips files={message.files} />
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          {writable && !message.is_bounce && (
            <button
              type="button"
              onClick={onReply}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-400 px-4 py-2 text-sm font-semibold text-ink"
            >
              <Reply size={14} />
              Responder
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
