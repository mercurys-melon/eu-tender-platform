export type UserRole = 'supplier' | 'buyer'

export const isRole = (v: unknown): v is UserRole => v === 'supplier' || v === 'buyer'

export const roleFromQuery = (q: string | null): UserRole | null =>
  q === 'supplier' ? 'supplier' : q === 'buyer' ? 'buyer' : null

export const getRoleDisplayName = (role: UserRole): string => {
  return role === 'supplier' ? 'Leverandør' : 'Ordregiver'
}

export const getRoleDescription = (role: UserRole): string => {
  return role === 'supplier' 
    ? 'Find udbud, gem favoritter og hold styr på dine deltagelser.'
    : 'Opret og administrér udbud, og følg status og kontrakter.'
}
