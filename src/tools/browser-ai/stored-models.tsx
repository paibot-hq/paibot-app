import { useTranslations } from "use-intl";
import styles from "./browser-ai.module.css";
import { MODELS, type ModelId } from "./models";
import type { Stored } from "./storage";

type Owner = ModelId | "other";

export const formatSize = (bytes: number) => bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;

// The models saved in this browser, each with a button to delete it, and one to delete them all.
export default function StoredModels({ stored, disabled, onDelete }: { stored: Stored | undefined; disabled: boolean; onDelete: (owner?: Owner) => void }) {
  const t = useTranslations("App.browserAi");
  const owners = [...MODELS.map(m => m.id), "other" as const].filter(owner => stored?.[owner] !== undefined);
  const total = owners.reduce((sum, owner) => sum + stored![owner]!, 0);
  const name = (owner: Owner) => owner === "other" ? t("storedOther") : MODELS.find(m => m.id === owner)!.name;

  const remove = (owner?: Owner) => {
    const question = owner ? t("confirmDelete", { name: name(owner), size: formatSize(stored![owner]!) }) : t("confirmDeleteAll", { size: formatSize(total) });
    if (window.confirm(question)) onDelete(owner);
  };

  return (
    <section className={styles.stored} aria-labelledby="browser-ai-stored" data-ai="stored">
      <h2 id="browser-ai-stored" className={styles.storedTitle}>{t("storedTitle")}</h2>
      {stored === undefined ? null : owners.length === 0 ? <p className={styles.note}>{t("storedNone")}</p> : (
        <>
          <ul className={styles.storedList}>
            {owners.map(owner => (
              <li key={owner}>
                <span>{name(owner)}</span>
                <span className={styles.storedSize}>{formatSize(stored[owner]!)}</span>
                <button type="button" className={styles.secondary} disabled={disabled} onClick={() => remove(owner)} aria-label={t("deleteOne", { name: name(owner) })}>{t("delete")}</button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.secondary} disabled={disabled} onClick={() => remove()}>{t("deleteAll", { size: formatSize(total) })}</button>
        </>
      )}
    </section>
  );
}
