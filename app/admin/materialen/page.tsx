import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Package, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import LogoutButton from '@/components/auth/logout-button'

interface Material {
  id: number
  name: string
  thickness_mm: number
  price_per_sqm: number
  cutting_speed_factor: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default async function AdminMaterialsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/auth')
  }

  // Get all materials
  const { data: materials, error } = await supabase
    .from('materials')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching materials:', error)
  }

  // Calculate summary statistics
  const totalMaterials = materials?.length || 0
  const activeMaterials = materials?.filter(m => m.is_active).length || 0
  const inactiveMaterials = materials?.filter(m => !m.is_active).length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  ← Terug naar Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Materialen Beheer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                Nieuw Materiaal
              </Button>
              <span className="text-sm text-gray-600">
                Welkom, {profile.name}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{totalMaterials}</div>
              <p className="text-sm text-gray-600">Totaal Materialen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{activeMaterials}</div>
              <p className="text-sm text-gray-600">Actieve Materialen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-600">{inactiveMaterials}</div>
              <p className="text-sm text-gray-600">Inactieve Materialen</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Materials Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materialen Overzicht
            </CardTitle>
            <CardDescription>
              Beheer alle beschikbare materialen voor waterjet snijden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!materials || materials.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Nog geen materialen toegevoegd.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Eerste Materiaal Toevoegen
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Dikte (mm)</TableHead>
                      <TableHead>Prijs per m²</TableHead>
                      <TableHead>Snijfactor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Laatst Bijgewerkt</TableHead>
                      <TableHead>Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">
                          {material.name}
                        </TableCell>
                        <TableCell>
                          {material.thickness_mm.toFixed(1)} mm
                        </TableCell>
                        <TableCell>
                          €{material.price_per_sqm.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {material.cutting_speed_factor.toFixed(2)}x
                        </TableCell>
                        <TableCell>
                          {material.is_active ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Actief
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">
                              Inactief
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(material.updated_at).toLocaleDateString('nl-NL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" title="Bewerken">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title={material.is_active ? "Deactiveren" : "Activeren"}
                            >
                              {material.is_active ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Material Information */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Materiaal Toevoegen</CardTitle>
              <CardDescription>
                Voeg nieuwe materialen toe die beschikbaar zijn voor snijden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2"><strong>Materiaal Naam:</strong> Beschrijvende naam (bijv. "RVS 304 2mm")</p>
                <p className="mb-2"><strong>Dikte:</strong> Materiaaldikte in millimeters</p>
                <p className="mb-2"><strong>Prijs per m²:</strong> Materiaalprijs exclusief snijwerk</p>
                <p><strong>Snijfactor:</strong> Factor voor snijsnelheid (1.0 = normaal, hoger = langzamer)</p>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                Nieuw Materiaal Formulier
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gebruik Statistieken</CardTitle>
              <CardDescription>
                Overzicht van meest gebruikte materialen (binnenkort beschikbaar)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Statistieken worden binnenkort beschikbaar wanneer er meer offertes zijn verwerkt.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Snelle Acties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Button variant="outline" className="justify-start">
                  Alle Materialen Activeren
                </Button>
                <Button variant="outline" className="justify-start">
                  Prijzen Bulk Update
                </Button>
                <Button variant="outline" className="justify-start">
                  Materialen Importeren
                </Button>
                <Button variant="outline" className="justify-start">
                  Lijst Exporteren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}