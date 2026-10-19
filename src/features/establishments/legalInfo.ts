// Mentions légales facultatives d'un établissement, imprimées en tête des
// factures et reçus, juste sous le logo et le nom. Seules les valeurs
// renseignées apparaissent.
export interface LegalInfo {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  postalBox?: string | null;
  nif?: string | null;
  rc?: string | null;
}

// « BP 1234 Libreville » : le préfixe n'est ajouté que s'il manque
const withBp = (value: string) => (/^b\.?\s?p\b/i.test(value) ? value : `BP ${value}`);

export const legalLines = (e: LegalInfo): string[] => {
  const contact = [e.postalBox && withBp(e.postalBox), e.phone && `Tél. ${e.phone}`].filter(Boolean).join(' · ');
  const email = e.email ? e.email : '';
  const ids = [e.nif && `NIF : ${e.nif}`, e.rc && `RC : ${e.rc}`].filter(Boolean).join(' · ');
  return [e.address ?? '', contact, email, ids].filter((line) => line.trim().length > 0);
};
