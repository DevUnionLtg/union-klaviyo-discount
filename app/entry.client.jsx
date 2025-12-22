import { hydrateRoot } from "react-dom/client";
import { ClientRouter } from "react-router";

// The manifest is injected by @react-router/dev/vite plugin at build time
// @ts-expect-error - manifest is injected globally by the vite plugin
const manifest = window.__reactRouterManifest__;

hydrateRoot(
  document,
  <ClientRouter manifest={manifest} />
);

