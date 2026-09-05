import type { MerchandiseProduct } from "@/types/merchandise-media";

function normalizeColour(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function getMerchandiseImagePath(
  product: MerchandiseProduct,
  selectedColour?: string | null,
) {
  const images = product.images?.filter((image) => image.is_active !== false) ?? [];
  const colour = normalizeColour(selectedColour);

  if (colour) {
    const colourImage = images.find(
      (image) => normalizeColour(image.colour) === colour && image.image_path,
    );

    if (colourImage?.image_path) {
      return colourImage.image_path;
    }
  }

  return product.image_path || images.find((image) => image.image_path)?.image_path || null;
}
