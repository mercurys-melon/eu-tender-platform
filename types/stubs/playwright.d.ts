declare module "@playwright/test" {
  // Minimal stub så TS ikke fejler – vi behøver kun typer, ikke runtime.
  export interface Page {}        // brugt i adapters
  export interface Browser {}     // hvis noget andet refererer det
  export interface BrowserContext {}
  export type Locator = any;
  export type AriaRole = string;
}
