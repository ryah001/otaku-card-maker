export const INITIAL_LAYOUT = {
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

export function normalizeCardLayout(candidate) {
  return Object.fromEntries(
    Object.entries(INITIAL_LAYOUT).map(([key, fallback]) => {
      const input = candidate?.[key] ?? {};
      const x = Math.min(956, Math.max(0, Number.isFinite(Number(input.x)) ? Number(input.x) : fallback.x));
      const y = Math.min(535, Math.max(0, Number.isFinite(Number(input.y)) ? Number(input.y) : fallback.y));
      const w = Math.min(957 - x, Math.max(1, Number.isFinite(Number(input.w)) ? Number(input.w) : fallback.w));
      const h = Math.min(536 - y, Math.max(1, Number.isFinite(Number(input.h)) ? Number(input.h) : fallback.h));
      return [key, { x, y, w, h }];
    }),
  );
}
