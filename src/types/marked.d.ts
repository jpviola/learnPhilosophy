declare module "marked" {
  interface MarkedOptions {
    gfm?: boolean;
    breaks?: boolean;
    [key: string]: unknown;
  }
  interface Marked {
    (src: string, options?: MarkedOptions): string;
    parse(src: string, options?: MarkedOptions): string;
    use(options: MarkedOptions): void;
    setOptions(options: MarkedOptions): void;
  }
  export const marked: Marked;
  export function parse(src: string, options?: MarkedOptions): string;
}

declare module "isomorphic-dompurify" {
  import DOMPurify from "dompurify";
  export default DOMPurify;
}
