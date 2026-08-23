export type Role = "user" | "assistant" | "system";

export interface Chat {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  summary: string;
  summary_upto: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: Role;
  content: string;
  created_at: string;
}

export interface Task {
  id: string;
  chat_id: string | null;
  title: string;
  done: boolean;
  created_at: string;
}

// Current, confirmed-live free endpoints on integrate.api.nvidia.com as of Aug 2026.
// NVIDIA periodically deprecates older Nemotron NIMs (e.g. llama-3.1-nemotron-70b-instruct
// was retired) - if a model here ever 404s, check https://build.nvidia.com for the
// replacement id and update this list.
export const NEMOTRON_MODELS = [
  {
    id: "nvidia/nemotron-3.5-lightning-30b-a3b",
    label: "Nemotron 3.5 Lightning 30B",
    blurb: "Fast default - great for everyday coding and chat",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    label: "Nemotron 3 Super 120B",
    blurb: "Balanced size and quality for harder problems",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    label: "Nemotron 3 Ultra 550B",
    blurb: "Largest model, slowest, highest ceiling",
  },
] as const;

// How many of the most recent messages get sent verbatim to the model on
// every turn. Kept fixed so request size (and latency) doesn't grow as a
// chat gets longer.
export const CONTEXT_WINDOW_MESSAGES = 16;

// Once a chat has more than this many total messages, older ones (beyond
// the recent window above) get folded into a running summary in the
// background instead of being resent every time.
export const SUMMARIZE_TRIGGER_MESSAGES = 24;

// Vision-capable Nemotron model - only used when a message includes an
// image, so normal text chat keeps using the fast default model.
export const VISION_MODEL_ID = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

// Extensions whose content gets read and inlined as text context. Anything
// else (pdf, docx, zip, etc.) still uploads and links, but its content
// isn't extracted - the model only sees the filename.
export const TEXT_FILE_EXTENSIONS = [
  "txt", "md", "markdown", "csv", "json", "js", "jsx", "ts", "tsx", "py",
  "java", "c", "cpp", "h", "hpp", "go", "rs", "rb", "php", "html", "htm",
  "css", "scss", "yml", "yaml", "xml", "sql", "sh", "log", "ini", "toml",
];

export const MAX_ATTACHMENTS = 4;
export const MAX_FILE_MB = 15;

export const SPREADSHEET_EXTENSIONS = ["xlsx", "xls"];
export const PDF_EXTENSIONS = ["pdf"];
export const DOCX_EXTENSIONS = ["docx"];
// Cap how much extracted text (spreadsheet, pdf, docx, or plain text file)
// gets injected into the prompt, so one huge file can't blow out the
// context window or slow every reply down.
export const MAX_EXTRACTED_CHARS = 12000;