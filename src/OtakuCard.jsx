import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { QRCodeSVG } from 'qrcode.react';

// Importation des 6 templates
import blueTemplate from "./assets/cni-blue-template.png";
import greenTemplate from "./assets/cni-green-template.png";
import orangeTemplate from "./assets/cni-orange-template.png";
import violetTemplate from "./assets/cni-violet-template.png";
import yellowTemplate from "./assets/cni-yellow-template.png";
import redTemplate from "./assets/cni-red-template.png";

const templates = {
  blue: blueTemplate,
  green: greenTemplate,
  orange: orangeTemplate,
  violet: violetTemplate,
  yellow: yellowTemplate,
  red: redTemplate
};

const CARD_WIDTH = 957; // Basé sur 300 DPI pour 8.1cm
const CARD_HEIGHT = 536; // Basé sur 300 DPI pour 4.54cm
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const INITIAL_LAYOUT = {
  photo: { x: 35, y: 148, w: 250, h: 322 },
  qr: { x: 729, y: 146, w: 154, h: 154 },
  cardId: { x: 85, y: 491, w: 164, h: 40 },
  labelUsername: { x: 289, y: 157, w: 214, h: 31 },
  valUsername: { x: 509, y: 153, w: 213, h: 34 },
  labelRealName: { x: 291, y: 208, w: 116, h: 24 },
  valRealName: { x: 415, y: 205, w: 315, h: 32 },
  labelNationality: { x: 290, y: 257, w: 148, h: 24 },
  valNationality: { x: 441, y: 252, w: 282, h: 32 },
  labelStatus: { x: 291, y: 308, w: 85, h: 24 },
  valStatus: { x: 379, y: 304, w: 259, h: 31 },
  labelGenre: { x: 290, y: 357, w: 172, h: 24 },
  valGenre: { x: 470, y: 354, w: 261, h: 31 },
  labelQuote: { x: 290, y: 406, w: 100, h: 24 },
  valQuote1: { x: 398, y: 406, w: 545, h: 25 },
  valQuote2: { x: 400, y: 450, w: 543, h: 25 },
};

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
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return canvas.toDataURL("image/png");
}

function quoteFontSize(text, width) {
  if (!text) return 21;
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return 8;
  for (let size = 21; size >= 4; size -= 0.25) {
    context.font = `${size}px "Noto Serif", serif`;
    if (context.measureText(text).width <= width) return size;
  }
  return 4;
}

