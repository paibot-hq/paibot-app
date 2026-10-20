import LlmMemory from './llm-memory';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/llm-memory" title={`${t('llmMemory.title')} | PAIBOT.app`} description={t('llmMemory.description')} /><LlmMemory /></>;
}
