// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";
import { resolveLocale } from "~/i18n/locale";

function requestLocale(): string {
  const cookie = getRequestEvent()?.request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)lp_locale=([^;]+)/);
  return resolveLocale(match ? decodeURIComponent(match[1]) : undefined);
}

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang={requestLocale()}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#F4EEE8" />
          <meta
            name="description"
            content="Explore philosophy topics, discover connections, and build curated learning paths — from ancient Stoics to modern existentialists."
          />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <title>LearnPhilosophy</title>
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
