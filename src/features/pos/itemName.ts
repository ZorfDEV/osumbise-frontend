// Nom d'une ligne de commande, avec l'accompagnement choisi (inclus dans le
// prix du plat) : « Poisson braisé + Riz ». Panier, factures, bons de cuisine.
export const itemName = (item: { product: { name: string }; sideProduct?: { name: string } | null }) =>
  item.sideProduct ? `${item.product.name} + ${item.sideProduct.name}` : item.product.name;
