"use client";
import Link from "next/link";
import { PrivateImage } from "@/components/PrivateImage";
import {
  LibraryItemLink,
  LibraryItemCover,
  LibraryItemTitle,
  LibraryCollectionCover,
} from "@/theme/library";

export function LibraryItem({
  href,
  title,
  coverUrl,
  collection = false,
}: {
  href: string;
  title: string;
  coverUrl?: string | null;
  collection?: boolean;
}) {
  const cover = <LibraryItemCover aria-hidden="true">
    {coverUrl ? <PrivateImage src={coverUrl} alt="" /> : "¶"}
  </LibraryItemCover>;
  return (
    <LibraryItemLink component={Link} href={href} disableRipple>
      {collection ? <LibraryCollectionCover aria-hidden="true">{cover}</LibraryCollectionCover> : cover}
      <LibraryItemTitle className="library-item-title">
        {title || "Sem título"}
      </LibraryItemTitle>
    </LibraryItemLink>
  );
}
