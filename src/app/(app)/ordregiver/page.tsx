import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function OrdregiverDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Ordregiver-dashboard
      </h1>
      <p className="text-sm text-muted-foreground">
        Placeholder – fuld funktionalitet bygges i næste sprint.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Aktive udbud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ingen data endnu.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Ubesvarede spørgsmål
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ingen data endnu.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Kommende deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ingen data endnu.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
