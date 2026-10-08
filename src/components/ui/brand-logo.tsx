import logoColor from '@/assets/img/loo.png';
import logoWhite from '@/assets/img/logoblanc.png';

// Logo complet "Osumbice POS" : version couleur en mode clair, version
// blanche en mode sombre. La bascule se fait en CSS (classe .dark sur
// <html>), sans attendre React, donc sans clignotement au chargement.
export default function BrandLogo({ className = 'h-8' }: { className?: string }) {
  return (
    <>
      <img src={logoColor} alt="Osumbice" className={`${className} w-auto dark:hidden`} />
      <img src={logoWhite} alt="Osumbice" className={`${className} hidden w-auto dark:block`} />
    </>
  );
}

// Logo réduit (le "O" et ses bulles), repris de src/assets/img/logo-réduit.svg.
// Dessiné en currentColor : vert de la charte #4A6B5D en clair, blanc en
// sombre par défaut ; une classe text-* passée en className prend le dessus.
export function BrandMark({ className = 'h-8 w-8', title = 'Osumbice' }: { className?: string; title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="72.8 23.8 283.4 283.4"
      // title vide : purement décoratif (un texte voisin nomme déjà la marque)
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
      className={`shrink-0 text-action dark:text-white ${className}`}
    >
      <g fill="currentColor">
        <path
          fillRule="evenodd"
          d="M249.62 83.93A108 108 0 1 0 293.44 116.67A27.4 27.4 0 0 1 249.62 83.93ZM161 184a48 48 0 1 0 96 0a48 48 0 1 0 -96 0Z"
        />
        <circle cx="272.5" cy="99" r="20" />
        <circle cx="293" cy="52" r="13" />
        <circle cx="317" cy="94.5" r="9.5" />
      </g>
    </svg>
  );
}
