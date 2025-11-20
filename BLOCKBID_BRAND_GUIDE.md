# BlockBid Brand Implementation Guide
## "Digital Nordic Retro" - Posthog + Windows XP Inspired

---

## 🎨 Brand Essence

**Mission**: At gøre offentlige udbud enkle, gennemsigtige og effektive – med et smil.

**Personlighed**: Professionel, men menneskelig. Moderne, men nostalgisk.

**Tone of Voice**: Klar, ærlig, let teknisk – men altid forståelig og hjælpsom.

**Kerneord**: 
- 🔍 Gennemsigtighed
- 🤝 Tillid
- ✨ Enkelhed
- 🌅 Optimisme

---

## 🎯 Design Philosophy

BlockBid kombinerer:
- **Posthog's moderne tech-æstetik**: Grafiske shapes, microanimationer, gradienter
- **Windows XP's trygge UI**: Lyse blå nuancer, afrundede felter, blød skeuomorfisme

**Resultat**: Et brand der føles gennemtænkt, pålideligt og teknologisk – men stadig menneskeligt og lyst.

---

## 🎨 Color Palette

### Primary Colors

```css
--cloud-white: #FFFFFF        /* Ren hvid base */
--xp-sky-blue: #3B82F6       /* Hovedfarve - XP blå himmel */
--digital-navy: #1E3A8A      /* Mørk kontrast for tekst */
```

**Anvendelse:**
- `cloud-white`: Baggrunde, kort, pure felter
- `xp-sky-blue`: Primary buttons, links, hero backgrounds
- `digital-navy`: Overskrifter, important text

### Secondary Colors

```css
--soft-sand: #F5F5F5         /* Subtil baggrund */
--pixel-grey: #9CA3AF        /* Body text, sekundær info */
--hint-green: #10B981        /* Success states, positive indicators */
```

**Anvendelse:**
- `soft-sand`: Subtle backgrounds, gradient endpoints
- `pixel-grey`: Body text når ikke på white background
- `hint-green`: Success messages, checkmarks, "active" status

### Accent Colors

```css
--sunset-orange: #F97316     /* CTA buttons, vigtige handlinger */
--pastel-yellow: #FACC15     /* Highlights, attention grabbers */
```

**Anvendelse:**
- `sunset-orange`: Accent CTAs, important actions, warm highlights
- `pastel-yellow`: Subtle highlights, badges, light accents

### Tailwind Class Names

```tsx
// Primary
className="bg-cloud-white text-digital-navy"
className="bg-xp-sky-blue text-white"

// Secondary
className="bg-soft-sand text-pixel-grey"
className="text-hint-green"

// Accent
className="bg-sunset-orange text-white"
className="bg-pastel-yellow"
```

---

## ✍️ Typography

### Font Families

**Headings**: Space Grotesk (moderne tech, rundet karakter)
```tsx
className="font-space"
```

**Body Text**: Inter (neutral, læsbar, UX-optimeret)
```tsx
className="font-inter"
```

**Code/Digital Context**: JetBrains Mono (monospace)
```tsx
className="font-mono"
```

### Type Scale

```tsx
// H1 - Hero headings
className="text-h1"        // 40px, bold, Space Grotesk

// H2 - Section headings
className="text-h2"        // 28px, medium, Space Grotesk

// H3 - Card titles
className="text-h3"        // 20px, semibold, Space Grotesk

// H4 - Subsections
className="text-h4"        // 18px, semibold, Space Grotesk

// Body - Regular text
className="text-body"      // 16px, regular, Inter
```

### Typography Examples

```tsx
// Hero heading
<h1 className="text-5xl lg:text-7xl font-space font-bold text-digital-navy">
  BlockBid
</h1>

// Section heading
<h2 className="text-h2 font-space text-digital-navy">
  Funktioner der virker
</h2>

// Body text
<p className="text-body font-inter text-pixel-grey">
  Digital effektivitet møder tillid
</p>
```

---

## 🧩 UI Components

### Buttons

#### Primary Button (XP Sky Blue)
```tsx
<button className="btn-primary">
  Log Ind
</button>
```
**Style**: Blue, white text, soft shadow, hover scale effect

#### Accent Button (Sunset Orange)
```tsx
<button className="btn-accent">
  Kom i Gang
</button>
```
**Style**: Orange, white text, attention-grabbing, hover scale

#### Outline Button
```tsx
<button className="btn-outline">
  Læs Mere
</button>
```
**Style**: White/transparent, colored border, fills on hover

#### Ghost Button
```tsx
<button className="btn-ghost">
  Annuller
</button>
```
**Style**: Transparent, subtle hover state

