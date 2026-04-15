import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Show, Suspense } from "solid-js";
import { Header } from "~/components/Header";
import { Footer } from "~/components/Footer";
import "~/styles/app.css";

function Layout(props: { children: any }) {
  const location = useLocation();
  const isHome = () => location.pathname === "/";

  return (
    <>
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-500 focus:text-white focus:rounded-full focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      <div
        id="main-content"
        class="min-h-screen flex flex-col"
        classList={{ "bg-brand-bg": !isHome() }}
      >
        <Header />

        <Suspense
          fallback={
            <div class="flex items-center justify-center min-h-screen bg-neutral-950">
              <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <div classList={{ "flex-1": !isHome() }}>
            {props.children}
          </div>
        </Suspense>

        <Show when={!isHome()}>
          <Footer />
        </Show>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router root={(props) => <Layout>{props.children}</Layout>}>
      <FileRoutes />
    </Router>
  );
}
