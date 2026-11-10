import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

// Opens the device camera and decodes a barcode from the live feed using
// ZXing (works across Chrome/Firefox/Safari/mobile, unlike the native
// BarcodeDetector API which is Chromium-only). Calls onDetected(text) once,
// then the caller is expected to close this modal.
export default function BarcodeScannerModal({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result, err) => {
          if (cancelled || !result) return;
          onDetected(result.getText());
        }
      )
      .catch((e) => {
        if (cancelled) return;
        setError(
          e?.name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorisez la caméra pour ce site puis réessayez."
            : "Impossible d'accéder à la caméra sur cet appareil/navigateur."
        );
      });

    return () => {
      cancelled = true;
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, [onDetected]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Scanner un code-barres</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error ? (
            <p className="muted">{error}</p>
          ) : (
            <>
              <video
                ref={videoRef}
                style={{ width: "100%", borderRadius: 10, background: "#000" }}
                muted
                playsInline
              />
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                Visez le code-barres avec la caméra — la détection est automatique.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
