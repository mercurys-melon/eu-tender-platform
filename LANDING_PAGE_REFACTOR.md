# Landing Page Refaktorering

## Oversigt

Landing page er blevet refaktoreret til en enkel, stram struktur med horisontal top-menu og konsekvente sektioner.

## Nye Komponenter

### NavBar.tsx
- Horisontal menu med ankerlinks
- Sticky positioning med backdrop-blur
- Scrollspy funktionalitet
- Mobil burger menu
- CTA knap ("Book demo")

### Section.tsx
- Generisk wrapper for sektioner
- Max-width container
- Spacing props (sm, md, lg)
- Scroll-margin-top for sticky nav

### SectionHeading.tsx
- H2 overskrift
- Optional eyebrow tekst
- Optional beskrivelse
- Centreret layout

### scrollspy.ts
- IntersectionObserver baseret scrollspy
- Smooth scroll funktionalitet
- Analytics tracking

## Sektioner og IDs

Landing page følger denne struktur:

1. `#hero` - Hero sektion
2. `#funktioner` - Features
3. `#saadan` - How it works
4. `#kunder` - Social proof
5. `#integrationer` - Integrations
6. `#priser` - Pricing
7. `#faq` - FAQ
8. `#compliance` - Compliance
9. `#kontakt` - Contact form

## Navigation

### Menupunkter tilføjes/ændres
I `src/components/marketing/NavBar.tsx`:
```typescript
const navItems = [
  { href: '#hero', label: 'Hjem' },
  { href: '#funktioner', label: 'Funktioner' },
  // Tilføj nye menupunkter her
]
```

### CTA link ændres
Sæt environment variabel:
```bash
NEXT_PUBLIC_BOOKING_URL=https://calendly.com/demo
```

### Scroll-margin-top justeres
I `src/components/marketing/Section.tsx`:
```typescript
className={cn(
  spacingClasses[spacing],
  'scroll-margin-top-20', // Juster denne værdi
  className
)}
```

## Analytics Events

Nye events er tilføjet til `src/lib/analytics.ts`:
- `nav_click` - Når bruger klikker på navigation
- `anchor_view` - Når sektion kommer i view (50% synlighed)
- `cta_click` - Når CTA knap klikkes

## Styling

### Container
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

### Spacing
- `py-16 sm:py-20 lg:py-24` (lg)
- `py-12 sm:py-16` (md)
- `py-8 sm:py-12` (sm)

### Typografi
- H1/H2/H3 skala
- Brødtekst: `text-muted-foreground`

## A11y Features

- `nav` landmark
- `aria-current="true"` på aktivt link
- Escape lukker mobil menu
- Focus ring styling
- Smooth scroll

## Smooth Scroll

Implementeret via:
1. CSS: `scroll-behavior: smooth` på body
2. JavaScript: `smoothScrollTo()` funktion med offset
3. Scroll-margin-top på sektioner

## Scrollspy

Bruger IntersectionObserver til at:
- Tracke hvilken sektion er aktiv
- Opdatere navigation styling
- Sende analytics events
- Håndtere 50% synlighed threshold

## Komponenter Opdateret

Alle eksisterende marketing komponenter er opdateret til:
- Fjerne egne headings (nu fra SectionHeading)
- Fjerne section wrappers (nu fra Section)
- Kortet tekst til maks 120 tegn
- Reduceret til maks 3 bullet points

## Filer Ændret

### Nye filer:
- `src/components/marketing/NavBar.tsx`
- `src/components/marketing/Section.tsx`
- `src/components/marketing/SectionHeading.tsx`
- `src/lib/scrollspy.ts`
- `LANDING_PAGE_REFACTOR.md`

### Opdaterede filer:
- `src/app/(marketing)/page.tsx`
- `src/components/marketing/Hero.tsx`
- `src/components/marketing/Features.tsx`
- `src/components/marketing/HowItWorks.tsx`
- `src/components/marketing/FAQ.tsx`
- `src/components/marketing/PricingTeaser.tsx`
- `src/components/marketing/SocialProof.tsx`
- `src/components/marketing/Integrations.tsx`
- `src/components/marketing/Compliance.tsx`
- `src/components/marketing/LeadForm.tsx`
- `src/lib/analytics.ts`
- `src/app/globals.css`

## Næste Skridt

1. Test navigation på alle enheder
2. Verificer analytics events
3. Juster scroll-margin-top hvis nødvendigt
4. Tilføj flere menupunkter efter behov
5. Opdater CTA links
