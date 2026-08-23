# Study entity catalog

`src/data/entities.json` is the versioned, locally bundled catalog of the 197
study entities used by Geoquiz. It is entity-centric metadata that cross-references
the existing capital-place dataset; it does not replace or duplicate
`src/data/capitals.json` as the capital-answer source.

## Schema and versioning

The top-level catalog records its integer `version`, `checked` date, provenance,
and `entities`. Every entity has a stable three-letter `code`, canonical `name`,
optional accepted country/entity `aliases`, one supported `continent`, and one or
more role-labelled `capitals` assignments. Each assignment references an existing
`capitals.json` place `id`; a capital place can therefore be shared without
duplicating it.

This first version is derived directly from the versioned 197-entity roster in
`capitals.json`, which contains 201 entity-to-capital associations and 200 unique
capital places. The entity validator requires exact reciprocal coverage. Update
both datasets deliberately when the study roster changes; do not use visual map
geometry as an authority for entity identity or inclusion.

## Continents

Continents use [UN M49 regional placement](https://unstats.un.org/unsd/methodology/m49/)
as a practical baseline. Geoquiz applies these explicit study-product overrides:

- Russia — Europe
- Türkiye — Europe
- Kazakhstan — Asia
- Egypt — Africa
- Georgia — Asia

Taiwan and Kosovo are study entities in this catalog but are not M49 country
areas. Geoquiz therefore records them as explicit supplemental study-product
classifications: Taiwan — Asia and Kosovo — Europe. Palau is Oceania under the
M49 baseline. The full 197-code policy is checked into
`src/core/entityContinentPolicy.ts` and mechanically enforced by the validator.

These groupings are for quiz filtering only. They do not imply recognition,
sovereignty, borders, or any position on disputed territory.

## Capital roles and Jerusalem

Most assignments use the generic `Capital` role. The only divided-capital
assignments are South Africa (Administrative—Pretoria, Legislative—Cape Town,
Judicial—Bloemfontein), Bolivia (Constitutional capital—Sucre, Seat of
government—La Paz), and Eswatini (Administrative—Mbabane, Royal and
legislative—Lobamba).

Israel and the State of Palestine each reference the existing `jerusalem` place.
This remains one shared capital-place question, consistent with the capital-data
policy, and is not a statement about the city’s status, sovereignty, or borders.

## Alias policy

Aliases are for established country/entity naming variants only, such as Turkey
for Türkiye, Cape Verde for Cabo Verde, and Palestine for State of Palestine.
They are never capital-answer aliases. Aliases must be nonempty after
normalization, unique, and cannot collide with another entity’s canonical name,
code, or alias.

## Maintenance and validation

The catalog was derived and checked on 2026-08-20 from the repository’s
`capitals.json` roster, UN M49 placement baseline, the documented product
overrides, and the Taiwan/Kosovo supplemental classifications. Review it annually
and whenever a study-entity, naming, continent-policy, or capital-association
change is made. Run `npm run validate:data`; it runs the capital validator
followed by the entity validator, which checks schema integrity, exact 197/201/200
coverage, aliases, continent policy, reciprocal references, shared Jerusalem, and
the multi-capital role mappings.
