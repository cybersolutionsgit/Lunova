import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  Search,
  Leaf,
  Grid2X2,
  Heart,
  Sparkles,
  Layers,
  Moon,
  Shirt,
  ShieldCheck,
  Package,
  SlidersHorizontal,
  Maximize,
  Minimize,
  MousePointer2,
  Keyboard,
  Plus,
  Minus,
  X,
  Check,
  Compass,
  PanelLeftOpen,
  Map,
  VolumeX,
  Info,
  RotateCcw,
} from "lucide-react";
import {
  money as formatMoney,
  productById,
  currencyScale,
} from "./lib/products";
import { useCart, useWorld, useCatalog } from "./lib/store";
import { cartTotals, sanitizeCart } from "./lib/cart";
import { aisleSpawns, displays } from "./lib/world";
import TouchJoystick from "./components/TouchJoystick";
import Modal from "./components/Modal";
import ProductArt from "./components/ProductArt";
import { getCollections, STORE_TYPES, contrastColor } from "./lib/shop";
const AdminPanel = lazy(() => import("./components/AdminPanel"));
const StoreScene = lazy(() => import("./components/StoreScene"));
const icons = {
  grid: Grid2X2,
  heart: Heart,
  sparkles: Sparkles,
  layers: Layers,
  moon: Moon,
  shirt: Shirt,
  package: Package,
};
export default function App() {
  const {
    category,
    setCategory,
    selected,
    select: selectProduct,
    modal,
    setModal: openModal,
    quality,
    setQuality,
    goTo,
    locked,
    notice,
    notify,
  } = useWorld();
  const { products, currency, settings, initialize } = useCatalog();
  const categories = getCollections(settings.type, products);
  useEffect(() => {
    initialize();
  }, [initialize]);
  const money = (value) => formatMoney(value, currency);
  const savedItems = useCart((s) => s.items),
    add = useCart((s) => s.add),
    change = useCart((s) => s.change);
  const items = sanitizeCart(savedItems, products);
  const { count, subtotal } = cartTotals(items, products, currency);
  const [query, setQuery] = useState(""),
    [view, setView] = useState("explore"),
    [fullscreen, setFullscreen] = useState(false),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [toolsOpen, setToolsOpen] = useState(false),
    [mapOpen, setMapOpen] = useState(false);
  const setModal = useCallback(
    (value) => {
      setSidebarOpen(false);
      setToolsOpen(false);
      openModal(value);
    },
    [openModal],
  );
  const select = useCallback(
    (product) => {
      if (product) {
        setView("explore");
        setSidebarOpen(false);
      }
      selectProduct(product);
    },
    [selectProduct],
  );
  const showCatalog = () => {
    setSidebarOpen(false);
    setToolsOpen(false);
    setView("browse");
  };
  const worldRef = useRef();
  const markerRef = useRef();
  const updatePosition = useCallback((x, z, yaw, pitch) => {
    const canvas = worldRef.current?.querySelector("canvas");
    if (canvas) {
      canvas.dataset.lookYaw = String(yaw);
      canvas.dataset.lookPitch = String(pitch);
    }
    if (markerRef.current) {
      markerRef.current.setAttribute(
        "transform",
        `translate(${x * 2},${(z - 9) * 2})`,
      );
      markerRef.current.dataset.x = x.toFixed(2);
      markerRef.current.dataset.z = z.toFixed(2);
    }
  }, []);
  const close = useCallback(() => {
    select(null);
    setModal(null);
  }, [select, setModal]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => notify(""), 2600);
    return () => clearTimeout(t);
  }, [notice, notify]);
  useEffect(() => {
    const f = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const filtered = products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  function addItem(p) {
    if ((items[p.id] || 0) >= p.stock) {
      notify("Demo quantity limit reached");
      return;
    }
    add(p.id);
    notify(`${p.name} added to your bag`);
  }
  function visit(id) {
    setCategory(id);
    goTo(aisleSpawns[id] || aisleSpawns.all);
    setView("explore");
    setSidebarOpen(false);
  }
  async function immersive() {
    const canvas = worldRef.current?.querySelector("canvas");
    if (!canvas) return;
    try {
      await canvas.requestPointerLock?.();
    } catch {
      notify(
        "Mouse capture is unavailable. You can browse products using Product view, or drag to look on touch screens.",
      );
    }
  }
  async function expand() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await worldRef.current?.requestFullscreen();
    } catch {
      notify("Full screen is unavailable in this browser.");
    }
  }
  useEffect(() => {
    if (!sidebarOpen && !toolsOpen) return;
    document.exitPointerLock?.();
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
        setToolsOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen, toolsOpen]);
  return (
    <main
      className={`store-shell ${sidebarOpen ? "sidebar-is-open" : ""}`}
      style={{
        "--shop-primary": settings.theme.primary,
        "--shop-surface": settings.theme.surface,
        "--shop-on-primary": contrastColor(settings.theme.primary),
        "--shop-on-surface": contrastColor(settings.theme.surface),
      }}
    >
      <section
        ref={worldRef}
        className="world-container immersive-world"
        aria-label="Virtual boutique"
      >
        <Suspense
          fallback={
            <div className="scene-loading">
              <Leaf />
              Opening your boutique…
            </div>
          }
        >
          <StoreScene
            enabled={view === "explore" && !sidebarOpen && !toolsOpen}
            onPosition={updatePosition}
          />
        </Suspense>
        <div className="crosshair" aria-hidden="true" />
        <div className="minimap" aria-hidden="true" hidden={!mapOpen}>
          <span>{STORE_TYPES[settings.type].name.toUpperCase()}</span>
          <svg viewBox="0 0 60 64" className="boutique-map">
            {displays.map((d, i) => (
              <rect
                key={i}
                x={d.position[0] * 2 + 28}
                y={d.position[1] * 2 + 27}
                width="4"
                height="4"
                rx="1"
                fill="#d4b4bc"
              />
            ))}
            <g ref={markerRef} data-testid="player-marker">
              <circle
                cx="30"
                cy="47"
                r="2.5"
                fill="#9e647e"
                stroke="#fff7f2"
                strokeWidth="1"
              />
            </g>
          </svg>
          <small>ENTRANCE</small>
        </div>
        {!locked &&
          !sidebarOpen &&
          !toolsOpen &&
          !selected &&
          !modal &&
          view === "explore" && (
            <button className="resume-look" onClick={immersive}>
              Click to look around
            </button>
          )}
        <TouchJoystick
          active={
            !sidebarOpen &&
            !toolsOpen &&
            !selected &&
            !modal &&
            view === "explore"
          }
        />
        <button
          className="hud-tools-toggle"
          aria-label="Store controls"
          aria-expanded={toolsOpen}
          aria-controls="store-controls"
          onClick={() => {
            setSidebarOpen(false);
            setToolsOpen((v) => !v);
          }}
        >
          <SlidersHorizontal size={20} />
        </button>
        {toolsOpen && (
          <div
            className="compact-store-tools"
            id="store-controls"
            role="group"
            aria-label="Store controls panel"
          >
            <button
              onClick={() => {
                goTo(aisleSpawns.all);
                setCategory("all");
                setToolsOpen(false);
              }}
              aria-label="Return to entrance"
            >
              <RotateCcw size={17} />
              <span>Entrance</span>
            </button>
            <button
              onClick={async () => {
                await expand();
                setToolsOpen(false);
              }}
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            >
              {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
              <span>{fullscreen ? "Exit full screen" : "Full screen"}</span>
            </button>
            <button
              onClick={() => setModal("settings")}
              aria-label="Graphics settings"
            >
              <SlidersHorizontal size={17} />
              <span>Graphics</span>
            </button>
            <button
              onClick={() => setModal("help")}
              aria-label="How to explore"
            >
              <Info size={17} />
              <span>How to explore</span>
            </button>
            <button
              onClick={() => {
                setMapOpen((v) => !v);
                setToolsOpen(false);
              }}
              aria-pressed={mapOpen}
            >
              <Map size={17} />
              <span>{mapOpen ? "Hide map" : "Show map"}</span>
            </button>
            <button
              onClick={() => {
                setToolsOpen(false);
                immersive();
              }}
            >
              <MousePointer2 size={17} />
              <span>{locked ? "Esc to release mouse" : "Capture mouse"}</span>
            </button>
          </div>
        )}
        <header className="store-header">
          <div className="store-brand">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={`${settings.name} logo`}
                className="store-logo"
              />
            ) : (
              <Leaf size={25} />
            )}
            <div>
              <span>{settings.name.toUpperCase()}</span>
              <h1 className="sr-only">{settings.tagline}</h1>
            </div>
          </div>
          <div className="store-header-actions">
            <button
              className="catalog-shortcut"
              aria-label="Product view"
              onClick={showCatalog}
            >
              <Grid2X2 size={19} />
            </button>
            <button
              className="bag-button"
              aria-label={`My bag (${count} items)`}
              onClick={() => setModal("cart")}
            >
              <ShoppingBag size={18} />
              <span>My bag</span>
              <b>{count}</b>
            </button>
          </div>
        </header>
        <button
          className="sidebar-toggle"
          aria-label={
            sidebarOpen ? "Close store sidebar" : "Open store sidebar"
          }
          aria-expanded={sidebarOpen}
          aria-controls="store-sidebar"
          onClick={() => {
            setToolsOpen(false);
            setSidebarOpen((v) => !v);
          }}
        >
          {sidebarOpen ? <X size={20} /> : <PanelLeftOpen size={20} />}
          <span>{sidebarOpen ? "Close" : "Collections"}</span>
        </button>
        {sidebarOpen && (
          <>
            <button
              className="sidebar-scrim"
              aria-label="Dismiss store sidebar"
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              id="store-sidebar"
              className="sidebar in-world-sidebar"
              aria-label="Boutique sidebar"
            >
              <a
                href="#"
                className="brand"
                aria-label="Lunova home"
                onClick={(e) => {
                  e.preventDefault();
                  visit("all");
                }}
              >
                <span className="brand-icon">
                  <Leaf size={23} />
                </span>
                {settings.name}
              </a>
              <div className="store-label">
                <span className="live-dot" />{" "}
                {STORE_TYPES[settings.type].name.toUpperCase()}
              </div>
              <div className="sidebar-heading">YOUR STORE, REIMAGINED</div>
              <button
                className={`nav-main ${view === "explore" ? "active" : ""}`}
                onClick={() => {
                  setView("explore");
                  setSidebarOpen(false);
                }}
              >
                <Compass size={19} />
                Explore the store
                <ArrowUpRight size={16} />
              </button>
              <button
                className={`nav-main ${view === "browse" ? "active" : ""}`}
                onClick={showCatalog}
              >
                <Grid2X2 size={18} />
                Browse products
                <span className="nav-count">{products.length}</span>
              </button>
              <div className="sidebar-heading aisles-heading">
                SHOP BY COLLECTION{" "}
                <span>{String(categories.length).padStart(2, "0")}</span>
              </div>
              <nav aria-label="Product collections">
                {categories.map((c) => {
                  const Icon = icons[c.icon];
                  return (
                    <button
                      key={c.id}
                      className={`category ${category === c.id ? "selected" : ""}`}
                      onClick={() =>
                        view === "browse" ? setCategory(c.id) : visit(c.id)
                      }
                    >
                      <Icon size={18} />
                      <span>{c.name}</span>
                      {category === c.id && <span className="category-dot" />}
                    </button>
                  );
                })}
              </nav>
              <button
                className="nav-main admin-nav"
                onClick={() => setModal("admin")}
              >
                <ShieldCheck size={18} />
                Admin
              </button>
              <div className="sidebar-bottom">
                <div className="little-card">
                  <span className="leaf-circle">
                    <Leaf size={21} />
                  </span>
                  <h3>
                    Made for your
                    <br />
                    kind of beautiful.
                  </h3>
                  <p>
                    Lingerie. Lounge. Layers.
                    <br />A whole new experience.
                  </p>
                  <span className="card-drawing">✧</span>
                </div>
                <button
                  className="help-button"
                  onClick={() => setModal("help")}
                >
                  <Info size={17} />
                  First time here?
                  <ArrowUpRight size={15} />
                </button>
                <div className="sidebar-footer">
                  Your collection. Your boutique.
                </div>
              </div>
            </aside>
          </>
        )}
        <div id="store-overlay-root" />
        {view === "browse" && !selected && !modal && (
          <Modal
            title="Your collection"
            wide
            onClose={() => setView("explore")}
          >
            <div className="catalog">
              <div className="catalog-head">
                <h2>{categories.find((c) => c.id === category)?.name}</h2>
                <label className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search products"
                    placeholder="Find something lovely…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="product-grid">
                {filtered.map((p) => (
                  <article key={p.id} className="product-card">
                    <button
                      className="product-inspect"
                      onClick={() => select(p)}
                      aria-label={`View ${p.name}`}
                    >
                      <ProductArt product={p} />
                      <span className="product-tag">{p.tag}</span>
                      <h3>{p.name}</h3>
                      <span className="product-unit">{p.unit}</span>
                    </button>
                    <div className="product-card-bottom">
                      <b>{money(p.price)}</b>
                      <button
                        className="add-round"
                        onClick={() => addItem(p)}
                        aria-label={`Add ${p.name} to bag`}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <p className="empty-search">
                  No products found. Try another search.
                </p>
              )}
            </div>
          </Modal>
        )}
        {selected && (
          <Modal title="A closer look" onClose={close}>
            <div className="product-detail">
              <ProductArt product={selected} />
              <span className="detail-tag">{selected.tag}</span>
              <h2>{selected.name}</h2>
              <p className="detail-unit">{selected.unit} · Demo bag only</p>
              <p>{selected.description}</p>
              {selected.sourceUrl && (
                <a
                  className="source-product-link"
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View original product on Lunova Secrets
                  <ArrowUpRight size={14} />
                </a>
              )}
              <div className="detail-price">
                <strong>{money(selected.price)}</strong>
                <span>{selected.stock} demo bag limit</span>
              </div>
              <button
                className="primary-button"
                onClick={() => addItem(selected)}
                disabled={(items[selected.id] || 0) >= selected.stock}
              >
                <ShoppingBag size={18} />
                {(items[selected.id] || 0) >= selected.stock
                  ? "Demo quantity limit reached"
                  : "Add to my bag"}
                <Plus size={18} />
              </button>
            </div>
          </Modal>
        )}
        {modal === "admin" && (
          <Modal title="Store administration" onClose={close} wide>
            <Suspense
              fallback={
                <div className="scene-loading">Loading administration…</div>
              }
            >
              <AdminPanel />
            </Suspense>
          </Modal>
        )}
        {modal === "cart" && (
          <Modal title={`My bag · ${count} items`} onClose={close}>
            <div className="cart-content">
              {count === 0 ? (
                <div className="empty-cart">
                  <ShoppingBag size={42} />
                  <h3>A little room for good things.</h3>
                  <p>Explore the aisles and add a few favorites.</p>
                  <button className="primary-button" onClick={close}>
                    Keep exploring
                    <ArrowRight size={17} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {Object.entries(items).map(([id, q]) => {
                      const p = productById(id, products);
                      return (
                        <div className="cart-item" key={id}>
                          <ProductArt product={p} small />
                          <div>
                            <h3>{p.name}</h3>
                            <p>
                              {p.unit} · {money(p.price)}
                            </p>
                            <div className="quantity">
                              <button
                                aria-label={`Decrease ${p.name}`}
                                onClick={() => change(id, q - 1)}
                              >
                                <Minus size={13} />
                              </button>
                              <span>{q}</span>
                              <button
                                disabled={q >= p.stock}
                                aria-label={`Increase ${p.name}`}
                                onClick={() => change(id, q + 1)}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                          <div className="cart-item-price">
                            <b>{money(p.price * q)}</b>
                            <button
                              aria-label={`Remove ${p.name}`}
                              onClick={() => change(id, 0)}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cart-total">
                    <span>Demo subtotal</span>
                    <b>{money(subtotal / currencyScale(currency))}</b>
                  </div>
                  <div className="demo-note">
                    <Info size={18} />
                    <p>
                      This is your demo shopping bag. Checkout is not enabled
                      and no orders will be placed.
                    </p>
                  </div>
                  <button className="primary-button" onClick={close}>
                    Continue exploring
                    <ArrowRight size={17} />
                  </button>
                </>
              )}
            </div>
          </Modal>
        )}
        {modal === "settings" && (
          <Modal title="Make yourself comfortable" onClose={close}>
            <div className="settings-content">
              <h3>Graphics quality</h3>
              <p>Choose a lighter experience for older phones and laptops.</p>
              <div className="quality-options">
                {["low", "high"].map((q) => (
                  <button
                    key={q}
                    className={quality === q ? "chosen" : ""}
                    onClick={() => setQuality(q)}
                  >
                    <span>{q === "high" ? "Beautiful" : "Lightweight"}</span>
                    <small>
                      {q === "high"
                        ? "Soft shadows · sharper resolution"
                        : "No shadows · lower resolution"}
                    </small>
                    {quality === q && <Check size={18} />}
                  </button>
                ))}
              </div>
              <div className="demo-note">
                <VolumeX size={18} />
                <p>
                  This prototype has no sound. Product photos appear on display
                  rails; mannequin garments are stylized.
                </p>
              </div>
            </div>
          </Modal>
        )}
        {modal === "help" && (
          <Modal title="A little guide to your boutique" onClose={close}>
            <div className="help-content">
              <div>
                <Keyboard />
                <section>
                  <h3>Wander at your own pace</h3>
                  <p>
                    Use W A S D or the arrow keys to walk. On touch screens,
                    touch and drag the lower-right area to walk. The joystick
                    appears while held and hides when released.
                  </p>
                </section>
              </div>
              <div>
                <MousePointer2 />
                <section>
                  <h3>Look around. Find a favorite.</h3>
                  <p>
                    Click “Click to look around” to keep your cursor centred
                    while looking. Press Esc to release it for menus. Hold a
                    mouse button to pause looking; release to resume. On touch
                    screens, drag to look. Click a product photo or mannequin to
                    see its details. Optional mouse capture lets you turn
                    continuously; press Esc to release it.
                  </p>
                </section>
              </div>
              <div>
                <ShoppingBag />
                <section>
                  <h3>A bag full of possibilities</h3>
                  <p>
                    Add sample products to your bag. Your bag stays saved on
                    this device. Checkout and real orders are disabled.
                  </p>
                </section>
              </div>
              <div>
                <Grid2X2 />
                <section>
                  <h3>Prefer a simpler browse?</h3>
                  <p>
                    Switch to Product view for all products, search, and a fully
                    accessible shopping experience without 3D.
                  </p>
                </section>
              </div>
              <button className="primary-button" onClick={close}>
                Let’s explore
                <ArrowRight size={17} />
              </button>
            </div>
          </Modal>
        )}
        {modal === "about" && (
          <Modal title={`About ${settings.name}`} onClose={close}>
            <div className="help-content">
              <p>{settings.description}</p>
              <dl className="store-contact-details">
                {settings.address && (
                  <>
                    <dt>Address</dt>
                    <dd>{settings.address}</dd>
                  </>
                )}
                {settings.phone && (
                  <>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                    </dd>
                  </>
                )}
                {settings.email && (
                  <>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${settings.email}`}>{settings.email}</a>
                    </dd>
                  </>
                )}
                {settings.website && (
                  <>
                    <dt>Website</dt>
                    <dd>
                      <a
                        href={settings.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit our main website
                      </a>
                    </dd>
                  </>
                )}
              </dl>
              <p>
                Accounts, live inventory and secure ordering are planned for
                later phases. No personal information is collected and no
                payments or real orders are accepted.
              </p>
              <button className="primary-button" onClick={close}>
                Back to the boutique
                <ArrowRight size={17} />
              </button>
            </div>
          </Modal>
        )}
        {notice && (
          <div className="toast" role="status">
            <Check size={17} />
            {notice}
          </div>
        )}
      </section>
    </main>
  );
}
