import type { ImgHTMLAttributes } from "react";

export function PrivateImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  // Private file URLs need the browser's session cookie, without an image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ""} />;
}
