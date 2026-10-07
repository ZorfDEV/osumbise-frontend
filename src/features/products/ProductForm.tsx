import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Category } from './types';

const productFormSchema = z
  .object({
    categoryId: z.string().uuid('Choisis une catégorie'),
    name: z.string().min(2, 'Le nom est requis'),
    sellingPrice: z.number().nonnegative(),
    cost: z.number().nonnegative().optional(),
    unit: z.enum(['UNIT', 'G', 'KG', 'ML', 'CL', 'L']),
    stockMin: z.number().nonnegative().optional(),
    // null efface une remise existante (input vidé -> valueAsNumber donne NaN)
    tag: z.preprocess(
      (v) => (typeof v === 'number' && Number.isNaN(v) ? null : v),
      z.number().min(0, 'Entre 0 et 100').max(100, 'Entre 0 et 100').nullable().optional()
    ),
    // Sans ces deux dates, la remise s'applique tant que "tag" est renseigné
    tagStartsAt: z.preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z.string().nullable().optional()
    ),
    tagEndsAt: z.preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z.string().nullable().optional()
    ),
    type: z
      .enum(['VEGETARIEN', 'SANS_SUCRE', 'ALCOOLISE', 'MUSULMAN'])
      .optional()
      .or(z.literal(''))
      .transform((value) => (value === '' ? undefined : value)),
  })
  .refine((data) => !data.tagStartsAt || !data.tagEndsAt || data.tagStartsAt <= data.tagEndsAt, {
    message: 'Doit être postérieure à la date de début',
    path: ['tagEndsAt'],
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  VEGETARIEN: 'Végétarien',
  SANS_SUCRE: 'Sans sucre',
  ALCOOLISE: 'Alcoolisé',
  MUSULMAN: 'Musulman (halal)',
};

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg'];
const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1 Mo

interface Props {
  categories: Category[];
  defaultValues?: Partial<ProductFormValues>;
  currentImageUrl?: string;
  submitLabel: string;
  onSubmit: (data: ProductFormValues, imageFile: File | null) => Promise<void>;
  onCancel?: () => void;
}

export default function ProductForm({
  categories,
  defaultValues,
  currentImageUrl,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { unit: 'UNIT', ...defaultValues },
  });

  const name = watch('name');
  const tagField = register('tag', { valueAsNumber: true });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImageUrl);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImageError(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Format non supporté : png ou jpg uniquement');
      setImageFile(null);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('L’image ne doit pas dépasser 1 Mo');
      setImageFile(null);
      e.target.value = '';
      return;
    }
    setImageError(null);
    setImageFile(file);
  };

  const submit = handleSubmit((data) => onSubmit(data, imageFile));

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-surface p-6 sm:grid-cols-3"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
        <input
          {...register('name')}
          className="input w-full"
        />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
        <select
          {...register('categoryId')}
          className="input w-full"
        >
          <option value="">— Choisir —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-xs text-danger">{errors.categoryId.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Unité</label>
        <select
          {...register('unit')}
          className="input w-full"
        >
          <option value="UNIT">Unité</option>
          <option value="G">Gramme</option>
          <option value="KG">Kilogramme</option>
          <option value="ML">Millilitre</option>
          <option value="CL">Centilitre</option>
          <option value="L">Litre</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Prix de vente (FCFA)
        </label>
        <input
          type="number"
          step="1"
          {...register('sellingPrice', { valueAsNumber: true })}
          className="input w-full"
        />
        {errors.sellingPrice && (
          <p className="mt-1 text-xs text-danger">{errors.sellingPrice.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Coût d’achat (FCFA)
        </label>
        <input
          type="number"
          step="1"
          {...register('cost', { valueAsNumber: true })}
          className="input w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Seuil d’alerte stock
        </label>
        <input
          type="number"
          step="1"
          {...register('stockMin', { valueAsNumber: true })}
          className="input w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Remise (%, optionnel)
        </label>
        <input
          type="number"
          step="1"
          min={0}
          max={100}
          {...tagField}
          onChange={(e) => {
            tagField.onChange(e);
            // Retirer la remise efface aussi sa période : sinon des dates
            // orphelines resteraient enregistrées sans jamais s'appliquer
            if (e.target.value === '') {
              setValue('tagStartsAt', null);
              setValue('tagEndsAt', null);
            }
          }}
          className="input w-full"
        />
        {errors.tag && <p className="mt-1 text-xs text-danger">{errors.tag.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Début remise (optionnel)
        </label>
        <input
          type="date"
          {...register('tagStartsAt')}
          className="input w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Fin remise (optionnel)
        </label>
        <input
          type="date"
          {...register('tagEndsAt')}
          className="input w-full"
        />
        {errors.tagEndsAt && (
          <p className="mt-1 text-xs text-danger">{errors.tagEndsAt.message}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Sans dates, la remise s’applique tant qu’elle est renseignée.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Type (optionnel)
        </label>
        <select
          {...register('type')}
          className="input w-full"
        >
          <option value="">— Aucun —</option>
          {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-3">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Image (png ou jpg — 1 Mo max, optionnel)
        </label>
        <div className="flex items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Aperçu"
              className="h-12 w-12 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-lg font-semibold text-slate-300">
              {name ? name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleImageChange}
            className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>
        {imageError && <p className="mt-1 text-xs text-danger">{imageError}</p>}
        <p className="mt-1 text-xs text-slate-500">
          Sans image, le produit affiche un pictogramme avec sa première lettre.
        </p>
      </div>

      <div className="flex gap-3 sm:col-span-3">
        <button
          type="submit"
          disabled={isSubmitting} aria-busy={isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Enregistrement...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
