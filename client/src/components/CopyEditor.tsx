import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  beginCopyEditing,
  collectCopyChanges,
  commitCopyEditing,
  countCopyChanges,
  getCopyApplyReport,
  listEditableStrings,
  revertCopyEditing,
  type AttrItem,
  type CopyApplyReport,
} from "@/lib/copyOverrides";

/**
 * Editor de texto da landing page. So e' montado em desenvolvimento (ver
 * App.tsx) e so funciona com o servidor do Vite a correr, que e' quem grava o
 * ficheiro: POST /__copy -> client/src/content/copy.json.
 *
 * Fluxo: "editar textos" liga a edicao no sitio (cada texto da pagina fica
 * editavel em linha) -> "gravar no projeto" escreve o JSON e recarrega.
 */

type SaveResponse = { success?: boolean; error?: string; count?: number; file?: string };

const SAVE_ENDPOINT = "/__copy";

export default function CopyEditor() {
  const [editing, setEditing] = useState(false);
  const [changed, setChanged] = useState(0);
  const [attrs, setAttrs] = useState<AttrItem[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showAttrs, setShowAttrs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<CopyApplyReport | null>(null);

  const startEditing = () => {
    const count = beginCopyEditing();
    setAttrs(listEditableStrings());
    setDraft({});
    setChanged(0);
    setReport(getCopyApplyReport());
    setEditing(true);
    if (count === 0) toast("Não encontrei texto editável nesta página.");
  };

  const discard = () => {
    revertCopyEditing();
    setEditing(false);
    setAttrs([]);
    setDraft({});
    setChanged(0);
  };

  // Contador de alterações: um varrimento por segundo chega e nao trava nada.
  useEffect(() => {
    if (!editing) return;
    const update = () => setChanged(countCopyChanges(draft));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [editing, draft]);

  const save = async () => {
    const payload = collectCopyChanges(draft);
    const total = Object.keys(payload.text).length + Object.keys(payload.attrs).length;
    if (total === 0) {
      toast("Ainda não alteraste nenhum texto.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(SAVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as SaveResponse;
      if (!response.ok || !data.success) throw new Error(data.error ?? `HTTP ${response.status}`);
      commitCopyEditing();
      setEditing(false);
      setAttrs([]);
      setDraft({});
      setChanged(0);
      toast.success(`${total} ${total === 1 ? "texto gravado" : "textos gravados"} em client/src/content/copy.json`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`Não gravei: ${detail}. O servidor de desenvolvimento tem de estar a correr (pnpm dev).`);
    } finally {
      setBusy(false);
    }
  };

  const exportChanges = () => {
    const json = JSON.stringify(collectCopyChanges(draft), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "copy-overrides.json";
    link.click();
    URL.revokeObjectURL(url);
    void (navigator.clipboard?.writeText(json) ?? Promise.resolve()).catch(() => undefined);
    toast.success("Exportado e copiado para a área de transferência.");
  };

  return (
    <div className="copy-edit-ui" data-copy-ui="true">
      {!editing ? (
        <button type="button" className="copy-edit-toggle" onClick={startEditing}>
          editar textos
        </button>
      ) : (
        <div className="copy-edit-panel" role="dialog" aria-label="Modo edição de texto">
          <div className="copy-edit-head">
            <span className="copy-edit-title">modo edição</span>
            <span className={`copy-edit-count${changed > 0 ? " is-dirty" : ""}`}>
              {changed === 0 ? "sem alterações" : `${changed} ${changed === 1 ? "alteração" : "alterações"}`}
            </span>
          </div>

          <p className="copy-edit-hint">
            Clica em qualquer texto da página e escreve por cima. Depois <strong>grava no projeto</strong> — o texto fica
            guardado no repositório e continua lá depois de recarregares. As mudanças de linha que escreveres não
            aparecem na página (o HTML junta-as): separa com « · » ou escreve seguido.
          </p>

          {report && report.total > 0 && (
            <p className="copy-edit-state">
              <strong>
                {report.applied} de {report.total}
              </strong>{" "}
              entradas ativas nesta página
              {report.missing.length > 0 && (
                <>
                  {" "}
                  · {report.missing.length} sem alvo agora (vivem em estados que só se abrem por interacção: menu
                  móvel, módulos do processo, outros filtros)
                </>
              )}
            </p>
          )}

          <div className="copy-edit-actions">
            <button
              type="button"
              className="copy-edit-button copy-edit-primary"
              disabled={busy || changed === 0}
              onClick={() => void save()}
            >
              {busy ? "a gravar…" : "gravar no projeto"}
            </button>
            <button type="button" className="copy-edit-button" onClick={discard} disabled={busy}>
              descartar
            </button>
            <button type="button" className="copy-edit-button" onClick={exportChanges}>
              exportar
            </button>
          </div>

          {attrs.length > 0 && (
            <div className="copy-edit-attrs">
              <button type="button" className="copy-edit-section" onClick={() => setShowAttrs((value) => !value)}>
                {showAttrs ? "−" : "+"} textos de campos, rótulos e opções ({attrs.length})
              </button>
              {showAttrs && (
                <div className="copy-edit-attr-list">
                  {attrs.map((item) => (
                    <label key={item.key} className="copy-edit-attr-row">
                      <span className="copy-edit-attr-label">{item.label}</span>
                      <input
                        className="copy-edit-attr-input"
                        value={draft[item.key] ?? item.value}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, [item.key]: event.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}