import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

const CAR_BRANDS = {
  VW: ["POLO 5", "POLO 6", "GOLF 6", "PASSAT B7", "TIGUAN", "CADDY"],
  AUDI: ["A3", "A4", "A6", "Q3", "Q5"],
  BMW: ["SERIE 1", "SERIE 3", "SERIE 5", "X3", "X5"],
  MERCEDES: ["C CLASS", "E CLASS", "A CLASS", "GLA", "GLC"],
  PEUGEOT: ["208", "308", "508", "3008", "5008"],
  RENAULT: ["CLIO", "MEGANE", "SCENIC", "CAPTUR", "LAGUNA"],
  FORD: ["FOCUS", "FIESTA", "MONDEO", "KUGA", "TRANSIT"],
  CITROEN: ["C3", "C4", "C5", "BERLINGO", "DS3"],
  TOYOTA: ["YARIS", "COROLLA", "RAV4", "AYGO"],
  NISSAN: ["MICRA", "QASHQAI", "Juke", "X-TRAIL"],
};

const CATEGORY_OPTIONS = [
  "HVAC",
  "ENGINE",
  "BRAKING",
  "SUSPENSION",
  "ELECTRICAL",
  "FILTERS",
  "COOLING",
  "TRANSMISSION",
  "BODY",
  "INTERIOR",
];

const CATEGORY_SUBCATEGORIES = {
  HVAC: ["RADIATOR", "MVL", "A/C COMPRESSOR", "HEATER CORE", "CONDENSER", "BLOWER MOTOR"],
  ENGINE: ["TIMING BELT", "WATER PUMP", "THERMOSTAT", "OIL PUMP", "VALVE COVER", "SERPENTINE BELT"],
  BRAKING: ["BRAKE PADS", "BRAKE DISCS", "CALIPER", "BRAKE FLUID", "BRAKE DRUM", "BRAKE HOSE"],
  SUSPENSION: ["SHOCK ABSORBER", "STRUT", "BALL JOINT", "CONTROL ARM", "SPRING", "BUSHING"],
  ELECTRICAL: ["ALTERNATOR", "STARTER", "BATTERY", "HEADLIGHT", "WIRING HARNESS", "SENSOR"],
  FILTERS: ["AIR FILTER", "OIL FILTER", "CABIN FILTER", "FUEL FILTER", "POLLEN FILTER", "FILTER KIT"],
  COOLING: ["RADIATOR", "THERMOSTAT", "EXPANSION TANK", "FAN", "COOLANT PUMP", "HEAT EXCHANGER"],
  TRANSMISSION: ["CLUTCH", "CV JOINT", "DRIVESHAFT", "SYNCHRO", "GEARBOX", "AXLE"],
  BODY: ["BUMPER", "DOOR HANDLE", "FENDER", "MIRROR", "LIGHT ASSEMBLY", "GRILLE"],
  INTERIOR: ["SEAT", "STEERING WHEEL", "DASHBOARD", "PEDAL", "AIRBAG", "DOOR PANEL"],
};

// Lazy-loaded: pulls in @zxing/browser, which is sizeable and only ever
// needed when a user actually opens the camera scanner.
const BarcodeScannerModal = lazy(() => import("./BarcodeScannerModal.jsx"));

function specsToRows(specs) {
  const entries = Object.entries(specs || {});
  return entries.length ? entries.map(([key, value]) => ({ key, value: String(value) })) : [{ key: "", value: "" }];
}

function rowsToSpecs(rows) {
  const specs = {};
  for (const { key, value } of rows) {
    const trimmedKey = key.trim();
    if (trimmedKey) specs[trimmedKey] = value.trim();
  }
  return specs;
}

