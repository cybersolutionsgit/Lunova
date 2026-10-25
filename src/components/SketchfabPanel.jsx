import { lazy, Suspense, useEffect, useState } from "react";
import { SKETCHFAB_LICENSES, creditText } from "../lib/sketchfab";
const ModelImportPreview = lazy(() => import("./ModelImportPreview"));
async function api(path, options = {}) {
  const response = await fetch("/api/admin/sketchfab/" + path, {
    credentials: "same-origin",
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Sketchfab request failed.");
  return data;
}
function saveMetadata(value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "sketchfab-" + value.uid + "-credits.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function SketchfabPanel() {
  const [q, setQ] = useState("supermarket shelf"),
    [license, setLicense] = useState(""),
    [downloadable, setDownloadable] = useState("true"),
    [results, setResults] = useState([]),
    [status, setStatus] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [next, setNext] = useState(null),
    [ack, setAck] = useState({}),
    [download, setDownload] = useState(null),
    [searched, setSearched] = useState(false);
  useEffect(() => {
    let active = true;
    api("status")
      .then((data) => {
        if (active) setStatus(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(action) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function search(offset = 0) {
    await run(async () => {
      const data = await api(
        "search?" +
          new URLSearchParams({
            q,
            license,
            downloadable,
            offset: String(offset),
          }),
      );
      setResults(data.results);
      setNext(data.nextOffset);
      setDownload(null);
      setAck({});
      setSearched(true);
    });
  }
  return (
    <div className="sketchfab-panel">
      <h3>Sketchfab model library</h3>
      <p>
        Search public models. Downloads require your Sketchfab authorization and
        a license suitable for this commercial store. Creator credits stay with
        each import.
      </p>
      <div className="editor-notice">
        {status?.connected
          ? "Sketchfab connected."
          : status?.configured
            ? "Ready to connect your Sketchfab account."
            : "Search is available without Sketchfab credentials. OAuth setup is required for downloads."}
      </div>
      {error && (
        <p role="alert" className="editor-error">
          {error}
        </p>
      )}
      <button
        className="secondary-button"
        disabled={busy || !status?.configured}
        onClick={() =>
          run(async () => {
            const data = await api("connect", { method: "POST" });
            window.location.assign(data.url);
          })
        }
      >
        Connect Sketchfab
      </button>
      {status?.connected && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api("disconnect", { method: "POST" });
              setStatus((s) => ({ ...s, connected: false }));
              setDownload(null);
            })
          }
        >
          Disconnect Sketchfab
        </button>
      )}
      <form
        className="product-form"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <label>
          Model keyword
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={100}
            required
          />
        </label>
        <div className="form-columns">
          <label>
            Model license
            <select
              aria-label="Model license"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
            >
              <option value="">All licenses</option>
              {SKETCHFAB_LICENSES.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Download availability
            <select
              aria-label="Download availability"
              value={downloadable}
              onChange={(e) => setDownloadable(e.target.value)}
            >
              <option value="true">Downloadable only</option>
              <option value="false">Not downloadable</option>
              <option value="all">All models</option>
            </select>
          </label>
        </div>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Working…" : "Search Sketchfab"}
        </button>
      </form>
      {searched && results.length === 0 && (
        <p role="status">No models matched these filters.</p>
      )}
      <div className="sketchfab-results">
        {results.map((model) => (
          <article key={model.uid} className="editor-notice">
            {model.thumbnail && (
              <img
                src={model.thumbnail}
                alt={model.name}
                loading="lazy"
                width="220"
                height="150"
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            )}
            <h4>{model.name}</h4>
            <p>
              By{" "}
              <a href={model.creator.url} target="_blank" rel="noreferrer">
                {model.creator.name}
              </a>{" "}
              ·{" "}
              <a
                href={model.license.url || model.source}
                target="_blank"
                rel="noreferrer"
              >
                {model.license.name}
              </a>
            </p>
            <p>
              {model.downloadable ? "Downloadable" : "Not downloadable"} ·{" "}
              {model.commercialImportAllowed
                ? "Commercial import supported"
                : "Reference only: license/download restrictions"}
            </p>
            <a href={model.source} target="_blank" rel="noreferrer">
              View on Sketchfab
            </a>
            {model.commercialImportAllowed && (
              <>
                <label style={{ display: "block", margin: "12px 0" }}>
                  <input
                    type="checkbox"
                    checked={!!ack[model.uid]}
                    onChange={(e) =>
                      setAck((a) => ({ ...a, [model.uid]: e.target.checked }))
                    }
                  />{" "}
                  I reviewed the license and will keep its credits and
                  requirements.
                </label>
                <button
                  className="secondary-button"
                  disabled={busy || !status?.connected || !ack[model.uid]}
                  onClick={() =>
                    run(async () => {
                      const data = await api("download", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          uid: model.uid,
                          acknowledgeLicense: true,
                        }),
                      });
                      setDownload(data);
                    })
                  }
                >
                  Prepare authorized download
                </button>
              </>
            )}
          </article>
        ))}
      </div>
      {next !== null && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => search(next)}
        >
          Next results
        </button>
      )}
      {download && (
        <section className="editor-notice">
          <h4>Authorized archive ready</h4>
          <p>{creditText(download.metadata)}</p>
          <a
            className="secondary-button"
            href={download.archiveUrl}
            rel="noreferrer"
            target="_blank"
          >
            Download official archive
          </a>
          <button
            className="secondary-button"
            onClick={() => saveMetadata(download.metadata)}
          >
            Save creator credits
          </button>
          <p>
            The archive link expires. Keep the credits JSON with the archive;
            Codex can then import and review the files before publication.
          </p>
        </section>
      )}
      <Suspense fallback={<p>Loading local preview…</p>}>
        <ModelImportPreview />
      </Suspense>
    </div>
  );
}
