import { useState } from "react";
import {
  LockKeyhole,
  LogOut,
  Package,
  Palette,
  Save,
  RefreshCw,
} from "lucide-react";
import { useCatalog, useWorld } from "../lib/store";
import { STORE_TYPES } from "../lib/shop";
import CatalogEditor from "./CatalogEditor";
import SketchfabPanel from "./SketchfabPanel";
function StoreSettings() {
  const { settings, updateSettings } = useCatalog();
  const [draft, setDraft] = useState(() => structuredClone(settings));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const notify = useWorld((s) => s.notify);
  const field = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateSettings(draft);
      notify("Store details and theme published");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="product-form store-settings-form" onSubmit={save}>
      <div className="editor-notice">
        <strong>One store, your chosen style</strong>
        <p>
          Changing the store type changes 3D fixtures and collections. It keeps
          your existing products; add or import matching products separately.
          Featured photos represent your products. Other store types retain
          their decorative display props.
        </p>
      </div>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={busy}>
        <label>
          Store type
          <select
            value={draft.type}
            onChange={(e) => field("type", e.target.value)}
            aria-label="Store type"
          >
            {Object.entries(STORE_TYPES).map(([id, t]) => (
              <option key={id} value={id}>
                {t.name} — {t.description}
              </option>
            ))}
          </select>
        </label>
        <label>
          Store name
          <input
            value={draft.name}
            onChange={(e) => field("name", e.target.value)}
            required
            maxLength={80}
          />
        </label>
        <label>
          Tagline
          <input
            value={draft.tagline}
            onChange={(e) => field("tagline", e.target.value)}
            maxLength={120}
          />
        </label>
        <label>
          Store description
          <textarea
            value={draft.description}
            onChange={(e) => field("description", e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </label>
        <div className="form-columns">
          <label>
            Contact email
            <input
              type="email"
              value={draft.email}
              onChange={(e) => field("email", e.target.value)}
            />
          </label>
          <label>
            Contact phone
            <input
              value={draft.phone}
              onChange={(e) => field("phone", e.target.value)}
              maxLength={80}
            />
          </label>
        </div>
        <label>
          Address
          <input
            value={draft.address}
            onChange={(e) => field("address", e.target.value)}
            maxLength={250}
          />
        </label>
        <label>
          Main website
          <input
            value={draft.website}
            onChange={(e) => field("website", e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label>
          Logo image URL
          <input
            value={draft.logo}
            onChange={(e) => field("logo", e.target.value)}
            placeholder="https://… (optional)"
          />
        </label>
        <h3>Color theme</h3>
        <div className="theme-fields">
          {Object.entries({
            primary: "Buttons & accents",
            surface: "Interface surfaces",
            wall: "Store walls",
            floor: "Store floor",
            metal: "Frames & fixtures",
          }).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="color"
                value={draft.theme[key]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    theme: { ...d.theme, [key]: e.target.value },
                  }))
                }
              />
            </label>
          ))}
        </div>
        <button className="primary-button" type="submit">
          <Save size={16} />
          {busy ? "Publishing…" : "Publish store settings"}
        </button>
      </fieldset>
    </form>
  );
}
export default function AdminPanel() {
  const { admin, login, logout, refresh, backend } = useCatalog();
  const [tab, setTab] = useState("products"),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      setPassword("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!admin)
    return (
      <div className="admin-login">
        <LockKeyhole size={30} />
        <h3>Store administrator</h3>
        <p>Sign in to manage products, store layout, colors and details.</p>
        {backend !== "configured" && (
          <div className="editor-notice">
            Admin access needs the Cloudflare database and password secret
            configured. Customers can continue browsing.
          </div>
        )}
        {error && (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={submit} className="product-form">
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={512}
            />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            <LockKeyhole size={16} />
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <div className="view-tabs">
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => setTab("products")}
          >
            <Package size={16} />
            Products
          </button>
          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            <Palette size={16} />
            Store & theme
          </button>
          <button
            className={tab === "models" ? "active" : ""}
            onClick={() => setTab("models")}
          >
            3D models
          </button>
        </div>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await refresh();
              setError("");
              setTab("products");
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={15} />
          Reload
        </button>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await logout();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
      {error && (
        <p role="alert" className="editor-error">
          {error}
        </p>
      )}
      {tab === "products" ? (
        <CatalogEditor />
      ) : tab === "models" ? (
        <SketchfabPanel />
      ) : (
        <StoreSettings key={useCatalog.getState().revision} />
      )}
    </div>
  );
}
