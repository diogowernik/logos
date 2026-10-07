import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

if (typeof window !== "undefined") Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn((query: string) => ({
  matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
})) });

afterEach(cleanup);