### Cards

#### Standard Card
```tsx
<div className="card">
  <p>Content here</p>
</div>
```
**Style**: Rounded corners (16px), soft shadow, white background

#### Hover Card
```tsx
<div className="card-hover">
  <p>Interactive content</p>
</div>
```
**Style**: Lifts on hover, enhanced shadow, slight translate

#### Bubble Card (XP-inspired)
```tsx
<div className="bubble-card">
  <p>Glassmorphic content</p>
</div>
```
**Style**: Frosted glass effect, backdrop blur, soft borders

#### Card XP (Gradient Card)
```tsx
<div className="card-xp">
  <p>Retro-modern content</p>
</div>
```
**Style**: Subtle gradient from white to soft-sand

### Special Elements

#### Accent Bar (Gradient Divider)
```tsx
<div className="accent-bar"></div>
```
**Style**: Colorful gradient bar (blue → green → yellow)

#### Hero XP Background
```tsx
<section className="hero-xp">
  <div className="container-blockbid">
    {/* Hero content */}
  </div>
</section>
```
**Style**: XP sky gradient background

---

## 🎭 Shadows & Depth

### Shadow Utilities

```css
shadow-blockbid        /* Soft, blue-tinted shadow for cards */
shadow-blockbid-lg     /* Medium elevation */
shadow-blockbid-xl     /* High elevation, modals */
shadow-xp-soft         /* XP-style soft glow */
shadow-xp-button       /* Button with inset + drop shadow */
```

### Usage Examples

```tsx
// Standard card
<div className="bg-white rounded-xp-lg shadow-blockbid">

// Elevated card on hover
<div className="bg-white rounded-xp-lg shadow-blockbid hover:shadow-blockbid-xl">

// Button with XP shadow
<button className="bg-xp-sky-blue text-white shadow-xp-button">
```

---

## 📐 Border Radius

### XP-Inspired Rounded Corners

```css
rounded-xp          /* 12px - Standard elements */
rounded-xp-lg       /* 16px - Cards, panels */
rounded-xp-xl       /* 20px - Hero elements, bubble cards */
```

### Usage

```tsx
// Standard UI element
<div className="rounded-xp">

// Card
<div className="rounded-xp-lg">

// Bubble card or hero element
<div className="rounded-xp-xl">
```

---

## ✨ Animations & Micro-interactions

### Built-in Animations

```tsx
// Fade and slide up
className="animate-fade-in-up"

// Fade and slide down
className="animate-fade-in-down"

// Simple fade in
className="animate-fade-in"

// Float effect (continuous)
className="animate-float"

// Scale in (grow from center)
className="animate-scale-in"

// Slide up
className="animate-slide-up"
```

### Animation Delays

```tsx
// Stagger animations
<div className="animate-fade-in-up">First</div>
<div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>Second</div>
<div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Third</div>
```

### Hover Effects

```tsx
// Scale on hover
className="transform hover:scale-105 transition-transform duration-200"

// Lift on hover
className="transform hover:-translate-y-1 transition-all duration-300"

// Glow on hover
className="hover:shadow-blockbid-lg transition-shadow duration-300"
```

---

## 🎨 Gradients

### Background Gradients

```tsx
// XP Sky (Blue gradient)
className="bg-xp-gradient"

// XP Sky Background (Blue to white)
className="bg-xp-sky"

// Custom gradient
className="bg-gradient-to-br from-xp-sky-blue to-blue-500"
className="bg-gradient-to-br from-white to-soft-sand"
```

### Text Gradients

```css
/* Not built-in, but can be custom */
.text-gradient {
  background: linear-gradient(135deg, #3B82F6 0%, #10B981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 📱 Layout Utilities

### Container

```tsx
<div className="container-blockbid">
  {/* Max-width: 1280px, centered, responsive padding */}
</div>
```

### Section Spacing

```tsx
<section className="section-blockbid">
  {/* py-16 md:py-24 */}
</section>

<section className="section-tight">
  {/* py-10 md:py-14 - for tighter sections */}
</section>
```

---

## 🎯 Design Patterns

### Hero Section (XP-inspired)

```tsx
<div className="min-h-screen bg-xp-sky relative overflow-hidden">
  {/* Background decoration */}
  <div className="absolute inset-0 bg-gradient-to-b from-xp-sky-blue via-blue-400 to-white opacity-90"></div>
  
  {/* Floating shapes */}
  <div className="absolute top-20 left-10 opacity-20 animate-float">
    <div className="w-16 h-16 bg-hint-green rounded-xp rotate-12"></div>
  </div>
  
  {/* Content */}
  <section className="relative section-blockbid">
    <div className="container-blockbid">
      <h1 className="text-5xl font-space font-bold text-white">BlockBid</h1>
      <div className="accent-bar max-w-md mx-auto mb-8"></div>
      <p className="text-white/90 font-inter">Your content here</p>
    </div>
  </section>
