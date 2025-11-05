import React, { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import Cropper from "react-easy-crop";
import cardBackground from "./assets/maq.png";

/* Helpers pour recadrer l'image en canvas -> DataURL */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL("image/png");
}

export default function OtakuCard() {
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  const [photo, setPhoto] = useState(null); // dataURL affiché sur la carte
  const [tempPhoto, setTempPhoto] = useState(null); // photo en cours de recadrage
  const [cropMode, setCropMode] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
    const link = document.createElement("a");
    link.download = "carte-otaku.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTempPhoto(ev.target.result); // on charge pour recadrage
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCropMode(true);
    };
    reader.readAsDataURL(f);
    // reset input value to allow same file re-select
    e.target.value = "";
  };

  const onCropComplete = useCallback((_, pixelCrop) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!tempPhoto || !croppedAreaPixels) {
      setCropMode(false);
      return;
    }
    try {
      const croppedDataUrl = await getCroppedImg(tempPhoto, croppedAreaPixels);
      setPhoto(croppedDataUrl);
    } catch (err) {
      console.error("crop error", err);
    } finally {
      setTempPhoto(null);
      setCropMode(false);
    }
  }, [tempPhoto, croppedAreaPixels]);

  const handleCancelCrop = () => {
    setTempPhoto(null);
    setCropMode(false);
  };

  return (
    <div className="flex flex-col items-center mt-6">
      <div
        ref={cardRef}
        className="relative w-[900px] h-[520px] bg-white shadow-xl rounded-lg overflow-hidden"
        style={{ WebkitPrintColorAdjust: "exact" }}
      >
        {/* fond */}
        <img src={cardBackground} alt="Carte" className="absolute inset-0 w-full h-full object-cover" />

        {/* zone photo cliquable */}
        <div
          onClick={handlePhotoClick}
          className="absolute flex items-center justify-center text-white text-center text-[14px] font-semibold cursor-pointer overflow-hidden"
          style={{
            position: "absolute",
            top: "211px",
            left: "100px",
            width: "253px",
            height: "315px",
            backgroundColor: "green",
            zIndex: 5,
          }}
        >
          {/* si photo finale disponible et pas en mode recadrage */}
          {!cropMode && photo && (
            <img src={photo} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          )}

          {!cropMode && !photo && <span style={{ padding: 8 }}>Cliquez pour ajouter une photo de profil</span>}
        </div>

        {/* Input fichier — complètement caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ display: "none" }}
        />

        {/* Overlay recadrage contenu strictement dans la zone verte */}
        {cropMode && tempPhoto && (
          <div
            className="absolute"
            style={{
              top: "211px",
              left: "100px",
              width: "253px",
              height: "315px",
              zIndex: 30,
              background: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <Cropper
                image={tempPhoto}
                crop={crop}
                zoom={zoom}
                aspect={253 / 315}
                cropShape="rect"
                showGrid={true}
                onCropChange={setCrop}
                onZoomChange={(z) => setZoom(Number(z))}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: { width: "100%", height: "100%" },
                  mediaStyle: { width: "auto", height: "100%" },
                }}
              />
              {/* slider et boutons, positionés à l'intérieur pour rester cliquables */}
              <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 8, width: "85%", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  style={{ width: "70%" }}
                />
                <button onClick={handleCropConfirm} style={{ padding: "6px 10px", background: "#16a34a", color: "#fff", borderRadius: 6, border: "none", cursor: "pointer" }}>
                  Valider
                </button>
                <button onClick={handleCancelCrop} style={{ padding: "6px 10px", background: "#e5e7eb", color: "#111827", borderRadius: 6, border: "none", cursor: "pointer" }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* textes principaux (inchangés) */}
        <div
          className="text-black"
          style={{
            position: "absolute",
            top: "195px",
            left: "360px",
            fontSize: "20px",
            fontWeight: 600,
            lineHeight: "35px",
            zIndex: 10,
          }}
        >
          <p>NOM D’UTILISATEUR : <span style={{ fontWeight: 400 }}>Akouala</span></p>
          <p>NOM RÉEL : <span style={{ fontWeight: 400 }}>Crist</span></p>
          <p>NATIONALITÉ : <span style={{ fontWeight: 400 }}>Camerounaise</span></p>
          <p>STATUT : <span style={{ fontWeight: 400 }}>Otaku</span></p>
          <p>GENRE PRÉFÉRÉ : <span style={{ fontWeight: 400 }}>Shonen</span></p>
          <p>CITATION FAVORITE : <span style={{ fontWeight: 400 }}>“Crois en tes rêves.”</span></p>
        </div>
      </div>

      {/* bouton de téléchargement */}
      <button onClick={handleDownload} className="mt-7 px-10 py-4 bg-blue-600 text-white text-[18px] font-semibold rounded-xl hover:bg-blue-700 transition">
        Télécharger ma carte
      </button>
    </div>
  );
}
