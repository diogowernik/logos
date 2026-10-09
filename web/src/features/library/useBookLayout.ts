"use client";
import { useEffect, useState } from "react";
const defaults = { info: false, texts: true, epubs: true, markdown: true, files: false };
export type BookArea = keyof typeof defaults;
export function useBookLayout(projectId: number) {
  const [areas, setAreas] = useState(defaults);
  const key = `logos.book.${projectId}.layout`;
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        if (active) setAreas(Object.fromEntries(Object.entries(defaults).map(([name, value]) => [name, typeof saved?.[name] === "boolean" ? saved[name] : value])) as typeof defaults);
      } catch { /* Local preferences never block the book. */ }
    });
    return () => { active = false; };
  }, [key]);
  function toggle(name: BookArea) {
    setAreas(previous => {
      const next = {...previous, [name]: !previous[name]};
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Private/storage-disabled browsers still work. */ }
      return next;
    });
  }
  return {areas, toggle};
}
