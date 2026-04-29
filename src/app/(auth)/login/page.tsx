'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { login } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Logger ind…' : 'Log ind'}
    </Button>
  )
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { message?: string }
}) {
  const [state, formAction] = useFormState(login, null)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Log ind</CardTitle>
        <CardDescription className="text-center">
          Indtast din email og adgangskode
        </CardDescription>
      </CardHeader>
      <CardContent>
        {searchParams?.message && (
          <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
            <AlertDescription>{searchParams.message}</AlertDescription>
          </Alert>
        )}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Adgangskode</Label>
              <Link
                href="/reset-password"
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Glemt adgangskode?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton />
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Har du ikke en konto?{' '}
          <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
            Opret konto
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
