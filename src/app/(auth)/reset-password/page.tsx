'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { requestPasswordReset } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Sender…' : 'Send reset-link'}
    </Button>
  )
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { sent?: string }
}) {
  const [state, formAction] = useFormState(requestPasswordReset, null)

  if (searchParams?.sent === '1') {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Email sendt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription>
              Hvis der findes en konto med den angivne email, har vi sendt et link til at nulstille din
              adgangskode. Tjek din indbakke og spam-mappe. Linket udløber om 1 time.
            </AlertDescription>
          </Alert>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
              Tilbage til log ind
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Glemt adgangskode</CardTitle>
        <CardDescription className="text-center">
          Indtast din email, så sender vi dig et link til at nulstille din adgangskode
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="din@email.dk"
              autoComplete="email"
              required
            />
          </div>
          <SubmitButton />
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Tilbage til log ind
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
