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
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ShoppingBag,
  Search,
  Leaf,
  Grid2X2,
  Apple,
  Milk,
  Croissant,
  Package,
  CupSoda,
  MapPin,
  SlidersHorizontal,
  Maximize,
  Minimize,
  MousePointer2,
  Keyboard,
  Plus,
  Minus,
  X,
  Check,
  ChevronRight,
  Compass,
  VolumeX,
  Info,
  RotateCcw,
} from "lucide-react";
import { categories, products, money, productById } from "./lib/products";
import { useCart, useWorld } from "./lib/store";
import { cartTotals } from "./lib/cart";
import { aisleSpawns } from "./lib/world";
import { movement } from "./lib/controls";
const StoreScene = lazy(() => import("./components/StoreScene"));
const icons = {
  grid: Grid2X2,
  apple: Apple,
  milk: Milk,
  bread: Croissant,
  package: Package,
  cup: CupSoda,
};
function ProductArt({ product, small = false }) {
  return (
    <div
      className={`product-art ${small ? "small" : ""}`}
      style={{ "--product": product.color, "--accent": product.accent }}
      aria-hidden="true"
    >
      <div className={`pack ${product.shape}`}>
        <span className="pack-brand">LUNOVA</span>
        <span className="pack-emoji">{product.emoji}</span>
        <span className="pack-label">{product.label}</span>
      </div>
    </div>
  );
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const list = ref.current.querySelectorAll(
          'button,input,select,[tabindex="0"]',
        );
        if (!list.length) {
          e.preventDefault();
          return;
        }
        const first = list[0],
          last = list[list.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export default function App() {
  const {
    category,
    setCategory,
    selected,
    select,
    modal,
    setModal,
    quality,
    setQuality,
    goTo,
    locked,
    notice,
    notify,
  } = useWorld();
  const items = useCart((s) => s.items),
    add = useCart((s) => s.add),
    change = useCart((s) => s.change);
  const { count, subtotal } = cartTotals(items);
  const [query, setQuery] = useState(""),
    [view, setView] = useState("explore"),
    [fullscreen, setFullscreen] = useState(false);
  const worldRef = useRef();
  const markerRef = useRef();
  const updatePosition = useCallback((x, z) => {
    if (markerRef.current) {
      markerRef.current.style.transform = `translate(${x * 3}px,${(z - 9) * 2.1}px)`;
      markerRef.current.dataset.x = x.toFixed(2);
      markerRef.current.dataset.z = z.toFixed(2);
    }
  }, []);
  const close = () => {
    select(null);
    setModal(null);
  };
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
      notify("Sample stock limit reached");
      return;
    }
    add(p.id);
    notify(`${p.name} added to your bag`);
  }
  function visit(id) {
    setCategory(id);
    goTo(aisleSpawns[id]);
    setView("explore");
  }
  async function immersive() {
    const canvas = worldRef.current?.querySelector("canvas");
    if (!canvas) return;
    try {
      await canvas.requestPointerLock?.();
    } catch {
      notify("Drag the scene to look around on this device.");
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
  return (
    <div className="app-shell">
      <aside className="sidebar">
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
          lunova<span className="brand-dot">®</span>
        </a>
        <div className="store-label">
          <span className="live-dot" /> THE VIRTUAL MARKET
        </div>
        <div className="sidebar-heading">YOUR STORE, REIMAGINED</div>
        <button
          className={`nav-main ${view === "explore" ? "active" : ""}`}
          onClick={() => setView("explore")}
        >
          <Compass size={19} />
          Explore the store
          <ArrowUpRight size={16} />
        </button>
        <button
          className={`nav-main ${view === "browse" ? "active" : ""}`}
          onClick={() => setView("browse")}
        >
          <Grid2X2 size={18} />
          Browse products<span className="nav-count">10</span>
        </button>
        <div className="sidebar-heading aisles-heading">
          SHOP BY AISLE <span>06</span>
        </div>
        <nav aria-label="Product aisles">
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
        <div className="sidebar-bottom">
          <div className="little-card">
            <span className="leaf-circle">
              <Leaf size={21} />
            </span>
            <h3>
              A little more local.
              <br />A lot more lovely.
            </h3>
            <p>
              Everyday essentials.
              <br />A whole new experience.
            </p>
            <span className="card-drawing">✳</span>
          </div>
          <button className="help-button" onClick={() => setModal("help")}>
            <Info size={17} />
            First time here?
            <ArrowUpRight size={15} />
          </button>
          <div className="sidebar-footer">
            Thoughtfully stocked. Virtually yours.
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="location">
            <MapPin size={16} />
            <span>The neighborhood store</span>
            <span className="location-pill">Demo experience</span>
          </div>
          <div className="topbar-actions">
            <span className="secure-label">
              <Leaf size={14} /> Fresh perspectives, daily
            </span>
            <button className="bag-button" onClick={() => setModal("cart")}>
              <ShoppingBag size={17} />
              <span>My bag</span>
              <b>{count}</b>
            </button>
          </div>
        </header>
        <div className="page-content">
          <div className="breadcrumb">
            The market <ChevronRight size={13} />
            <span>
              {view === "explore" ? "Explore in 3D" : "Browse products"}
            </span>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> A FRESH WAY TO SHOP
              </div>
              <h1>
                Your everyday shop.
                <br className="mobile-break" /> <em>Anything but ordinary.</em>
              </h1>
              <p>
                Take a little wander. Find your favorites. Make yourself at
                home.
              </p>
            </div>
            <button className="text-link" onClick={() => setModal("help")}>
              How to explore
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="market-toolbar">
            <div className="view-tabs">
              <button
                className={view === "explore" ? "active" : ""}
                onClick={() => setView("explore")}
              >
                <Compass size={16} />
                Explore in 3D
              </button>
              <button
                className={view === "browse" ? "active" : ""}
                onClick={() => setView("browse")}
              >
                <Grid2X2 size={16} />
                Product view
              </button>
            </div>
            <div className="toolbar-actions">
              <span className="sample-label">
                <span className="live-dot" /> Sample store · 10 products
              </span>
              <button
                className="settings-button"
                onClick={() => setModal("settings")}
                aria-label="Graphics settings"
              >
                <SlidersHorizontal size={17} />
                <span>Settings</span>
              </button>
            </div>
          </div>
          <section
            className={`world-container ${view === "browse" ? "catalog-mode" : ""}`}
            ref={worldRef}
            aria-label="Virtual market"
          >
            {view === "explore" ? (
              <>
                <Suspense
                  fallback={
                    <div className="scene-loading">
                      <Leaf />
                      Setting the shelves…
                    </div>
                  }
                >
                  <StoreScene
                    enabled={view === "explore"}
                    onPosition={updatePosition}
                  />
                </Suspense>
                <div className="scene-top">
                  <span className="scene-badge">
                    <span className="live-dot" /> LIVE 3D EXPERIENCE
                  </span>
                  <span className="scene-location">
                    <MapPin size={14} />
                    {categories.find((c) => c.id === category)?.name}
                  </span>
                </div>
                <div className="scene-greeting">
                  <span>WELCOME TO YOUR</span>
                  <h2>happy place.</h2>
                  <p>Good food. Great finds. Just a few steps away.</p>
                </div>
                <div className="crosshair" aria-hidden="true" />
                <div className="scene-controls">
                  <button
                    onClick={() => {
                      goTo(aisleSpawns.all);
                      setCategory("all");
                    }}
                    aria-label="Return to entrance"
                  >
                    <RotateCcw size={17} />
                  </button>
                  <button
                    onClick={expand}
                    aria-label={fullscreen ? "Exit full screen" : "Full screen"}
                  >
                    {fullscreen ? (
                      <Minimize size={17} />
                    ) : (
                      <Maximize size={17} />
                    )}
                  </button>
                </div>
                <div className="minimap" aria-hidden="true">
                  <span>THE MARKET</span>
                  <div className="map-shelves">
                    <i />
                    <i />
                    <i />
                  </div>
                  <b ref={markerRef} data-testid="player-marker">
                    ◉
                  </b>
                  <small>ENTRANCE</small>
                </div>
                <div className="touch-pad" aria-label="Touch movement controls">
                  {[
                    ["forward", ArrowUp],
                    ["left", ArrowLeft],
                    ["back", ArrowDown],
                    ["right", ArrowRight],
                  ].map(([dir, Icon]) => (
                    <button
                      key={dir}
                      className={`touch-${dir}`}
                      aria-label={`Move ${dir}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        movement[dir] = true;
                      }}
                      onPointerUp={() => (movement[dir] = false)}
                      onPointerCancel={() => (movement[dir] = false)}
                      onLostPointerCapture={() => (movement[dir] = false)}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
                <div className="world-bottom">
                  <div>
                    <span className="keyboard-hint">
                      <kbd>W</kbd>
                      <span>
                        <kbd>A</kbd>
                        <kbd>S</kbd>
                        <kbd>D</kbd>
                      </span>
                    </span>
                    <span>Move around</span>
                    <span className="control-divider" />
                    <MousePointer2 size={17} />
                    <span>Drag to look · Click to discover</span>
                  </div>
                  <button onClick={immersive}>
                    {locked ? "Esc to release mouse" : "Enter walk mode"}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </>
            ) : (
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
            )}
          </section>
          <div className="under-world">
            <span>
              <span className="live-dot" />{" "}
              {view === "explore"
                ? "A whole store to discover"
                : "Everyday favorites, thoughtfully selected"}
            </span>
            <span>
              Made for exploring. Built for you. <Leaf size={14} />
            </span>
          </div>
          <section className="discovery-row">
            <div className="discovery-intro">
              <span className="eyebrow">A LITTLE INSPIRATION</span>
              <h2>
                Good things,
                <br />
                <em>in every aisle.</em>
              </h2>
              <p>
                Your daily essentials, with
                <br />a little extra delight.
              </p>
            </div>
            {[
              {
                p: products[0],
                title: "Fresh from nature",
                sub: "Fruit & vegetables",
                category: "produce",
                className: "fresh",
              },
              {
                p: products[4],
                title: "The comfort corner",
                sub: "Bakery favorites",
                category: "bakery",
                className: "baked",
              },
              {
                p: products[8],
                title: "A sip of something good",
                sub: "Drinks & refreshments",
                category: "drinks",
                className: "drinks",
              },
            ].map((card) => (
              <button
                key={card.category}
                className={`discovery-card ${card.className}`}
                onClick={() => visit(card.category)}
              >
                <div>
                  <span>{card.sub}</span>
                  <h3>{card.title}</h3>
                  <span className="discover-link">
                    Explore aisle <ArrowUpRight size={15} />
                  </span>
                </div>
                <span className="discovery-emoji" aria-hidden="true">
                  {card.p.emoji}
                </span>
              </button>
            ))}
          </section>
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} Lunova Market</span>
            <span>
              Prototype only. Sample prices in USD. No real orders or payments.
            </span>
            <button onClick={() => setModal("about")}>
              About this experience <ArrowUpRight size={12} />
            </button>
          </footer>
        </div>
      </main>
      {selected && (
        <Modal title="A closer look" onClose={close}>
          <div className="product-detail">
            <ProductArt product={selected} />
            <span className="detail-tag">{selected.tag}</span>
            <h2>{selected.name}</h2>
            <p className="detail-unit">{selected.unit} · Sample product</p>
            <p>{selected.description}</p>
            <div className="detail-price">
              <strong>{money(selected.price)}</strong>
              <span>{selected.stock} available in demo</span>
            </div>
            <button
              className="primary-button"
              onClick={() => addItem(selected)}
              disabled={(items[selected.id] || 0) >= selected.stock}
            >
              <ShoppingBag size={18} />
              {(items[selected.id] || 0) >= selected.stock
                ? "Sample stock limit reached"
                : "Add to my bag"}
              <Plus size={18} />
            </button>
          </div>
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
                    const p = productById(id);
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
                  <span>Sample subtotal</span>
                  <b>{money(subtotal / 100)}</b>
                </div>
                <div className="demo-note">
                  <Info size={18} />
                  <p>
                    This is your demo shopping bag. Checkout is not enabled and
                    no orders will be placed.
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
              <p>This prototype has no sound and uses no external 3D assets.</p>
            </div>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="A little guide to your market" onClose={close}>
          <div className="help-content">
            <div>
              <Keyboard />
              <section>
                <h3>Wander at your own pace</h3>
                <p>
                  Use W A S D or the arrow keys to walk. On touch screens, use
                  the arrow pad.
                </p>
              </section>
            </div>
            <div>
              <MousePointer2 />
              <section>
                <h3>Look around. Find a favorite.</h3>
                <p>
                  Drag anywhere in the store to look around. Click a product on
                  a shelf to see its details. Walk mode locks the mouse; press
                  Esc to release it.
                </p>
              </section>
            </div>
            <div>
              <ShoppingBag />
              <section>
                <h3>A bag full of possibilities</h3>
                <p>
                  Add sample products to your bag. Your bag stays saved on this
                  device. Checkout and real orders are disabled.
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
        <Modal title="Meet Lunova" onClose={close}>
          <div className="help-content">
            <p>
              A fresh way to experience your neighborhood supermarket. This is
              Phase 1: a virtual market prototype with sample products and a
              saved demo shopping bag.
            </p>
            <p>
              Accounts, live inventory, secure ordering, and admin tools are
              planned for later phases. No personal information is collected and
              no payments or real orders are accepted.
            </p>
            <button className="primary-button" onClick={close}>
              Back to the market
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
    </div>
  );
}
