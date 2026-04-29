import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Bekræft din email</CardTitle>
        <CardDescription className="text-center">
          Næsten der – et enkelt trin tilbage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Vi har sendt en bekræftelsesmail til din email-adresse. Klik på linket i mailen for at
          aktivere din konto.
        </p>
        <p className="text-xs text-muted-foreground">
          Tjek også din spam-mappe, hvis mailen ikke er ankommet inden for et par minutter.
        </p>
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Tilbage til log ind
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