export default function OtakuCard({ profile }) {
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);
  const stageRef = useRef(null);
  const photoPickerButtonRef = useRef(null);
  const cropDialogRef = useRef(null);
  const [photoPickerTarget, setPhotoPickerTarget] = useState(null);

  const [photo, setPhoto] = useState(null);
  const [tempPhoto, setTempPhoto] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [downloadState, setDownloadState] = useState("idle");
  const [previewScale, setPreviewScale] = useState(1);

  const [layout] = useState(INITIAL_LAYOUT);

  useEffect(() => {
    setPhotoPickerTarget(document.getElementById("profile-photo-picker-slot"));
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setPreviewScale(Math.min(1, entry.contentRect.width / CARD_WIDTH));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current || downloadState === "loading") return;
    setDownloadState("loading");
    try {
      const { default: html2canvas } = await import("html2canvas");
      // Pour l'export, on s'assure que le rendu est fait à la taille réelle 957x536
      const canvas = await html2canvas(cardRef.current, {
        scale: 1, // On utilise scale 1 car les dimensions 957x536 sont déjà les dimensions cibles à 300DPI
        useCORS: true,
        backgroundColor: null,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        onclone: (_, clonedCard) => {
          clonedCard.style.transform = "none";
          // Forcer les dimensions sur le clone pour html2canvas
          const artboard = clonedCard.querySelector('.card-artboard');
          if (artboard) {
            artboard.style.transform = "none";
            artboard.style.width = `${CARD_WIDTH}px`;
            artboard.style.height = `${CARD_HEIGHT}px`;
          }
        },
      });
      const link = document.createElement("a");
      link.download = `carte-otaku-${profile.username || 'member'}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setDownloadState("success");
    } catch (err) {
      console.error("Download error:", err);
      setDownloadState("error");
    }
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setPhotoError("Choisis un fichier image valide.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("L’image doit faire 5 Mo ou moins.");
      event.target.value = "";
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onload = (resultEvent) => {
      setTempPhoto(resultEvent.target.result);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCropMode(true);
    };
    reader.onerror = () =>
      setPhotoError(
        "Cette image n’a pas pu être ouverte. Essaie un autre fichier.",
      );
    reader.readAsDataURL(file);
    event.target.value = "";
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

  const handleCancelCrop = useCallback(() => {
    setTempPhoto(null);
    setCropMode(false);
  }, []);

  useEffect(() => {
    if (!cropMode) return undefined;

    const dialog = cropDialogRef.current;
    const returnFocus = photoPickerButtonRef.current;
    const getFocusable = () =>
      [...dialog.querySelectorAll('button, input, [tabindex="0"]')].filter(
        (element) => !element.disabled,
      );
    getFocusable()[0]?.focus();

    const handleDialogKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCancelCrop();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      returnFocus?.focus();
    };
  }, [cropMode, handleCancelCrop]);

  return (
    <div className="flex flex-col items-center mt-6 w-full">
      <div
        className="card-stage"
        ref={stageRef}
        style={{ height: `${CARD_HEIGHT * previewScale}px` }}
      >
        <div
          ref={cardRef}
          className="relative w-[957px] h-[536px] bg-white shadow-xl rounded-lg overflow-hidden card-artboard"
          style={{
            WebkitPrintColorAdjust: "exact",
            transform: `scale(${previewScale})`,
          }}
        >
          {/* fond dynamique */}
          <img
            src={templates[profile.color] || templates.blue}
            alt="Carte"
            className="absolute inset-0 w-full h-full object-cover select-none"
            draggable="false"
          />

          {/* Emplacement de la Photo du personnage : X: 0.3cm (35px), Y: 1.25cm (148px), L: 2.11cm (249px), H: 2.72cm (321px) */}
          <div
            aria-label="Photo de profil"
            className="absolute flex items-center justify-center text-white text-center text-[14px] font-semibold overflow-hidden card-photo-button"
            style={{
              position: "absolute",
              top: `${layout.photo.y}px`,
              left: `${layout.photo.x}px`,
              width: `${layout.photo.w}px`,
              height: `${layout.photo.h}px`,
              backgroundColor: "transparent",
              pointerEvents: "none",
            }}
          >
            {!cropMode && photo && (
              <img
                src={photo}
                alt="Profil"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}

            {!cropMode && !photo && (
              <span style={{ padding: 8, color: 'transparent' }}>
                Cliquez pour ajouter une photo
              </span>
            )}
          </div>

          {/* QR Code WhatsApp facultatif : X: 6.17cm (729px), Y: 1.24cm (146px), L: 1.3cm (154px), H: 1.3cm (154px) */}
          {profile.hasWhatsappQr && profile.whatsappNumber && (
            <div
              style={{
                position: "absolute",
                top: `${layout.qr.y}px`,
                left: `${layout.qr.x}px`,
                width: `${layout.qr.w}px`,
                height: `${layout.qr.h}px`,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
                padding: "4px"
              }}
            >
              <QRCodeSVG
                value={`https://wa.me/${profile.whatsappNumber.replace(/[^0-9+]/g, '')}`}
                size={146}
                level="M"
              />
            </div>
          )}

          {/* Identifiant unique : disposition validée */}
          <div
            className="font-backfired text-black uppercase"
            style={{
              position: "absolute",
              top: `${layout.cardId.y}px`,
              left: `${layout.cardId.x}px`,
              width: `${layout.cardId.w}px`,
              height: `${layout.cardId.h}px`,
              fontSize: "22px",
              transform: "scaleY(0.96)",
              transformOrigin: "top left",
              zIndex: 10,
              whiteSpace: "nowrap"
            }}
          >
            {profile.cardNumber || "HUNTER 000001"}
          </div>

          {/* Textes et Profils Noto Serif */}
          <div
            className="font-noto-serif text-black"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              fontSize: "14px",
              transform: "scaleY(0.96)",
              transformOrigin: "top left"
            }}
          >
            {/* Libellés fixes (X: 2.46cm = 290px) */}
            <div style={{ position: "absolute", top: `${layout.labelUsername.y}px`, left: `${layout.labelUsername.x}px`, fontSize: "20px" }}>NOM D’UTILISATEUR :</div>
            <div style={{ position: "absolute", top: `${layout.labelRealName.y}px`, left: `${layout.labelRealName.x}px`, fontSize: "20px" }}>NOM RÉEL :</div>
            <div style={{ position: "absolute", top: `${layout.labelNationality.y}px`, left: `${layout.labelNationality.x}px`, fontSize: "20px" }}>NATIONALITÉ :</div>
            <div style={{ position: "absolute", top: `${layout.labelStatus.y}px`, left: `${layout.labelStatus.x}px`, fontSize: "20px" }}>STATUT :</div>
            <div style={{ position: "absolute", top: `${layout.labelGenre.y}px`, left: `${layout.labelGenre.x}px`, fontSize: "20px" }}>GENRE PRÉFÉRÉ :</div>
            <div style={{ position: "absolute", top: `${layout.labelQuote.y}px`, left: `${layout.labelQuote.x}px`, fontSize: "19px" }}>CITATION :</div>

            {/* NOM D'UTILISATEUR - Valeur : X: 4.64cm (548px), Y: 1.33cm (157px) */}
            <div style={{ position: "absolute", top: `${layout.valUsername.y}px`, left: `${layout.valUsername.x}px`, width: `${layout.valUsername.w}px`, height: `${layout.valUsername.h}px`, overflow: "hidden", whiteSpace: "nowrap", fontSize: "23px" }}>
              {profile.username}
            </div>

            {/* NOM RÉEL - Valeur : X: 3.64cm (430px), Y: 1.78cm (210px) */}
            <div style={{ position: "absolute", top: `${layout.valRealName.y}px`, left: `${layout.valRealName.x}px`, width: `${layout.valRealName.w}px`, height: `${layout.valRealName.h}px`, overflow: "hidden", whiteSpace: "nowrap", fontSize: "23px" }}>
              {profile.realName}
            </div>

            {/* NATIONALITÉ - Valeur : X: 3.98cm (470px), Y: 2.18cm (257px) */}
            <div style={{ position: "absolute", top: `${layout.valNationality.y}px`, left: `${layout.valNationality.x}px`, width: `${layout.valNationality.w}px`, height: `${layout.valNationality.h}px`, overflow: "hidden", whiteSpace: "nowrap", fontSize: "23px" }}>
              {profile.nationality}
            </div>

            {/* STATUT - Valeur : X: 3.32cm (392px), Y: 2.61cm (308px) */}
            <div style={{ position: "absolute", top: `${layout.valStatus.y}px`, left: `${layout.valStatus.x}px`, width: `${layout.valStatus.w}px`, height: `${layout.valStatus.h}px`, overflow: "hidden", whiteSpace: "nowrap", fontSize: "23px" }}>
              {profile.status}
            </div>

            {/* GENRE PRÉFÉRÉ - Valeur : X: 4.2cm (496px), Y: 3.02cm (357px) */}
            <div style={{ position: "absolute", top: `${layout.valGenre.y}px`, left: `${layout.valGenre.x}px`, width: `${layout.valGenre.w}px`, height: `${layout.valGenre.h}px`, overflow: "hidden", whiteSpace: "nowrap", fontSize: "23px" }}>
              {profile.genre}
            </div>

            {/* CITATION LIGNE 1 : X: 4.57cm (540px), Y: 3.44cm (406px) */}
            <div style={{ position: "absolute", top: `${layout.valQuote1.y}px`, left: `${layout.valQuote1.x}px`, width: `${layout.valQuote1.w}px`, height: `${layout.valQuote1.h}px`, overflow: "hidden", whiteSpace: "nowrap", fontSize: `${quoteFontSize(profile.quote1 || "", layout.valQuote1.w)}px` }}>
              {profile.quote1}
            </div>

            {/* CITATION LIGNE 2 : X: 540px, Y: 439px, L: 380px */}
            <div style={{ position: "absolute", top: `${layout.valQuote2.y}px`, left: `${layout.valQuote2.x}px`, width: `${layout.valQuote2.w}px`, height: `${layout.valQuote2.h}px`, overflow: "hidden", whiteSpace: "nowrap", fontSize: `${quoteFontSize(profile.quote2 || "", layout.valQuote2.w)}px` }}>
              {profile.quote2}
            </div>
          </div>
        </div>
      </div>

      {cropMode && tempPhoto && (
        <div className="crop-dialog-backdrop">
          <section
            ref={cropDialogRef}
            aria-labelledby="crop-dialog-title"
            aria-describedby="crop-dialog-description"
            aria-modal="true"
            className="crop-dialog"
            role="dialog"
          >
            <div className="crop-dialog-heading">
              <div>
                <h2 id="crop-dialog-title">Recadre ta photo</h2>
                <p id="crop-dialog-description">
                  Fais glisser l’image et ajuste le zoom.
                </p>
              </div>
              <span className="step-index">3:4</span>
            </div>
            <div className="cropper-frame">
              <Cropper
                image={tempPhoto}
                crop={crop}
                zoom={zoom}
                aspect={253 / 315}
                cropShape="rect"
                showGrid={true}
                onCropChange={setCrop}
                onZoomChange={(value) => setZoom(Number(value))}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="crop-zoom-label" htmlFor="photo-zoom">
              Zoom
            </label>
            <input
              aria-label="Zoom de la photo"
              className="crop-zoom"
              id="photo-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(parseFloat(event.target.value))}
            />
            <div className="crop-dialog-actions">
              <button
                className="button-secondary"
                onClick={handleCancelCrop}
                type="button"
              >
                Annuler
              </button>
              <button
                className="button-primary"
                onClick={handleCropConfirm}
                type="button"
              >
                Valider le recadrage
              </button>
            </div>
          </section>
        </div>
      )}

      {photoError && (
        <p className="form-message is-error" role="alert">
          {photoError}
        </p>
      )}

      {/* bouton de téléchargement */}
      <button
        disabled={downloadState === "loading"}
        onClick={handleDownload}
        className="mt-7 px-10 py-4 bg-blue-600 text-white text-[18px] font-semibold rounded-xl hover:bg-blue-700 transition button-primary"
      >
        {downloadState === "loading" ? "Préparation…" : "Télécharger ma carte"}
      </button>
      {downloadState === "success" && (
        <p className="form-message is-success" role="status">
          Ta carte a été téléchargée.
        </p>
      )}
      {downloadState === "error" && (
        <p className="form-message is-error" role="alert">
          Le téléchargement a échoué. Réessaie dans un instant.
        </p>
      )}
      {photoPickerTarget && createPortal(
        <section className="profile-photo-picker" aria-labelledby="profile-photo-title">
          <div>
            <h3 id="profile-photo-title">Photo / Avatar</h3>
            <p>Ajoute une image pour personnaliser ta carte (PNG, JPG ou WEBP, 5 Mo max.).</p>
          </div>
          <input
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp"
            aria-label="Choisir une photo de profil"
            className="photo-file-input"
            onChange={handlePhotoChange}
            type="file"
          />
          <button
            ref={photoPickerButtonRef}
            type="button"
            className="button-primary photo-picker-button"
            onClick={handlePhotoClick}
          >
            ↑ &nbsp; {photo ? "Changer ma photo" : "Ajouter une photo"}
          </button>
          {photo && <span className="photo-selected-status" role="status">Photo sélectionnée ✓</span>}
        </section>,
        photoPickerTarget,
      )}
    </div>
  );
}
