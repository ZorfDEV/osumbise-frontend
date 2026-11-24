// Thème appliqué avant le premier rendu (même logique que src/lib/theme.ts).
// Fichier à part, et non script dans la page : la politique de sécurité (CSP, voir
// render.yaml du backend) n'autorise que les scripts servis par le site.
(function () {
  try {
    var pref = localStorage.getItem('osumbise:theme') || 'light';
    var dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
