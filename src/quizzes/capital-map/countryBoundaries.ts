import countriesTopologyJson from 'world-atlas/countries-110m.json'
import { mesh } from 'topojson-client'
import type { GeometryObject, Topology } from 'topojson-specification'

// The conversion happens once when this module is evaluated. The resulting one-piece
// MultiLineString lets Leaflet draw country and coast boundaries as one lightweight layer.
const countriesTopology = countriesTopologyJson as unknown as Topology<Record<string, GeometryObject>>
const countries = countriesTopology.objects.countries

if (!countries) {
  throw new Error('The bundled world atlas is missing its countries object.')
}

export const COUNTRY_OUTLINES_PANE = 'country-outlines'
export const COUNTRY_OUTLINES_PANE_Z_INDEX = 350
export const countryBoundaryLines = mesh(countriesTopology, countries)
