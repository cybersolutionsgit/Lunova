import { useEffect, useState } from "react";
export default function ProductArt({ product, small = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.image]);
  return (
    <div
      className={`product-art boutique-art ${small ? "small" : ""}`}
      style={{ "--product": product.color }}
    >
      <img
        src={failed ? `/products/${product.category}.svg` : product.image}
        alt={`${product.name}${failed ? " — illustration; photo unavailable" : ""}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      {failed && (
        <span className="image-fallback-label">
          Photo unavailable · illustration
        </span>
      )}
    </div>
  );
}
