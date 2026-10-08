import {
  render as testingRender,
  type RenderOptions,
} from "@testing-library/react";
import type { ReactNode, ReactElement } from "react";
import { AppProviders } from "@/components/AppProviders";
function Providers({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
export function render(ui: ReactElement, options?: RenderOptions) {
  return testingRender(ui, { wrapper: Providers, ...options });
}