export default function PartEditor({ base, onClose, onSave, call }) {
  const isNew = !base;
  const dragState = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const [sku, setSku] = useState(base?.sku || "");
  const [skuMatches, setSkuMatches] = useState([]);
  const [lastLookedUpSku, setLastLookedUpSku] = useState(null);
  const [name, setName] = useState(base?.name || "");
  const [oem, setOem] = useState(base?.oem || "");
  const [barcode, setBarcode] = useState(base?.barcode || "");
  const [qrCode, setQrCode] = useState(base?.qr_code || "");
  const [brand, setBrand] = useState(base?.brand || "");
  const [carBrand, setCarBrand] = useState(base?.car_brand || "");
  const [carModel, setCarModel] = useState(base?.car_model || "");
  const [category, setCategory] = useState(base?.category || "");
  const [subcategory, setSubcategory] = useState(base?.subcategory || "");
  const [variant, setVariant] = useState(base?.variant || "");
  const [manufacturerOptions, setManufacturerOptions] = useState([]);
  const [specRows, setSpecRows] = useState(specsToRows(base?.specs));
  const [price, setPrice] = useState(base?.price ?? 0);
  const [priceht, setPriceht] = useState(base?.priceht ?? 0);
  const [quantity, setQuantity] = useState(base?.quantity ?? 0);
  const [reorderLevel, setReorderLevel] = useState(base?.reorder_level ?? 5);
  const [location, setLocation] = useState(base?.location || "");
  const [saving, setSaving] = useState(false);

  const [barcodeLookup, setBarcodeLookup] = useState(null); // { status: "loading"|"internal"|"external"|"none"|"error", ... }
  const [lastLookedUpBarcode, setLastLookedUpBarcode] = useState(null);
  const [qrLookup, setQrLookup] = useState(null); // { status: "loading"|"internal"|"none"|"error", ... }
  const [lastLookedUpQr, setLastLookedUpQr] = useState(null);
  const [scanTarget, setScanTarget] = useState(null); // "barcode" | "qrCode" | null

  useEffect(() => {
    setName(generateAutoName());
  }, [category, subcategory, carModel, variant]);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event) => {
      if (!dragState.current) return;
      const dx = event.clientX - dragState.current.startX;
      const dy = event.clientY - dragState.current.startY;
      setModalOffset({
        x: dragState.current.startOffsetX + dx,
        y: dragState.current.startOffsetY + dy,
      });
    };

    const handlePointerUp = () => {
      dragState.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging]);

  const normalizeSku = (value) => value.toUpperCase();
  const normalizeBrand = (value) => value.toUpperCase();
  const normalizeCategory = (value) => value.toUpperCase();
  const normalizeVariant = (value) => value.toUpperCase();

  const handleCategoryChange = (nextCategory) => {
    const normalized = normalizeCategory(nextCategory || "");
    setCategory(normalized);
    const subvalues = CATEGORY_SUBCATEGORIES[normalized] || [];
    if (!subvalues.length) {
      setSubcategory("");
      return;
    }
    setSubcategory((prev) => {
      const normalizedPrev = prev.trim().toUpperCase();
      const keepCurrent = subvalues.some((option) => option === normalizedPrev);
      return keepCurrent ? normalizedPrev : subvalues[0];
    });
  };

  const generateAutoName = () => {
    const parts = [];
    const selectedSubcategory = (subcategory || "").trim();
    const selectedModel = (carModel || "").trim();
    const selectedVariant = (variant || "").trim();

    if (selectedSubcategory) parts.push(selectedSubcategory);
    if (selectedModel) parts.push(selectedModel);
    if (selectedVariant) parts.push(selectedVariant);

    if (parts.length === 0) return (name || "").trim();
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };

  const canSave = sku.trim().length > 0 && generateAutoName().trim().length > 0;

  const generateSkuPreview = (partName, modelName) => {
    const baseKey = (partName || "").trim();
    const modelKey = (modelName || "").trim();
    if (!baseKey && !modelKey) return "";

    const text = `${baseKey} ${modelKey}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const lower = text.toLowerCase();
    if (lower.includes("moteur") && lower.includes("ventilateur")) return "MVL";
    if (lower.includes("filtre") && lower.includes("air")) return "FAA";
    if (lower.includes("embrayage")) return "EMB";

    const words = lower
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => word.length > 2 && !["de", "des", "la", "le", "du", "et", "pour", "pour"].includes(word));

    if (!words.length) return "";
    const initials = words.slice(0, 3).map((word) => word[0]).join("");
    const modelCode = modelKey ? modelKey.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() : "";
    return `${initials}${modelCode ? `_${modelCode}` : ""}`.slice(0, 12).toUpperCase();
  };

  useEffect(() => {
    if (!call) return;
    const loadManufacturers = async () => {
      try {
        const res = await call("/parts/manufacturers/");
        setManufacturerOptions((res.manufacturers || []).map((value) => String(value).toUpperCase()));
      } catch {
        setManufacturerOptions([]);
      }
    };
    loadManufacturers();
  }, [call]);

  const lookupSku = async (overrideValue) => {
    const value = normalizeSku((overrideValue ?? sku).trim());
    if (!value || value === lastLookedUpSku || !call) return;
    setLastLookedUpSku(value);
    try {
      const res = await call(`/parts/lookup-sku/?sku=${encodeURIComponent(value)}`);
      const matches = res.matches || [];
      setSkuMatches(matches.filter((part) => part.brand || part.name || part.location));
      if (matches.length > 0 && !matches.some((part) => part.brand === brand.trim())) {
        setBrand("");
      }
    } catch {
      setSkuMatches([]);
    }
  };

  const lookupBarcode = async (overrideValue) => {
    const value = (overrideValue ?? barcode).trim();
    if (!value || value === lastLookedUpBarcode || !call) return;
    setLastLookedUpBarcode(value);
    setBarcodeLookup({ status: "loading" });
    try {
      const res = await call(`/parts/lookup-barcode/?barcode=${encodeURIComponent(value)}`);
      if (res.matched && res.source === "internal") {
        setBarcodeLookup({ status: "internal", part: res.part });
      } else if (res.matched && res.source === "external") {
        setBarcodeLookup({ status: "external", suggested: res.suggested });
        // Only fill fields the user hasn't already typed something into.
        if (res.suggested.name && !name.trim()) setName(res.suggested.name);
        if (res.suggested.brand && !brand.trim()) setBrand(normalizeBrand(res.suggested.brand));
        if (res.suggested.category && !category.trim()) setCategory(normalizeCategory(res.suggested.category));
      } else {
        setBarcodeLookup({ status: "none" });
      }
    } catch {
      setBarcodeLookup({ status: "error" });
    }
  };

  const lookupQr = async (overrideValue) => {
    const value = (overrideValue ?? qrCode).trim();
    if (!value || value === lastLookedUpQr || !call) return;
    setLastLookedUpQr(value);
    setQrLookup({ status: "loading" });
    try {
      const res = await call(`/parts/lookup-qrcode/?qr_code=${encodeURIComponent(value)}`);
      if (res.matched && res.source === "internal") {
        setQrLookup({ status: "internal", part: res.part });
      } else {
        setQrLookup({ status: "none" });
      }
    } catch {
      setQrLookup({ status: "error" });
    }
  };

  const openScanner = (target) => setScanTarget(target);

  const handleScanDetected = (text) => {
    if (scanTarget === "qrCode") {
      setQrCode(text);
      lookupQr(text);
    } else {
      setBarcode(text);
      lookupBarcode(text);
    }
    setScanTarget(null);
  };

  const loadExistingPart = (part) => {
    setSku(normalizeSku(part.sku || ""));
    setName(part.name);
    setSubcategory((part.subcategory || "").trim().toUpperCase());
    setOem(part.oem || "");
    setBarcode(part.barcode || "");
    setQrCode(part.qr_code || "");
    setBrand(normalizeBrand(part.brand || ""));
    setCarBrand(normalizeBrand(part.car_brand || ""));
    setCarModel(normalizeBrand(part.car_model || ""));
    setCategory(normalizeCategory(part.category || ""));
    setVariant(normalizeVariant(part.variant || ""));
    setSpecRows(specsToRows(part.specs));
    setPrice(part.price ?? 0);
    setPriceht(part.priceht ?? 0);
    setReorderLevel(part.reorder_level ?? 5);
    setLocation(part.location || "");
    setBarcodeLookup(null);
    setQrLookup(null);
  };

  const updateSpecRow = (index, field, value) => {
    setSpecRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };
  const addSpecRow = () => setSpecRows((rows) => [...rows, { key: "", value: "" }]);
  const removeSpecRow = (index) => setSpecRows((rows) => rows.filter((_, i) => i !== index));

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const generatedName = generateAutoName();
      setName(generatedName);
      const skuValue = normalizeSku((sku || "").trim()) || generateSkuPreview(generatedName, carModel);
      const body = {
        sku: skuValue, name: generatedName.trim(), oem: oem.trim(),
        barcode: barcode.trim() || null, qr_code: qrCode.trim() || null,
        brand: normalizeBrand(brand.trim()), car_brand: normalizeBrand(carBrand.trim()),
        car_model: normalizeBrand(carModel.trim()), category: normalizeCategory(category.trim()),
        subcategory: normalizeCategory(subcategory.trim()), variant: normalizeVariant(variant.trim()),
        specs: rowsToSpecs(specRows),
        price: String(price || 0), priceht: String(priceht || 0),
        reorder_level: Number(reorderLevel) || 0, location: location.trim(),
      };
      if (isNew) body.quantity = Number(quantity) || 0;
      await onSave({ id: base?.id || null, body });
    } catch {
      // notify() already handled by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal draggable"
        onClick={(e) => e.stopPropagation()}
        style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}
      >
        <div
          className="modal-head draggable-handle"
          onPointerDown={(event) => {
            if (event.target.closest("button, input, select, textarea")) return;
            const modal = event.currentTarget.closest(".modal");
            dragState.current = {
              startX: event.clientX,
              startY: event.clientY,
              startOffsetX: modalOffset.x,
              startOffsetY: modalOffset.y,
            };
            setDragging(true);
            event.preventDefault();
          }}
          style={{ cursor: "grab" }}
        >
          <h3>{isNew ? "Nouvelle pièce" : `Modifier ${base.name}`}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <label className="field">
              <span>Marque voiture</span>
              <input
                list="car-brand-options"
                value={carBrand}
                onChange={(e) => {
                  const nextBrand = e.target.value;
                  setCarBrand(nextBrand);
                  setCarModel("");
                }}
                placeholder="Saisir ou choisir une marque"
              />
              <datalist id="car-brand-options">
                {Object.keys(CAR_BRANDS).map((brandKey) => (
                  <option key={brandKey} value={brandKey} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Modèle voiture</span>
              <input
                list="car-model-options"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                disabled={!carBrand}
                placeholder={carBrand ? "Saisir ou choisir un modèle" : "Choisissez d'abord la marque"}
              />
              <datalist id="car-model-options">
                {(CAR_BRANDS[carBrand] || []).map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="req">Catégorie</span>
              <input
                list="category-options"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                placeholder="Choisir une catégorie"
              />
              <datalist id="category-options">
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span className="req">Sous-catégorie</span>
              <input
                list={category ? `subcategory-options-${category}` : "subcategory-options-generic"}
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value.toUpperCase())}
                placeholder={category ? "Choisir ou saisir un sous-type" : "Choisir une catégorie d'abord"}
              />
              <datalist id={category ? `subcategory-options-${category}` : "subcategory-options-generic"}>
                {(category ? CATEGORY_SUBCATEGORIES[category] || [] : []).map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Fabricant</span>
              <input
                list="brand-options"
                value={brand}
                onChange={(e) => setBrand(normalizeBrand(e.target.value))}
                placeholder="Saisir ou choisir un fabricant"
              />
              <datalist id="brand-options">
                {[...new Set([
                  ...manufacturerOptions,
                  ...skuMatches.map((part) => part.brand).filter(Boolean),
                  base?.brand,
                  brand,
                ])].filter(Boolean).map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Désignation auto</span>
              <input value={generateAutoName() || ""} readOnly placeholder="La désignation est générée automatiquement" />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="req">Référence (SKU)</span>
              <div className="inline-row">
                <input
                  value={sku}
                  onChange={(e) => setSku(normalizeSku(e.target.value))}
                  onBlur={() => lookupSku()}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupSku(); } }}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn small ghost sku-generate"
                  onClick={() => {
                    const generated = generateSkuPreview(generateAutoName(), carModel);
                    if (generated) setSku(generated);
                  }}
                >
                  Générer
                </button>
              </div>
              {generateAutoName().trim() && carModel && (
                <span className="muted" style={{ fontSize: 11 }}>
                  Prévisualisation: {generateSkuPreview(generateAutoName(), carModel) || "—"}
                </span>
              )}
              {skuMatches.length > 0 && (
                <span className="muted" style={{ fontSize: 11 }}>
                  Cette référence existe déjà pour d'autres marques. Choisissez la bonne marque ci-dessous.
                </span>
              )}
            </label>
            <label className="field">
              <span>Référence OEM</span>
              <input value={oem} onChange={(e) => setOem(e.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Code-barres</span>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onBlur={() => lookupBarcode()}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupBarcode(); } }}
                  placeholder="Scanner ou saisir..."
                  style={{ flex: 1 }}
                />
                {call && (
                  <button
                    type="button"
                    className="icon-btn"
                    title="Scanner avec la caméra"
                    onClick={() => openScanner("barcode")}
                  >
                    <Camera size={18} />
                  </button>
                )}
              </div>
              {barcodeLookup?.status === "loading" && (
                <span className="muted" style={{ fontSize: 11 }}>Recherche...</span>
              )}
              {barcodeLookup?.status === "internal" && (
                <span className="muted" style={{ fontSize: 11 }}>
                  Ce code correspond déjà à « {barcodeLookup.part.name} » ({barcodeLookup.part.sku}).{" "}
                  <button type="button" className="btn small ghost" onClick={() => loadExistingPart(barcodeLookup.part)}>
                    Charger cette pièce
                  </button>
                </span>
              )}
              {barcodeLookup?.status === "external" && (
                <span className="muted" style={{ fontSize: 11 }}>
                  Désignation/marque/catégorie pré-remplies depuis le code-barres — à vérifier.
                </span>
              )}
              {barcodeLookup?.status === "none" && (
                <span className="muted" style={{ fontSize: 11 }}>Aucune correspondance trouvée, à remplir manuellement.</span>
              )}
              {barcodeLookup?.status === "error" && (
                <span className="muted" style={{ fontSize: 11 }}>Recherche indisponible, à remplir manuellement.</span>
              )}
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Code QR</span>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  onBlur={() => lookupQr()}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupQr(); } }}
                  placeholder="Scanner ou saisir..."
                  style={{ flex: 1 }}
                />
                {call && (
                  <button
                    type="button"
                    className="icon-btn"
                    title="Scanner avec la caméra"
                    onClick={() => openScanner("qrCode")}
                  >
                    <Camera size={18} />
                  </button>
                )}
              </div>
              {qrLookup?.status === "loading" && (
                <span className="muted" style={{ fontSize: 11 }}>Recherche...</span>
              )}
              {qrLookup?.status === "internal" && (
                <span className="muted" style={{ fontSize: 11 }}>
                  Ce code correspond déjà à « {qrLookup.part.name} » ({qrLookup.part.sku}).{" "}
                  <button type="button" className="btn small ghost" onClick={() => loadExistingPart(qrLookup.part)}>
                    Charger cette pièce
                  </button>
                </span>
              )}
              {qrLookup?.status === "none" && (
                <span className="muted" style={{ fontSize: 11 }}>Aucune correspondance trouvée — sera enregistré tel quel.</span>
              )}
              {qrLookup?.status === "error" && (
                <span className="muted" style={{ fontSize: 11 }}>Recherche indisponible.</span>
              )}
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Variation / Taille</span>
              <input
                value={variant}
                onChange={(e) => setVariant(normalizeVariant(e.target.value))}
                placeholder="EX: SMALL / LARGE"
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Prix de vente</span>
              <input type="number" min="0" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <label className="field">
              <span>Prix d'achat (HT)</span>
              <input type="number" min="0" step="0.001" value={priceht} onChange={(e) => setPriceht(e.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>{isNew ? "Quantité initiale" : "Quantité en stock"}</span>
              <input
                type="number" step="1" value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!isNew}
              />
              {!isNew && <span className="muted" style={{ fontSize: 11 }}>Utilisez +/− dans la liste pour ajuster le stock.</span>}
            </label>
            <label className="field">
              <span>Seuil d'alerte</span>
              <input type="number" min="0" step="1" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Emplacement</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Rayon A3" />
            </label>
          </div>

          <div className="field">
            <span>Caractéristiques</span>
            {specRows.map((row, i) => (
              <div className="field-row" key={i} style={{ marginTop: 4 }}>
                <input
                  placeholder="Nom (ex: Diamètre)"
                  value={row.key}
                  onChange={(e) => updateSpecRow(i, "key", e.target.value)}
                />
                <input
                  placeholder="Valeur (ex: 280mm)"
                  value={row.value}
                  onChange={(e) => updateSpecRow(i, "value", e.target.value)}
                />
                <button type="button" className="icon-btn" onClick={() => removeSpecRow(i)}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="btn small ghost" style={{ marginTop: 4 }} onClick={addSpecRow}>
              + Ajouter une caractéristique
            </button>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={submit} disabled={!canSave || saving}>
            {isNew ? "Créer la pièce" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>

    {scanTarget && (
      <Suspense fallback={null}>
        <BarcodeScannerModal onDetected={handleScanDetected} onClose={() => setScanTarget(null)} />
      </Suspense>
    )}
    </>
  );
}
