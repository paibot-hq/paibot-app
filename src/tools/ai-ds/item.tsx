import PracticeItemPage from '../../components/practice/item-page';
import LearnConnections from '../../components/learn-connections';
import { useTranslations } from 'use-intl';
import { Link } from '../../i18n/navigation';
import { GRADIENT_DESCENT_PATH } from '../../lib/app-catalog';
import { learnNodeId } from '../../lib/learn-roadmaps';
import { itemData } from '../../lib/practice';
import { AI_DS_BOOK } from './catalog';
import AiDsDemo from './item-demos';
import { getAiDsLesson } from './lessons';
import { getPlayableAiDsSets } from './problems';
import type { Route } from './+types/item';

const GRADIENT_DESCENT_ITEMS = new Set(['linalg/gradients', 'nn/backpropagation', 'nn/optimizers']);

// /ai-ds/<unit>/<item>: the item's lesson and practice sets (components/practice/item-page.tsx).
export const loader = ({ params }: Route.LoaderArgs) => itemData(AI_DS_BOOK, params, getPlayableAiDsSets(), getAiDsLesson);

export default function AiDsItem({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App.gradientDescent');
  const related = GRADIENT_DESCENT_ITEMS.has(`${loaderData.unit}/${loaderData.item}`)
    ? <Link href={GRADIENT_DESCENT_PATH}>{t('title')} →</Link>
    : undefined;
  const connections = <>
    <LearnConnections nodeId={learnNodeId('ai-ds', loaderData.unit, loaderData.item)} />
    <AiDsDemo unit={loaderData.unit} item={loaderData.item} />
  </>;
  return <PracticeItemPage book={AI_DS_BOOK} {...loaderData} related={related} connections={connections} />;
}
