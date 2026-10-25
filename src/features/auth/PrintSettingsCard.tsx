import { useState } from 'react';
import { Check, Copy, Printer } from 'lucide-react';
import { PrintPortal, printTicket, usePrintSettings, type PaperWidth } from '@/lib/print';
import { ReceiptTicket } from '@/features/pos/tickets';
import type { Order } from '@/features/pos/types';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SHORTCUTS = [
  {
    id: 'caisse',
    title: 'Caisse (ticket client → Epson)',
    command: `"${CHROME}" --kiosk-printing --user-data-dir="C:\\Osumbice\\caisse" --app=https://osumbice.com/tables`,
  },
  {
    id: 'cuisine',
    title: 'Cuisine (bon de cuisine → Xprinter)',
    command: `"${CHROME}" --kiosk-printing --user-data-dir="C:\\Osumbice\\cuisine" --app=https://osumbice.com/kitchen`,
  },
];

// Commande fictive pour le ticket de test
const SAMPLE_ORDER: Order = {
  id: 'test0000-0000-0000-0000-000000000000',
  status: 'PAYEE',
  tableId: null,
  table: null,
  customerId: null,
  subtotal: '6000',
  discount: '0',
  tax: '0',
  total: '6000',
  items: [
    { id: 'a', productId: 'a', quantity: 2, unitPrice: '2500', note: null, product: { name: 'Plat du jour' } },
    { id: 'b', productId: 'b', quantity: 1, unitPrice: '1000', note: null, product: { name: 'Boisson' } },
  ],
  payments: [{ id: 'p', method: 'CASH', amount: '6000', createdAt: new Date().toISOString() }],
  establishment: { name: 'TICKET DE TEST', address: 'Osumbice — impression OK', logo: null },
  updatedAt: new Date().toISOString(),
};

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papiers refusé : le texte reste sélectionnable à la main
    }
  };
  return (
    <div className="flex items-start gap-2 rounded-md bg-slate-100 p-2">
      <code className="min-w-0 flex-1 select-all break-all font-mono text-xs text-slate-700">{text}</code>
      <button type="button" onClick={copy} className="btn btn-secondary btn-sm shrink-0" aria-label="Copier la commande">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copié' : 'Copier'}
      </button>
    </div>
  );
}

export default function PrintSettingsCard() {
  const { settings, update } = usePrintSettings();
  const [printingTest, setPrintingTest] = useState(false);

  const printTest = async () => {
    setPrintingTest(true);
    await printTicket();
    setPrintingTest(false);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-surface p-6">
      <h2 className="mb-1 text-sm font-semibold text-heading-muted">Impression des tickets</h2>
      <p className="mb-4 text-xs text-slate-500">
        Réglages propres à cet appareil : la caisse et la cuisine se règlent chacune sur leur poste.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="paper-width" className="mb-1 block text-sm font-medium text-slate-700">
            Largeur du papier
          </label>
          <select
            id="paper-width"
            value={settings.paperWidth}
            onChange={(e) => update({ paperWidth: Number(e.target.value) as PaperWidth })}
            className="input w-full sm:w-64"
          >
            <option value={80}>80 mm (rouleaux 80 × 80)</option>
            <option value={58}>58 mm (rouleaux 57 × 40)</option>
          </select>
        </div>

        <div>
          <label htmlFor="width-reduction" className="mb-1 block text-sm font-medium text-slate-700">
            Ajuster la largeur imprimée
          </label>
          <select
            id="width-reduction"
            value={settings.widthReductionMm ?? 0}
            onChange={(e) => update({ widthReductionMm: Number(e.target.value) })}
            className="input w-full sm:w-64"
          >
            <option value={0}>Normale</option>
            <option value={4}>Réduite de 4 mm</option>
            <option value={8}>Réduite de 8 mm (imprimantes 64 mm)</option>
            <option value={12}>Réduite de 12 mm</option>
            <option value={16}>Réduite de 16 mm</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Si les montants à droite sont coupés à l’impression, réduisez la largeur puis imprimez un ticket de test.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={settings.autoPrintReceipt}
            onChange={(e) => update({ autoPrintReceipt: e.target.checked })}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium text-slate-700">Imprimer le ticket client après chaque encaissement</span>
            <span className="block text-xs text-slate-500">À activer sur le poste de caisse uniquement.</span>
          </span>
        </label>

        <p className="text-xs text-slate-500">
          Bons de cuisine : l’impression automatique s’active depuis l’écran <strong>Cuisine</strong>, sur le poste de la
          cuisine.
        </p>

        <button type="button" onClick={printTest} aria-busy={printingTest} className="btn btn-secondary">
          {!printingTest && <Printer size={16} />}
          Imprimer un ticket de test
        </button>
      </div>

      <details className="mt-6 rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-heading">
          Installer l’impression sans fenêtre (PC Windows)
        </summary>
        <ol className="mt-3 list-decimal space-y-3 pl-5">
          <li>
            Installez les <strong>pilotes Windows</strong> de vos imprimantes (Epson, Xprinter) et imprimez une page de test
            depuis Windows.
          </li>
          <li>
            <strong>Tiroir-caisse</strong> (branché sur l’Epson) : Windows &gt; Imprimantes &gt; Epson &gt; Options
            d’impression, réglez le tiroir sur <em>« Ouvrir après impression »</em>.
          </li>
          <li>
            Créez un raccourci par poste (clic droit sur le Bureau &gt; Nouveau &gt; Raccourci) et collez la commande :
            <div className="mt-2 space-y-3">
              {SHORTCUTS.map((s) => (
                <div key={s.id}>
                  <p className="mb-1 text-xs font-semibold text-slate-700">{s.title}</p>
                  <CopyLine text={s.command} />
                </div>
              ))}
            </div>
          </li>
          <li>
            <strong>Choisir l’imprimante de chaque raccourci (une seule fois)</strong> : ouvrez le raccourci, retirez
            temporairement <code>--kiosk-printing</code> de sa cible, connectez-vous, puis cliquez sur « Imprimer un ticket
            de test ». Dans la fenêtre, choisissez l’imprimante, <em>Marges : aucune</em>, décochez{' '}
            <em>En-têtes et pieds de page</em>, puis imprimez. Chrome retient ces choix pour ce raccourci. Remettez ensuite{' '}
            <code>--kiosk-printing</code>.
          </li>
          <li>Fermez toutes les fenêtres de ce raccourci, puis rouvrez-le : les tickets partent désormais sans fenêtre.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Le tiroir s’ouvre à chaque ticket imprimé sur l’Epson, y compris les réimpressions. Pour l’ouvrir uniquement
          sur les paiements en espèces, il faudra l’application Windows Osumbice.
        </p>
      </details>

      {/* Ticket de test, invisible à l'écran */}
      <PrintPortal>
        <ReceiptTicket order={SAMPLE_ORDER} paperWidth={settings.paperWidth} />
      </PrintPortal>
    </div>
  );
}
