import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

// Flat config (ESLint 9). Erstatter .eslintrc.js + .eslintignore fra Next 14-perioden.
// Regelsæt uændret: kun next/core-web-vitals. Den gamle config registrerede
// @typescript-eslint-parser/-plugin uden at slå regler til; parseren følger nu med
// eslint-config-next. eslint-config-next/typescript er bevidst IKKE slået til (nye regler).
const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // MIDLERTIDIGT 'warn' (A3b, 16. nov. 2026): nye/skrappere regler i react-hooks 7 og
    // eslint-config-next 16 rammer eksisterende kode (10 fund). Rettelse ville ændre adfærd,
    // så de er sænket til advarsel under den rent tekniske opgradering.
    // Skal tilbage til 'error', når udbudssiden, manage-siden, PublicationButton og
    // QnAModerationPanel er skrevet om i Sprint C.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
  globalIgnores([
    // Standard-ignores fra eslint-config-next
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Overført fra .eslintignore
    'bin.disabled/**',
    'tests.disabled/**',
    'tests/**',
    'scripts/**',
    'dist/**',
    'artifacts/**',
    'test-results/**',
  ]),
])

export default eslintConfig
