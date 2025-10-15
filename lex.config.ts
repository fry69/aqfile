// file: lex.config.ts
import { defineLexiconConfig } from "@atcute/lex-cli";

export default defineLexiconConfig({
  files: ["lexicons/**/*.json"],
  outdir: "lexicons/",
});
