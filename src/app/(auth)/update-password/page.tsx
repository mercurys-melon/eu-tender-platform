'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updatePassword } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Opdaterer…' : 'Opdater adgangskode'}
    </Button>
  )
}

export default function UpdatePasswordPage() {
  const [state, formAction] = useFormState(updatePassword, null)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Ny adgangskode</CardTitle>
        <CardDescription className="text-center">
          Vælg en ny adgangskode til din konto
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {state.error}{' '}
              {state.error.includes('udløbet') || state.error.includes('ugyldig') ? (
                <Link href="/reset-password" className="underline">
                  Anmod om nyt link
                </Link>
              ) : null}
            </AlertDescription>
          </Alert>
        )}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Ny adgangskode</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Minimum 8 tegn</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Bekræft adgangskode</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
