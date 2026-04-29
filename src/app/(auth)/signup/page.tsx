'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signup } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Opretter konto…' : 'Opret konto'}
    </Button>
  )
}

export default function SignupPage() {
  const [state, formAction] = useFormState(signup, null)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Opret konto</CardTitle>
        <CardDescription className="text-center">
          Du får automatisk adgang som både ordregiver og tilbudsgiver
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
            <Label htmlFor="full_name">Fuldt navn</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Fornavn Efternavn"
              autoComplete="name"
              required
            />
          </div>
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
            <Label htmlFor="password">Adgangskode</Label>
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
          <div className="flex items-start gap-3">
            <Checkbox id="terms" name="terms" required className="mt-0.5" />
            <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
              Jeg accepterer{' '}
              <Link href="/vilkaar" className="underline underline-offset-4 hover:text-foreground" target="_blank">
                vilkårene
              </Link>{' '}
              og{' '}
              <Link href="/privatlivspolitik" className="underline underline-offset-4 hover:text-foreground" target="_blank">
                privatlivspolitikken
              </Link>
            </Label>
          </div>
          <SubmitButton />
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Har du allerede en konto?{' '}
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Log ind
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
