import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import { isLocale } from './i18n/routing';
import { loadMessages } from './i18n/messages';
import { loadClerkLocalization } from './i18n/clerk-localization';

const segment = window.location.pathname.split('/')[1];
const locale = isLocale(segment) ? segment : 'ja';

Promise.all([loadMessages(locale), loadClerkLocalization(locale)]).then(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
});
