"use client";
import Link from "next/link";
import { PrivateImage } from "@/components/PrivateImage";
import {
  LibraryItemLink,
  LibraryItemCover,
  LibraryItemTitle,
} from "@/theme/library";

export function LibraryItem({
  href,
  title,
  coverUrl,
}: {
  href: string;
  title: string;
  coverUrl?: string | null;
}) {
  return (
    <LibraryItemLink component={Link} href={href} disableRipple>
      <LibraryItemCover aria-hidden="true">
        {coverUrl ? <PrivateImage src={coverUrl} alt="" /> : "¶"}
      </LibraryItemCover>
      <LibraryItemTitle className="library-item-title">
        {title || "Sem título"}
      </LibraryItemTitle>
    </LibraryItemLink>
  );
}
