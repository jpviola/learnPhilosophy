import { onMount, createSignal, createEffect } from "solid-js";
import { isServer } from "solid-js/web";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import mermaid from "mermaid";

interface Props {
  content: string;
}

interface CodeToken {
  type: string;
  raw: string;
  text: string;
  lang?: string;
}

export default function MarkdownContent(props: Props) {
  const [html, setHtml] = createSignal("");
  let containerRef: HTMLDivElement | undefined;

  // Configurar marked para que los bloques de código mermaid tengan una clase especial
  marked.use({
    renderer: {
      code({ text, lang }: { text: string; lang?: string }) {
        if (lang === "mermaid") {
          return `<pre class="mermaid">${DOMPurify.sanitize(text)}</pre>`;
        }
        return `<pre><code class="language-${lang || ""}">${DOMPurify.sanitize(text)}</code></pre>`;
      },
    },
  });

  createEffect(() => {
    const rawHtml = marked(props.content);
    const cleanHtml = DOMPurify.sanitize(rawHtml as string);
    setHtml(cleanHtml);
  });

  onMount(() => {
    if (!isServer) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
      });
      renderGraphs();
    }
  });

  // Re-renderizar grafos cada vez que el HTML cambie
  createEffect(() => {
    if (html() && !isServer) {
      // Pequeño delay para asegurar que el DOM se ha actualizado
      setTimeout(renderGraphs, 0);
    }
  });

  const renderGraphs = async () => {
    if (containerRef) {
      await mermaid.run({
        nodes: containerRef.querySelectorAll(".mermaid"),
      });
    }
  };

  return (
    <div 
      ref={containerRef} 
      class="prose prose-slate max-w-none" 
      innerHTML={html()} 
    />
  );
}