// Colección de contenido `blog` — Astro 5 Content Layer (glob loader).
// El entry.id de cada artículo es su ruta sin extensión (ej. "caldera/como-encender-caldera"),
// que coincide exactamente con el `slug` heredado → URL idéntica a la del sitio antiguo.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    // Obligatorios
    title: z.string(),
    category: z.enum(['caldera', 'aire-acondicionado', 'aerotermia', 'blog']),
    // Opcionales (§4 del plan)
    description: z.string().optional(),
    slug: z.string().optional(),
    tag: z.string().optional(),        // etiqueta visible del hero (ej. "Calderas", "Consejos")
    tagClass: z.string().optional(),   // modificador de color: caldera | aire | aerotermia
    breadcrumb: z.string().optional(), // última migaja (ej. "Calderas", "Consejos")
    readingTime: z.number().optional(),
    date: z.date().optional(),         // NO se inventa: los artículos no traen fecha
    conversionFailed: z.boolean().optional(), // artículo dejado como HTML por fallo de conversión
  }),
});

export const collections = { blog };
