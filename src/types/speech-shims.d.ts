/**
 * Minimal SpeechRecognition / webkitSpeechRecognition types for browsers that use it.
 * This is a lightweight shim; replace with stronger types or lib.dom.d.ts once supported.
 */
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
  interface SpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((this: SpeechRecognition, ev: any) => any) | null;
    onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  }
}
export {};

