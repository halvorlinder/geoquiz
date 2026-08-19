# Capital dataset notes

`src/data/capitals.json` is a locally bundled, deliberately finite study list. It contains 197 study entities: 193 UN members plus Vatican City / Holy See, State of Palestine, Kosovo, and Taiwan. Those map to 201 entity→capital associations and 200 unique capital places/questions. This is a learning policy, not a statement about recognition, borders, or territorial claims.

## Selection rules

1. One distinct city question is selected for each included polity, except that Bolivia, Eswatini, and South Africa retain their explicitly divided official capital functions. Territories and dependencies are outside the set.
2. Prefer the constitutional or commonly taught national capital. Do not add government, court, parliament, or commercial centres that are not designated capitals; conventional centres for no designated capital are marked below.
3. Israel and the State of Palestine are both associated with one shared `Jerusalem` place and dot. This prevents duplicate questions and takes no position on sovereignty, boundaries, the city's status, or competing claims.
4. Coordinates are approximate central coordinates for the selected city. They only locate dots; they do not imply a boundary, sovereignty, or territorial claim.
5. English names are displayed. Aliases cover common English variants, diacritics, and transliterations; the answer normalizer additionally handles case, punctuation, and spacing.

## Important capital choices

| Polity | Quiz entry | Rationale |
| --- | --- | --- |
| Bolivia | Sucre and La Paz | Constitutionally divided national-capital functions. |
| Burundi | Gitega | Current political capital, replacing Bujumbura. |
| Cyprus | Nicosia | National capital; the quiz does not treat the divided-city administrations as separate states. |
| Equatorial Guinea | Ciudad de la Paz | Replaced Malabo by the presidential decree of 2 January 2026. |
| Eswatini | Mbabane and Lobamba | Administrative and legislative/royal national-capital functions. |
| Malaysia | Kuala Lumpur | National capital; Putrajaya is the federal administrative centre. |
| Myanmar | Naypyidaw | Current administrative capital. |
| Netherlands | Amsterdam | Constitutional capital; The Hague is the seat of government. |
| Israel and State of Palestine | Jerusalem (one shared dot) | A single capital-place question with two entity associations; no position on claims. |
| Nauru | Yaren | De facto government district; Nauru has no official capital city. |
| Palau | Ngerulmud | National capital, rather than former Koror seat. |
| South Africa | Pretoria, Cape Town and Bloemfontein | Executive, legislative, and judicial national-capital functions. |
| Sri Lanka | Sri Jayewardenepura Kotte | Official legislative capital; Colombo remains the commercial and executive centre. |
| Switzerland | Bern | Federal City, conventionally treated as its capital. |
| Tanzania | Dodoma | National capital; Dar es Salaam remains the largest city and some functions remain there. |
| Vatican City / Holy See | Vatican City | City-state / Holy See seat represented once. |

## Maintenance and attribution

The data was assembled and checked on 2026-08-19 using the [UN member-state list](https://www.un.org/about-us/member-states), [UNGEGN](https://unstats.un.org/unsd/geoinfo/geonames/About.htm), and official government sources for changing or multi-seat cases. The relevant source reference and checked date are stored on every association; the Equatorial Guinea and Indonesia snapshots are specifically guarded by the validation script. Before changing a capital, check a primary government source and keep the 197/201/200 policy intact. Review annually and whenever a high-volatility case changes.
