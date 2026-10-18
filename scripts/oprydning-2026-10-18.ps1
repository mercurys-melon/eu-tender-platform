<#
  oprydning-2026-10-18.ps1 - sletter doed kode og Cursor-periodens rodfiler.

  Koer fra repo-roden, EFTER at de nye/aendrede filer er lagt ind:
    cd C:\Users\frede\eu-tender-platform
    powershell -ExecutionPolicy Bypass -File .\scripts\oprydning-2026-10-18.ps1

  Sporede filer fjernes med "git rm" (staget, ikke committet); usporede med
  Remove-Item. Ingen commit, ingen push - det goer du selv efter "git status".
  Alt kan gendannes fra git-historikken.
#>
$ErrorActionPreference = 'Stop'
if (-not (Test-Path .\package.json)) { throw 'Koer scriptet fra repo-roden (eu-tender-platform).' }

function Remove-RepoPath([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $tracked = git ls-files -- ":(literal)$Path"
  if ($tracked) {
    git rm -r -q --ignore-unmatch -- ":(literal)$Path" | Out-Null
  }
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
  Write-Host "  slettet: $Path"
}

$paths = @(
  'src/adapters/apiAdapter.ts',
  'src/adapters/hybridAdapter.ts',
  'src/adapters/publishing.ts',
  'src/adapters/uiAdapter.ts',
  'src/api/eforms.ts',
  'src/api/espd.ts',
  'src/app/about/page.tsx',
  'src/app/api/search/route.ts',
  'src/app/api/tenders/[id]/evaluation-documents/route.ts',
  'src/app/buyer/afsluttede/page.tsx',
  'src/app/buyer/kontrakter/page.tsx',
  'src/app/buyer/layout.tsx',
  'src/app/buyer/mine-udbud/page.tsx',
  'src/app/buyer/page.tsx',
  'src/app/buyer/soeg/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/create/layout.tsx',
  'src/app/create/page.tsx',
  'src/app/dashboard/layout.tsx',
  'src/app/dashboard/mine-udbud/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/soeg/page.tsx',
  'src/app/debug-auth/page.tsx',
  'src/app/demo/page.tsx',
  'src/app/documents/page.tsx',
  'src/app/marketing/layout.tsx',
  'src/app/marketing/page.tsx',
  'src/app/qa/page.tsx',
  'src/app/supplier/afsluttede/page.tsx',
  'src/app/supplier/aktive/page.tsx',
  'src/app/supplier/error.tsx',
  'src/app/supplier/layout.tsx',
  'src/app/supplier/page.tsx',
  'src/app/supplier/soeg/page.tsx',
  'src/app/supplier/udbudsscanner/page.tsx',
  'src/auth/login.ts',
  'src/components/auth/auth-form.tsx',
  'src/components/auth/auth-layout.tsx',
  'src/components/bid-section.tsx',
  'src/components/forms/create-tender-form.tsx',
  'src/components/marketing/Compliance.tsx',
  'src/components/marketing/Features.tsx',
  'src/components/marketing/Hero.tsx',
  'src/components/marketing/HowItWorks.tsx',
  'src/components/marketing/Integrations.tsx',
  'src/components/marketing/LeadForm.tsx',
  'src/components/marketing/PricingTeaser.tsx',
  'src/components/marketing/Section.tsx',
  'src/components/marketing/SectionHeading.tsx',
  'src/components/marketing/SocialProof.tsx',
  'src/components/search/TenderSearch.tsx',
  'src/components/tender-details.tsx',
  'src/components/tenders/EvaluationDocumentsUpload.tsx',
  'src/components/ui/minecraft-loading.tsx',
  'src/flows/award.ts',
  'src/flows/negotiatedProcedure.ts',
  'src/flows/openTender.ts',
  'src/flows/qualificationSystem.ts',
  'src/flows/restrictedTender.ts',
  'src/flows/shared.ts',
  'src/lib/auth/session.ts',
  'src/lib/eforms/builder.ts',
  'src/lib/espd/builder.ts',
  'src/lib/publication/payload-builder.ts',
  'src/lib/publication/service.ts',
  'src/lib/scrollspy.ts',
  'src/lib/search/merge.ts',
  'src/lib/search/providers/ted.ts',
  'src/lib/search/providers/udbuddk.ts',
  'src/lib/search/types.ts',
  'src/lib/utils/runtime.ts',
  'src/locales/da.ts',
  'src/locales/en.ts',
  'src/types.ts',
  'src/utils/dates.ts',
  'src/utils/errors.ts',
  'src/utils/selectors.ts',
  'types/stubs/playwright.d.ts',
  'src/app/buyer/opret/page.tsx',
  'BLOCKBID_BRAND_GUIDE.md',
  'BLOCKBID_SETUP.md',
  'BUILD_FIX_SUMMARY.md',
  'CHANGES_SUMMARY.md',
  'CREATE_TENDER_FEATURES.md',
  'DATA_DRIVEN_IMPLEMENTATION_SUMMARY.md',
  'IMPLEMENTATION_COMPLETE.md',
  'IMPLEMENTATION_STATUS.md',
  'IMPLEMENTATION_SUMMARY_POWERCELL.md',
  'IMPLEMENTATION_SUMMARY.md',
  'LANDING_PAGE_REFACTOR.md',
  'next-steps-guide.md',
  'QNA_AND_DOCS_SETUP.md',
  'ROADMAP_FULL_POWER.md',
  'ROLE_SYSTEM_IMPLEMENTATION.md',
  'SCHEMA_UPDATES_NEEDED.md',
  'SEARCH_API_RESEARCH.md',
  'TENDER_DETAILS_FEATURES.md',
  'TENDER_LIFECYCLE_IMPLEMENTATION.md',
  'TENDERS_FEATURES.md',
  'TEST_PLAN_ROLE_BASED_ACCESS.md',
  'TODO-ROUTE-MIGRATION.md',
  'setup.md',
  'test-output.css',
  'tsconfig.backup.json',
  'env.example',
  'playwright.config.ts.disabled',
  'src.zip',
  'bin.disabled',
  'tests.disabled'
)

Write-Host "Sletter $($paths.Count) stier..." -ForegroundColor Cyan
foreach ($p in $paths) { Remove-RepoPath $p }

# Tomme mapper efter sletning (legacy-ruter)
foreach ($d in @('src\app\buyer','src\app\supplier','src\app\dashboard','src\app\create','src\app\debug-auth','src\app\marketing','src\app\demo','src\app\qa','src\app\documents','src\app\about','src\app\contact','src\flows','src\adapters','src\api','src\auth','src\utils','src\locales','src\lib\search','src\lib\eforms','src\lib\espd','src\lib\auth','src\components\search','src\components\auth','types\stubs','src\app\api\search','src\app\api\tenders\[id]\evaluation-documents')) {
  if ((Test-Path -LiteralPath $d) -and -not (Get-ChildItem -LiteralPath $d -Recurse -File)) {
    Remove-Item -LiteralPath $d -Recurse -Force
    Write-Host "  tom mappe fjernet: $d"
  }
}

Write-Host "`nFaerdig. Naeste skridt:" -ForegroundColor Green
Write-Host "  npm install            # opdaterer package-lock (auth-helpers-nextjs fjernet)"
Write-Host "  npm run typecheck      # skal vaere 0 fejl"
Write-Host "  npm run build"
Write-Host "  git status             # gennemgaa foer commit"
