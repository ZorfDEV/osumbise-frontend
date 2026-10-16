import { createLucideIcon } from 'lucide-react';

// Icônes absentes de Lucide, dessinées dans son style (grille 24 px, trait
// currentColor) : elles s'utilisent exactement comme les icônes Lucide
// (size, strokeWidth, className) et partout où un LucideIcon est attendu.

// Table de restaurant vue de dessus, avec ses quatre chaises — comme sur un
// plan de salle. (L'icône "Table" de Lucide représente un tableau de données.)
export const DiningTableIcon = createLucideIcon('DiningTable', [
  ['circle', { cx: '12', cy: '12', r: '4.5', key: 'top' }],
  ['rect', { x: '9.5', y: '1.75', width: '5', height: '2.75', rx: '1', key: 'chair-n' }],
  ['rect', { x: '9.5', y: '19.5', width: '5', height: '2.75', rx: '1', key: 'chair-s' }],
  ['rect', { x: '1.75', y: '9.5', width: '2.75', height: '5', rx: '1', key: 'chair-w' }],
  ['rect', { x: '19.5', y: '9.5', width: '2.75', height: '5', rx: '1', key: 'chair-e' }],
]);
