export const AI_MODULE_COLORS = {
  Consultation: '#1D9E75',
  STT: '#378ADD',
  Summarization: '#D85A30',
  Prescription: '#7F77DD',
  WhatsApp: '#639922',
  Email: '#D4537E',
  SMS: '#888780',
} as const;

export type AiModuleName = keyof typeof AI_MODULE_COLORS;

export function getAiModuleColor(moduleName: string): string {
  if (moduleName in AI_MODULE_COLORS) {
    return AI_MODULE_COLORS[moduleName as AiModuleName];
  }
  return '#A0AEC0'; // Default gray for unknown modules
}