</div>
```

### Feature Card Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <div className="bubble-card text-center group">
    <div className="w-16 h-16 bg-gradient-to-br from-xp-sky-blue to-blue-500 rounded-xp mx-auto mb-4 flex items-center justify-center shadow-xp-soft group-hover:scale-110 transition-transform">
      <span className="text-3xl">🔍</span>
    </div>
    <h3 className="text-h3 font-space text-digital-navy">Feature Title</h3>
    <p className="text-pixel-grey font-inter">Description here</p>
  </div>
  {/* More cards */}
</div>
```

### XP Window Style

```tsx
<div className="card-xp p-12">
  {/* Window header with dots */}
  <div className="flex items-center gap-2 mb-8 pb-4 border-b border-pixel-grey/20">
    <div className="flex gap-1.5">
      <div className="w-3 h-3 rounded-full bg-sunset-orange"></div>
      <div className="w-3 h-3 rounded-full bg-pastel-yellow"></div>
      <div className="w-3 h-3 rounded-full bg-hint-green"></div>
    </div>
    <div className="text-sm font-mono text-pixel-grey ml-2">blockbid://window</div>
  </div>
  
  {/* Window content */}
  <div className="content">
    {/* Your content */}
  </div>
</div>
```

### Trust Indicators

```tsx
<div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm font-inter">
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 bg-hint-green rounded-full"></div>
    <span>100% Transparent</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 bg-hint-green rounded-full"></div>
    <span>EU-Godkendt</span>
  </div>
</div>
```

---

## 🎨 Ikonografi

### Style Guidelines

- Use simple, line-based icons with soft edges
- Prefer emoji for friendly, approachable context: 🔍 🚀 💼 ⚒️
- For professional contexts, use outline SVG icons
- Icon containers should use gradient backgrounds:

```tsx
<div className="w-16 h-16 bg-gradient-to-br from-xp-sky-blue to-blue-500 rounded-xp flex items-center justify-center">
  <span className="text-2xl">🔍</span>
</div>
```

---

## 📸 Billedstil

### Photo Guidelines

- **Lys og naturlig**: Bright, early 2000s optimism
- **Blå himmel**: Clear skies, white buildings, light reflections
- **Åben og menneskelig**: Real people, approachable scenarios
- **Undgå**: Cold stock photos, overly corporate imagery

### Image Treatment

```tsx
// Rounded corners to match brand
<img src="..." className="rounded-xp-lg shadow-blockbid" />

// Image cards
<div className="bubble-card overflow-hidden">
  <img src="..." className="w-full h-48 object-cover" />
  <div className="p-6">
    <h3>Title</h3>
  </div>
</div>
```

---

## 💬 Tone of Voice Examples

### ✅ Good Examples

- "Udbud gjort enkelt"
- "Digitale løsninger til rigtige mennesker"
- "Transparens – uden bureaukratiet"
- "Gennemsigtig proces, sikker håndtering"
- "Professionelt, men menneskeligt"

### ❌ Avoid

- Overly technical jargon without explanation
- Corporate-speak ("synergize", "leverage", "paradigm")
- Cold, impersonal language
- Excessive formality

### Emoji Usage

- ✅ Sparingly in UI (CTAs, feature highlights)
- ✅ In informal contexts (marketing, onboarding)
- ❌ Not in error messages or critical info
- ❌ Not in professional documents

---

## 🎯 Component Composition Examples

### Hero CTA Section

```tsx
<div className="flex flex-col sm:flex-row gap-4 justify-center">
  <Link href="/login">
    <button className="btn-primary px-8">
      🔑 Log Ind
    </button>
  </Link>
  <Link href="/register">
    <button className="btn-accent px-8">
      📝 Opret Konto
    </button>
  </Link>
  <Link href="/learn-more">
    <button className="btn-outline px-8">
      🎯 Læs Mere
    </button>
  </Link>
</div>
```

### Stats Display

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
  <div>
    <div className="text-5xl font-space font-bold text-xp-sky-blue mb-2">100+</div>
    <div className="text-pixel-grey font-inter">Aktive Udbud</div>
  </div>
  <div>
    <div className="text-5xl font-space font-bold text-hint-green mb-2">50+</div>
    <div className="text-pixel-grey font-inter">Tilfredse Kunder</div>
  </div>
