import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Impression des tickets (option "navigateur") : reçu client et bon de
// cuisine sur imprimante thermique (ESC/POS, pilote Windows installé).
//
// Sans fenêtre d'impression : lancer Chrome/Edge avec --kiosk-printing (voir
// Paramètres > Impression). Chaque raccourci peut avoir son propre profil
// (--user-data-dir) qui retient sa propre imprimante : caisse → Epson,
// cuisine → Xprinter, même sur un seul PC.

export type PaperWidth = 80 | 58;

export interface PrintSettings {
  paperWidth: PaperWidth;
  // Ticket client imprimé automatiquement après chaque encaissement
  autoPrintReceipt: boolean;
  // Bon de cuisine imprimé automatiquement par l'écran Cuisine de ce poste
  autoPrintKitchen: boolean;
  // Réduction de la largeur imprimée (mm) : certaines imprimantes 80 mm
  // n'impriment que 64 mm, la droite du ticket (montants) serait coupée
  widthReductionMm: number;
}

const SETTINGS_KEY = 'osumbise:print';
const CHANGE_EVENT = 'osumbise:print-change';
const DEFAULTS: PrintSettings = { paperWidth: 80, autoPrintReceipt: false, autoPrintKitchen: false, widthReductionMm: 0 };

// Zone imprimable réelle : environ 72 mm sur un rouleau de 80 mm, 48 mm sur 58 mm
export const PRINTABLE_WIDTH_MM: Record<PaperWidth, number> = { 80: 72, 58: 48 };

// Largeur réelle du ticket : zone imprimable du papier, moins la réduction
// choisie sur ce poste (Paramètres > Impression des tickets)
export const ticketWidthMm = (paperWidth: PaperWidth) =>
  Math.max(36, PRINTABLE_WIDTH_MM[paperWidth] - (Number(readPrintSettings().widthReductionMm) || 0));

export const readPrintSettings = (): PrintSettings => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
};

// Réglages propres à CE poste (navigateur) : la caisse et la cuisine n'ont pas
// la même imprimante ni les mêmes impressions automatiques.
export const usePrintSettings = () => {
  const [settings, setSettings] = useState<PrintSettings>(readPrintSettings);

  useEffect(() => {
    const onChange = () => setSettings(readPrintSettings());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const update = useCallback((patch: Partial<PrintSettings>) => {
    const next = { ...readPrintSettings(), ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // stockage indisponible : réglage valable pour cette session seulement
    }
    setSettings(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { settings, update };
};

// --- Zone d'impression isolée -------------------------------------------
// Le ticket est rendu dans #print-root, hors de l'application. Pendant
// l'impression, la classe body.printing-ticket masque tout le reste : seule
// la largeur du ticket part à l'imprimante, quelle que soit la page.

const getPrintRoot = () => {
  let root = document.getElementById('print-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'print-root';
    document.body.appendChild(root);
  }
  return root;
};

export function PrintPortal({ children }: { children: ReactNode }) {
  return createPortal(children, getPrintRoot());
}

// Attend que les images du ticket (logo) soient chargées, 3 s au plus : sinon
// l'impression automatique pourrait partir sans le logo. Une image en erreur
// ne bloque pas l'impression.
const waitForImages = (timeoutMs = 3000) => {
  const images = Array.from(getPrintRoot().querySelectorAll('img'));
  const pending = images
    .filter((img) => !img.complete)
    .map((img) => new Promise<void>((done) => {
      img.addEventListener('load', () => done(), { once: true });
      img.addEventListener('error', () => done(), { once: true });
    }));
  return Promise.race([Promise.all(pending), new Promise((done) => setTimeout(done, timeoutMs))]);
};

// Lance l'impression du contenu de #print-root, une fois React à jour.
// En mode --kiosk-printing, window.print() part directement à l'imprimante.
let printing: Promise<void> = Promise.resolve();
export const printTicket = (): Promise<void> => {
  // File d'attente : deux bons qui arrivent en même temps sortent l'un après l'autre
  printing = printing.then(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(async () => {
            await waitForImages();
            document.body.classList.add('printing-ticket');
            const done = () => {
              document.body.classList.remove('printing-ticket');
              window.removeEventListener('afterprint', done);
              resolve();
            };
            window.addEventListener('afterprint', done);
            window.print();
            // Certains navigateurs n'émettent pas afterprint en mode kiosque
            setTimeout(done, 1500);
          })
        );
      })
  );
  return printing;
};

// --- Mémoire des bons de cuisine imprimés -------------------------------
// Par commande : quantités déjà envoyées en cuisine, article par article.
// Permet d'imprimer un bon "AJOUT" ne contenant que les nouveautés, et de ne
// jamais réimprimer un bon après un rechargement de page.

const KITCHEN_KEY = 'osumbise:kitchen-printed';
const KITCHEN_MAX_ORDERS = 300;
export type PrintedSnapshot = Record<string, Record<string, number>>; // orderId -> itemId -> qté

export const readKitchenPrinted = (): PrintedSnapshot => {
  try {
    return JSON.parse(localStorage.getItem(KITCHEN_KEY) ?? '{}');
  } catch {
    return {};
  }
};

export const writeKitchenPrinted = (snapshot: PrintedSnapshot) => {
  // On ne garde que les commandes les plus récentes (ordre d'insertion)
  const entries = Object.entries(snapshot);
  const trimmed = Object.fromEntries(entries.slice(Math.max(0, entries.length - KITCHEN_MAX_ORDERS)));
  try {
    localStorage.setItem(KITCHEN_KEY, JSON.stringify(trimmed));
  } catch {
    // stockage indisponible : risque de réimpression après rechargement
  }
};
