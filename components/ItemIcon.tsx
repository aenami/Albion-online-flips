import Image from "next/image";

export function ItemIcon({
  itemId,
  quality,
  size = 48,
  className,
}: {
  itemId: string;
  quality: number;
  size?: number;
  className?: string;
}) {
  const src = `https://render.albiononline.com/v1/item/${itemId}.png?quality=${quality}&size=${size * 2}`;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
    />
  );
}
