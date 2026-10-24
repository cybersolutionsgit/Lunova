import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ImagePlus,
} from "lucide-react";
import { useCatalog, useWorld } from "../lib/store";
import {
  defaultCatalog,
  sampleCatalog,
  money,
  currencyScale,
} from "../lib/products";
import {
  fetchPublicCatalog,
  fromWooCommerce,
  validateCatalog,
} from "../lib/catalog";
import { getCollections } from "../lib/shop";
import ProductArt from "./ProductArt";
const blank = () => ({
  id: crypto.randomUUID(),
  name: "",
  category: "sets",
  price: 0,
  unit: "",
  description: "",
  color: "#8b5263",
  image: "/products/sets.svg",
  stock: 10,
  display: null,
  presentation: "photo",
  tag: "YOUR COLLECTION",
  sourceUrl: "",
});
async function compressImage(file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10000000
  )
    throw new Error("Choose a JPG, PNG or WebP photo smaller than 10 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bitmap.width * scale));
  c.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f5eeeb";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return c.toDataURL("image/jpeg", 0.8);
}
export default function CatalogEditor() {
  const catalog = useCatalog();
  const categories = getCollections(catalog.settings.type, catalog.products);
  const notify = useWorld((s) => s.notify);
  const [draft, setDraft] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(null),
    [pending, setPending] = useState(null),
    [currency, setCurrency] = useState(catalog.currency);
  const fileRef = useRef();
  const controller = useRef();
  useEffect(() => () => controller.current?.abort(), []);
  const report = (e) =>
    setError(e.message || "Could not complete that change.");
  async function replace(next) {
    setBusy(true);
    try {
      await catalog.replace(next);
      setCurrency(next.currency);
      setError("");
      setPending(null);
      setConfirm(null);
      notify("Store catalog published for all customers");
      return true;
    } catch (e) {
      report(e);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function importWebsite() {
    setBusy(true);
    setError("");
    controller.current?.abort();
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current.abort(), 30000);
    try {
      const data = await fetchPublicCatalog({
        signal: controller.current.signal,
      });
      setPending(data);
    } catch (e) {
      setError(
        e.name === "AbortError"
          ? "The website import timed out. Try again or use Import file."
          : "Could not read your public website catalog. Your host may block cross-site requests. Open the public product link below, save its JSON, then use Import file. " +
              e.message,
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  async function importFile(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 6000000)
        throw new Error("Choose a JSON file smaller than 6 MB.");
      const data = JSON.parse(await f.text());
      setPending(
        Array.isArray(data) ? fromWooCommerce(data) : validateCatalog(data),
      );
      setError("");
    } catch (e) {
      report(e);
    }
  }
  function exportFile() {
    const { version, currency, source, products } = catalog;
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ version, currency, source, products }, null, 2)],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "lunova-catalog.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Catalog exported. Keep this file as your backup.");
  }
  async function save(e) {
    e.preventDefault();
    const next = {
      ...catalog,
      source: catalog.source === "sample" ? "custom" : catalog.source,
      products: catalog.products.some((p) => p.id === draft.id)
        ? catalog.products.map((p) => (p.id === draft.id ? draft : p))
        : [...catalog.products, draft],
    };
    if (await replace(next)) setDraft(null);
  }
  function field(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  return (
    <fieldset disabled={busy} className="editor-content" aria-busy={busy}>
      <div className="editor-notice">
        <strong>Store CMS · changes publish to all customers</strong>
        <p>
          Product saves update your shared storefront. WordPress is a separate
          source: imports read from it but do not write back. Checkout and real
          orders remain disabled.
        </p>
      </div>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      {draft ? (
        <form onSubmit={save} className="product-form">
          <button
            type="button"
            className="editor-back"
            onClick={() => {
              setDraft(null);
              setError("");
            }}
          >
            <ArrowLeft size={15} />
            Back to products
          </button>
          <div className="editor-form-grid">
            <ProductArt product={draft} />
            <div>
              <label>
                Featured image URL
                <input
                  value={draft.image}
                  onChange={(e) => field("image", e.target.value)}
                  placeholder="https://…"
                  required
                  maxLength={900000}
                />
              </label>
              <label className="upload-photo">
                <ImagePlus size={16} />
                Upload product photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    e.target.value = "";
                    if (!file) return;
                    setBusy(true);
                    try {
                      field("image", await compressImage(file));
                      setError("");
                    } catch (e) {
                      report(e);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              <p className="field-hint">
                Use a featured image or a photo of a mannequin wearing your
                product. JPG, PNG, WebP. Photos are resized before saving.
              </p>
            </div>
          </div>
          <label>
            Product name
            <input
              value={draft.name}
              required
              maxLength={120}
              onChange={(e) => field("name", e.target.value)}
            />
          </label>
          <div className="form-columns">
            <label>
              Collection
              <select
                aria-label="Collection"
                value={draft.category}
                onChange={(e) => field("category", e.target.value)}
              >
                {categories
                  .filter((c) => c.id !== "all")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Price ({catalog.currency})
              <input
                type="number"
                min="0"
                max="10000000"
                step={1 / currencyScale(catalog.currency)}
                required
                value={draft.price}
                onChange={(e) =>
                  field(
                    "price",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </label>
          </div>
          <label>
            Sizes / short note
            <input
              value={draft.unit}
              maxLength={100}
              placeholder="e.g. XS–XL · available in black and rose"
              onChange={(e) => field("unit", e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              maxLength={2000}
              value={draft.description}
              onChange={(e) => field("description", e.target.value)}
            />
          </label>
          <div className="form-columns">
            <label>
              Display position
              <select
                aria-label="Display position"
                value={draft.display ?? ""}
                onChange={(e) =>
                  field(
                    "display",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              >
                <option value="">Catalog only</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const occupied = catalog.products.find(
                    (p) => p.display === i && p.id !== draft.id,
                  );
                  return (
                    <option key={i} value={i} disabled={!!occupied}>
                      Display {i + 1}
                      {i === 0 ? " · entrance feature" : ""}
                      {occupied ? ` · ${occupied.name}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
          <p className="field-hint">
            Fixtures and decorative props follow the store type selected in
            Store & theme. The featured photo represents the actual product;
            decorative models are not exact product replicas.
          </p>
          <div className="form-columns">
            <label>
              Garment color
              <input
                type="color"
                value={draft.color}
                onChange={(e) => field("color", e.target.value)}
              />
            </label>
            <label>
              Demo bag quantity limit
              <input
                type="number"
                min="0"
                max="9999"
                step="1"
                required
                value={draft.stock}
                onChange={(e) =>
                  field(
                    "stock",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={busy}>
            <Save size={16} />
            Publish product
          </button>
        </form>
      ) : (
        <>
          <div className="editor-actions">
            <button
              className="primary-button"
              onClick={() => {
                setDraft({ ...blank(), category: categories[1].id });
                setError("");
              }}
            >
              <Plus size={16} />
              Add a product
            </button>
            <button
              className="secondary-button"
              onClick={importWebsite}
              disabled={busy}
            >
              <RefreshCw size={15} />
              {busy ? "Reading website…" : "Import from my website"}
            </button>
            <button
              className="secondary-button"
              onClick={() => fileRef.current.click()}
              disabled={busy}
            >
              <Upload size={15} />
              Import file
            </button>
            <button className="secondary-button" onClick={exportFile}>
              <Download size={15} />
              Export catalog
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importFile}
          />
          <a
            className="public-api-link"
            href="https://lunovasecrets.com/wp-json/wc/store/v1/products?per_page=100"
            target="_blank"
            rel="noreferrer"
          >
            Open public website product data
            <ExternalLink size={13} />
          </a>
          <p className="field-hint">
            Import reads publicly listed WooCommerce products, images, prices
            and currency. It never writes to WordPress. Quantity limits are for
            this demo, not live inventory. Up to 12 products can be displayed in
            3D; all imported products appear in Product view.
          </p>
          {pending && (
            <div className="import-preview">
              <h3>Review import · {pending.products.length} products</h3>
              <p>
                Currency: {pending.currency}. This will replace the shared store
                catalog for all customers. Export first if you want to keep your
                edits.
              </p>
              <ul>
                {pending.products.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    {p.name} · {money(p.price, pending.currency)}
                  </li>
                ))}
              </ul>
              <button
                className="primary-button"
                onClick={() => replace(pending)}
              >
                Publish imported catalog
              </button>
              <button className="editor-back" onClick={() => setPending(null)}>
                Cancel import
              </button>
            </div>
          )}
          <div className="editor-currency">
            <label>
              Catalog currency
              <input
                maxLength={3}
                aria-label="Catalog currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </label>
            <button
              className="secondary-button"
              onClick={() => replace({ ...catalog, currency })}
            >
              Save currency
            </button>
            <p>Changes the currency label only; does not convert prices.</p>
          </div>
          <div className="editor-product-list">
            {catalog.products.map((p) => (
              <div className="editor-product-row" key={p.id}>
                <ProductArt product={p} small />
                <button
                  className="edit-product"
                  onClick={() => {
                    setDraft({ ...p });
                    setError("");
                  }}
                >
                  <strong>{p.name}</strong>
                  <span>
                    {money(p.price, catalog.currency)} ·{" "}
                    {p.display === null
                      ? "Catalog only"
                      : `Display ${p.display + 1}`}{" "}
                    · Edit
                  </span>
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => setConfirm(p.id)}
                >
                  <Trash2 size={16} />
                </button>
                {confirm === p.id && (
                  <div className="delete-confirm">
                    <span>
                      Remove this product from the storefront and demo bag?
                    </span>
                    <button
                      onClick={() =>
                        replace({
                          ...catalog,
                          products: catalog.products.filter(
                            (item) => item.id !== p.id,
                          ),
                        })
                      }
                    >
                      Remove product
                    </button>
                    <button onClick={() => setConfirm(null)}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <details className="reset-catalog">
            <summary>Restore bundled website catalog</summary>
            <p>
              This replaces your published edits with the collection bundled in
              this version. Export your changes first.
            </p>
            <button
              className="secondary-button"
              onClick={() => replace(defaultCatalog)}
            >
              Publish bundled catalog
            </button>
          </details>
          <details className="reset-catalog">
            <summary>Replace with sample catalog</summary>
            <p>
              Export your edits first. This replaces the shared catalog with
              sample products.
            </p>
            <button
              className="secondary-button"
              onClick={() => replace(sampleCatalog)}
            >
              Publish samples
            </button>
          </details>
        </>
      )}
    </fieldset>
  );
}
