import { useTranslations } from 'use-intl';
import ToolLayout from '../components/tool-layout';

export default function Math() {
  const t = useTranslations('App');
  return <>
    <title>{`${t('math.title')} | PAIBOT.app`}</title>
    <ToolLayout title={t('math.comingSoonTitle')} layout="centered" centerTitle>
      <p>{t('math.comingSoonBody')}</p>
    </ToolLayout>
  </>;
}
