import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import defaultTheme from 'tailwindcss/defaultTheme';

// Couleur pilotée par une variable CSS "R G B" (src/index.css) : la valeur
// change en mode sombre tout en gardant les modificateurs d'opacité (/30…).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  // Mode sombre piloté par la classe .dark sur <html> (cf. src/lib/theme.ts)
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Neutres : l'échelle slate est redéfinie par variables pour s'inverser
        // en mode sombre (slate-50 = fond de page, slate-900 = texte fort).
        slate: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, v(`slate-${k}`)])
        ),
        // Surface des cartes, champs, barres. À utiliser à la place de bg-white
        // (blanc en clair, gris-vert profond en sombre). `white` reste blanc pur
        // pour le texte sur fond vert.
        surface: v('surface'),
        // Charte graphique Osumbice (v2) — vert sauge #618373 ancré à 600,
        // sa teinte de survol officielle #4A6B5D ancrée à 700, et le fond
        // liens-boutons/widgets officiel #E8F2EF ancré à 50. Les teintes
        // intermédiaires sont interpolées pour une progression régulière.
        primary: {
          DEFAULT: '#618373',
          foreground: '#FFFFFF',
          // 50-200 (fonds doux) et 700-900 (texte sur fond doux) s'adaptent au
          // mode sombre ; 300-600 et 950 restent fixes (600 = couleur de marque).
          50: v('primary-50'), // #E8F2EF
          100: v('primary-100'), // #D5E2DE
          200: v('primary-200'), // #BDCEC7
          300: '#A4BAB1',
          400: '#8AA498',
          500: '#749384',
          600: '#618373',
          700: v('primary-700'), // #4A6B5D
          800: v('primary-800'), // #3A5349
          900: v('primary-900'), // #2B3E36
          950: '#1F2D27',
        },
        // Fond des actions avec texte blanc (boutons principaux, onglet ou
        // menu actif, puces sélectionnées). #618373 n'offre que 4.2:1 avec du
        // texte blanc de taille normale, sous le seuil WCAG AA (4.5:1) : on
        // utilise donc la teinte de survol officielle de la charte #4A6B5D
        // (5.9:1), et on assombrit d'un cran au survol / clic. Valeurs fixes,
        // identiques en mode clair et sombre.
        action: {
          DEFAULT: '#4A6B5D',
          hover: '#3A5349',
          active: '#2B3E36',
        },
        // Avertissement — fond #FDE588 (charte, inchangé). Le #FCC024 de la
        // charte ("texte d'avertissement") n'offre que ~1.6:1 de contraste
        // sur blanc — illisible comme texte — donc il est conservé tel quel
        // comme `warning-accent` (icône/pastille non-textuelle) et le texte
        // utilise une version assombrie de la même teinte, lisible à l'écran.
        warning: {
          DEFAULT: v('warning'), // #836413
          dark: v('warning-dark'), // #58430D
          soft: v('warning-soft'), // #FDE588
          accent: '#FCC024',
        },
        // Erreur / suppression — fond #F46C73, texte/icône/bouton #DD2628 (charte).
        danger: {
          DEFAULT: v('danger'), // #DD2628 (fond plein : .btn-danger, fixe)
          dark: v('danger-dark'), // #580F10
          soft: v('danger-soft'), // #F46C73
        },
        // Succès / état validé (payé, reçu, actif, table libre) — émeraude
        // de la même famille que le vert sauge (teinte ~154°) mais plus
        // saturé, pour ne pas confondre "validé" avec la couleur de marque
        // (réservée aux actions et à la navigation).
        // Convention badges/bandeaux : bg-*-soft + text-*-dark.
        success: {
          DEFAULT: v('success'), // #1B7F53 texte/icône sur blanc — 5.0:1
          dark: v('success-dark'), // #0F4D31 texte sur success-soft — 8.5:1
          soft: v('success-soft'), // #DFF3E8
          accent: '#34B37A', // pastille/icône non-textuelle uniquement
        },
        // Information / état neutre en cours (en préparation, addition
        // demandée, toast info) — bleu ardoise désaturé (teinte ~205°),
        // complémentaire froid du vert sauge.
        info: {
          DEFAULT: v('info'), // #2F6F93 texte/icône sur blanc — 5.5:1
          dark: v('info-dark'), // #1D4A63 texte sur info-soft — 8.1:1
          soft: v('info-soft'), // #E3EFF6
          accent: '#5B9BC4', // pastille/icône non-textuelle uniquement
        },
        // Titres — h1 #131414, h2 #646665 (charte).
        heading: {
          DEFAULT: v('heading'), // #131414
          muted: v('heading-muted'), // #646665
        },
        // Texte sur une surface de couleur principale (boutons pleins, hero,
        // cartes vertes) — titre blanc, paragraphe #EDF2F0 (charte).
        'on-primary': {
          DEFAULT: '#FFFFFF',
          soft: '#EDF2F0',
        },
        // Tokens standards shadcn/ui — pilotés par les variables CSS
        // définies dans src/index.css (:root). Nécessaires pour que les
        // composants générés par `npx shadcn add ...` et les classes
        // utilitaires de base (`border-border`, `bg-background`, etc.)
        // fonctionnent, sans toucher à la charte Osumbice ci-dessus.
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