</div>
```

### Step-by-Step Process

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <div className="bubble-card text-center">
    <div className="w-12 h-12 bg-xp-sky-blue text-white rounded-full flex items-center justify-center mx-auto mb-4 font-space font-bold text-xl shadow-xp-button">
      1
    </div>
    <h3 className="text-h3 font-space text-digital-navy">Step Title</h3>
    <p className="text-pixel-grey font-inter">Description</p>
  </div>
  {/* More steps */}
</div>
```

---

## 🎨 Color Combinations

### Recommended Pairings

#### Professional & Trustworthy
```
Background: cloud-white
Text: digital-navy
Accent: xp-sky-blue
```

#### Warm & Inviting
```
Background: soft-sand
Text: digital-navy
Accent: sunset-orange
```

#### Modern & Clean
```
Background: xp-sky-blue
Text: white
Accent: hint-green or sunset-orange
```

#### Subtle & Sophisticated
```
Background: gradient from white to soft-sand
Text: pixel-grey
Accent: xp-sky-blue
```

---

## ♿ Accessibility

### Contrast Ratios

All color combinations meet WCAG AA standards:

- `digital-navy` on `cloud-white`: AAA
- `white` on `xp-sky-blue`: AAA
- `white` on `sunset-orange`: AA
- `pixel-grey` on `white`: AA

### Focus States

All interactive elements have visible focus states:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xp-sky-blue/50"
```

### Motion

Respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📦 Implementation Checklist

### For New Pages

- [ ] Use `font-space` for headings
- [ ] Use `font-inter` for body text
- [ ] Apply `rounded-xp-lg` or `rounded-xp` to cards
- [ ] Use `btn-primary` or `btn-accent` for CTAs
- [ ] Add `shadow-blockbid` to elevated elements
- [ ] Include `accent-bar` for visual interest
- [ ] Add hover effects with `transform` and `transition`
- [ ] Apply `animate-*` classes for entrance animations
- [ ] Use `container-blockbid` for max-width containers
- [ ] Implement `section-blockbid` for consistent spacing

### For Components

- [ ] Consistent border radius (`rounded-xp*`)
- [ ] Appropriate shadow depth
- [ ] Hover states with scale or translate
- [ ] Focus states for accessibility
- [ ] Loading states with animations
- [ ] Color palette consistency

---

## 🎯 Quick Reference

### Most Common Classes

```tsx
// Containers & Layout
container-blockbid, section-blockbid

// Buttons
btn-primary, btn-accent, btn-outline, btn-ghost

// Cards
card, card-hover, bubble-card, card-xp

// Typography
font-space, font-inter, text-h1, text-h2, text-h3

// Colors
bg-xp-sky-blue, bg-sunset-orange, bg-soft-sand
text-digital-navy, text-pixel-grey, text-hint-green

// Borders
rounded-xp, rounded-xp-lg, rounded-xp-xl

// Shadows
shadow-blockbid, shadow-blockbid-lg, shadow-xp-soft

// Animations
animate-fade-in-up, animate-fade-in-down, animate-float, animate-scale-in

// Special Elements
accent-bar, hero-xp
```

---

## 🎨 Brand Application Examples

### Business Card
- **Background**: XP Sky Blue base
- **Logo**: White
- **Text**: White with digital-navy accents
- **Finish**: Soft-touch with rounded corners

### Website Headers
```tsx
<header className="bg-xp-sky-blue shadow-blockbid">
  <div className="container-blockbid py-4">
    <nav className="flex items-center justify-between">
      {/* Navigation */}
    </nav>
  </div>
</header>
```

### Email Signatures
```html
<table>
  <tr>
    <td style="font-family: 'Space Grotesk', sans-serif; color: #1E3A8A;">
      <strong>BlockBid</strong>
    </td>
  </tr>
  <tr>
    <td style="font-family: 'Inter', sans-serif; color: #9CA3AF;">
      Digitale løsninger til rigtige mennesker
    </td>
  </tr>
</table>
```

---

## 📞 Support

For brand guideline questions or design support:
- Review this guide
- Check `src/app/demo/page.tsx` for implementation examples
- Inspect `src/app/globals.css` for component styles
- Reference `tailwind.config.js` for design tokens

---

**BlockBid** = Posthog's moderne energi + Windows XP's tryghed
*Et brand, der føles gennemtænkt, pålideligt og teknologisk – men stadig menneskeligt og lyst.*

---

Last updated: October 2025

