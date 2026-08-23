# Highest-point dataset notes

`src/data/high-points.json` is the local, versioned learning dataset for the
exact 197 sovereign-study entities in `capitals.json`. It contains one answer
record per entity, not a live geographical assertion. The project uses the
phrase **highest point**: entries may be mountains, hills, ridges, atolls, or a
descriptive natural-ground location.

## Scope and provenance

The scope is the highest natural terrestrial point in the sovereign-study
boundary. It excludes dependencies, overseas territory-deck areas, Antarctic
claims, buildings, fill, spoil, and seafloor. Constitutionally integral islands
are included. The resulting locks are Denmark Møllehøj (not Greenland), the
Netherlands Vaalserberg (not Saba), Australia Mount Kosciuszko (not Heard
Island), the United Kingdom Ben Nevis (not an overseas territory), Spain Teide,
and Portugal Mount Pico.

Each record has a stable entity code, canonical learnable label, curated
aliases, finite WGS84 marker, coordinate-confidence classification, kind and
name status, checked date, and record-specific source references. Elevation is
stored only where the selected evidence supports it. `representative` and
`provisional` coordinates are expressly study markers rather than claims of a
surveyed summit.

Ordinary identity and elevation values use the immutable [final CIA World
Factbook archive](https://github.com/pmusser/cia-world-factbook-final/tree/2a40cddf0b0f57273c2f935be169d73496989a21),
with an exact raw profile, JSON locator, archive revision, and Wayback capture
timestamp on each record. This fixed general-reference baseline is overridden
by newer direct surveys or explicit product-boundary decisions.

Coordinates are local deterministic extracts from:

- NGA GNS Hypsographic snapshot SHA-256
  `c898805f7327db4dc77fc0183e4097d640b7a98d275c73276c9ba022452ffcc2`
  (`high-point-gns-selected.json`, 122 official selected features, preserving
  NGA designation code and feature class); and
- GeoNames `allCountries` snapshot SHA-256
  `91652aa25c1109c406527115e2eb45d4a33a48190483cd37daa6330788995bb5`
  (`high-point-geonames-selected.json`, 68 fixed fallback markers).

Each selected-feature source reference resolves to an exact local array entry.
The validator verifies the code and coordinates against that entry and verifies
NGA country codes when present. Cross-border features such as Everest, Mont
Blanc, Margherita Peak, Roraima, and El Pital retain the snapshot's alternate
country codes. No runtime network request is made.

The baseline remains a study catalog, not a global summit survey. Named-feature
markers can differ from a geodetic summit; low or unnamed points often have only
a representative locality marker. Review those records when a national mapping
agency or newer survey publishes better evidence.

## Required edge-case decisions

| Entity | Canonical answer | Decision |
| --- | --- | --- |
| VAT | Highest point of the Vatican Gardens | Official Holy See description gives 77 m; the state marker is representative, not an exact surveyed spot. |
| MDV | Unnamed beach storm ridge, Fuvahmulah | Natural 4.5 m ridge; excludes artificial Mount Villingili. The island marker is representative. |
| TUV | Unnamed storm berm, Niulakita | Natural 6.54 m berm from Tuvalu/ICJ evidence; island marker is representative. |
| MHL | Unnamed point, Likiep Atoll | Descriptive 10 m low-atoll point from the Marshall Islands profile; the Likiep marker is representative. |
| BEN / BDI / BHS / KWT | Descriptive unnamed points | The fixed Factbook gives a named reference locality/range and elevation. Markers are representative; labels do not invent summit names. |
| DNK / NLD / AUS / GBR | Møllehøj / Vaalserberg / Mount Kosciuszko / Ben Nevis | Required study-boundary locks; dependencies and overseas areas are excluded. Netherlands elevation is omitted because the scope policy, not the ordinary Factbook profile, selects Vaalserberg. |
| ESP / PRT | Teide / Mount Pico | Constitutionally integral islands are included. |
| FRA / ITA | Mont Blanc | A shared marker and label are allowed without taking a France–Italy border position. Italy elevation is omitted rather than implying a boundary/elevation resolution. |
| CHN / NPL; COD / UGA | Mount Everest; Margherita Peak | Shared physical features intentionally reuse a marker and collision ID. |
| ISR / SYR | Mount Meron / Mount Hermon | Israel follows internationally recognised sovereign-boundary scope; Syria retains a neutral Golan/Hermon note. |
| PSE | Khallat al Batrakh | Fixed West Bank/Gaza study-area baseline gives 1,020 m; nearby named-place marker is provisional. This is not a sovereignty or final-border claim. |
| XKX / SRB | Rudoka e Madhe / Midžor | Follows the quiz's separate Kosovo/Serbia study-entity geometry and does not assert sovereignty or final borders. |
| TWN / GEO | Yushan Main Peak / Shkhara | Included under the 197-entity study policy with neutral notes. Shkhara uses a named official-feature marker, not a summit-survey claim. |
| MMR | Hkakabo Razi–Gamlang Razi high-point area | The fixed Factbook and NGA name different contenders. The descriptive answer retains both, uses a representative area marker, and deliberately omits elevation. |
| SWE | Kebnekaise North Peak | Fixed rock summit, 2,096.8 m; the ice-covered South Peak changes. |
| COL | Pico Simón Bolívar | A December 2024 differential-GPS/Abney survey, published in 2025, measured Simón Bolívar at 5,720.42 m and above Cristóbal Colón. The survey coordinate's positive latitude is retained; its introductory `S` hemisphere is documented as a paper typo because both surveyed summits are in Colombia. |
| BGD | Saka Haphong | Bangladesh LGED identifies Saka Haphong / Mowdok Taung at 3,451 ft (stored as 1,052 m); the fixed border-feature marker replaces a wrong same-name point. |
| BWA | Monalanong Hill | Uses the 2025 GNSS determination rather than an older common-list answer. |
| SAU / UZB / GMB / GNB / TGO | Jabal Ferwa / Alpomish / Sare Firasu Hill / Mount Ronde / Mount Atilakoutse | Uses the 2026 peer-reviewed survey coordinates and elevations rather than demonstrably stale lists. |
| SEN | Unnamed elevation near Nepen Diaka | Factbook gives 648 m at 2.8 km southeast of the reference settlement; coordinate remains provisional and no unsupported local summit name is accepted. |
| JPN | Mount Fuji | GSI-supported integer elevation of 3,776 m; no false decimal precision. |
| NZL / KAZ | Aoraki / Mount Cook / Khan Tengri | Exact fixed-source values are 3,724 m and 7,010 m. Khan Tengri follows the cited ice-cap convention. Later explanatory numbers in the source are not elevations. |
| AND / CZE / GRC / CMR / SGP / VCT | Coma Pedrosa / Sněžka / Mytikas / Mount Cameroon / Bukit Timah / La Soufrière | Current direct-authority elevations replace stale general-reference values and are locked by validator snapshots. |

## Maintenance

`npm run validate:data` validates the raw JSON before runtime use. It enforces
the exact independent 197-code roster, strict schemas, finite coordinates,
source IDs and permitted support claims, direct HTTPS/revision/locator/capture
metadata, exact selected-feature locators, source coverage, answer collisions,
explicit shared features, policy locks, and survey snapshots. Review this
dataset annually and when a mapping authority or survey changes a high-risk
entry. Display shapes must never define this study policy.
