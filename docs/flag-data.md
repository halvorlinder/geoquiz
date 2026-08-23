# Flag data policy

`src/data/flags.json` is a versioned, local study catalog. It contains the 197
existing sovereign-study entities from `capitals.json` and a separate roster of
38 **territories and associated areas**. This neutral learning label does not
state a position on sovereignty or recognition.

## Scope

The three supported scopes contain 197 (without territories), 235 (with
territories), and 38 (only territories) records. The exact additional roster is
Åland Islands; Faroe Islands; Greenland; Hong Kong; Macao; Aruba; Curaçao; Sint
Maarten; Bonaire; Sint Eustatius; Saba; Cook Islands; Niue; Tokelau; Christmas
Island; Cocos (Keeling) Islands; Norfolk Island; French Polynesia; Guernsey;
Isle of Man; Jersey; Anguilla; Bermuda; British Virgin Islands; Cayman Islands;
Falkland Islands (Malvinas); Gibraltar; Montserrat; Pitcairn; Turks and Caicos
Islands; Saint Helena; Ascension Island; Tristan da Cunha; American Samoa;
Guam; Northern Mariana Islands; Puerto Rico; and United States Virgin Islands.

## Continent filter policy

Sovereign-study records use the continent assigned by `entities.json`; territory
records use the explicit 38-record table in `src/core/flagTerritoryContinentPolicy.ts`.
It uses UN M49 regional placement where practical and is a neutral study-filter
convention rather than a sovereignty statement. The exact territory allocation is:

- Europe: Åland Islands, Faroe Islands, Guernsey, Isle of Man, Jersey, Gibraltar.
- Asia: Hong Kong, Macao.
- North America: Greenland; Aruba; Curaçao; Sint Maarten; Bonaire, Sint Eustatius,
  Saba; Anguilla; Bermuda; British Virgin Islands; Cayman Islands; Montserrat;
  Turks and Caicos Islands; Puerto Rico; United States Virgin Islands.
- South America: Falkland Islands (Malvinas).
- Oceania: Cook Islands, Niue, Tokelau, Christmas Island, Cocos (Keeling)
  Islands, Norfolk Island, French Polynesia, Pitcairn, American Samoa, Guam,
  Northern Mariana Islands.
- Africa: Saint Helena, Ascension Island, Tristan da Cunha.

`validate:flags` verifies exact roster coverage, that all 197 sovereign records
resolve through the entity catalog, and every scope/continent cross-count in the
quiz tests. The filter is applied after selecting Without, With, or Only
territories.

The roster excludes Antarctica, Bouvet Island, Heard Island and McDonald
Islands, French Southern Territories, South Georgia and the South Sandwich
Islands, US Minor Outlying Islands, British Indian Ocean Territory, Western
Sahara, New Caledonia pending a flag-policy decision, Svalbard and Jan Mayen,
French areas without one stable distinct flag, sovereign-base areas, and ordinary
subdivisions. No aggregate `BQ` or `SH` asset is used.

## Source, license, and refresh

Every checked-in `public/flags/v1/<stable-id>.svg` file is a verbatim selected
3x2 SVG from [country-flag-icons 1.6.20](https://www.npmjs.com/package/country-flag-icons),
MIT, git revision `3b8ea50f08ab9d5e79c90325ff76606a4258a719`. The immutable tarball,
integrity digest, local SHA-256 hashes, source keys, and status are in
`flag-assets-manifest.json`; the bundled MIT text is in
`docs/licenses-country-flag-icons-MIT.txt`.

To refresh, download and independently verify the approved tarball, then run
`npx tsx scripts/build-flag-catalog.ts /absolute/path/to/country-flag-icons-1.6.20.tgz`
and `npm run validate:flags`. The script is deliberately offline, runs through
the project's existing `tsx` runner, and otherwise uses Node built-ins plus
`tar`; normal development and production builds never need network access. A source package licence allows redistribution, but individual
flag legal status and official-use rules vary by jurisdiction: the catalog does
not claim that every flag is official or public domain.

The source-key exceptions are PSE→PS, TWN→TW, VAT→VA, XKX→XK, and
SH-HL→SH / SH-AC→AC / SH-TA→TA. Saint Helena, Ascension, and Tristan da Cunha
are separate local/territorial assets, not sovereignty assertions. Christmas
Island and Cocos (Keeling) Islands are tagged `community-unofficial`: Australian
Government [Flags booklet](https://www.pmc.gov.au/sites/default/files/publications/australian-flags-booklet.pdf)
checked in 2024 describes their flags as community-used, not formally adopted.
Ascension's local flag provenance is recorded from the [College of Arms](https://www.college-of-arms.gov.uk/news-grants/news/item/111-ascension-island-flag);
the catalog deliberately does not extrapolate that source into an official-status
claim for all Saint Helena components. The manifest documents exact duplicate bytes if a future
source revision introduces them; near-identical designs are not treated as
duplicates.

Aliases are collision-checked after the same diacritic/punctuation normalization
used by the quiz. Consequently `Åland`/`Aland` and `Curaçao`/`Curacao` do not
need redundant catalog aliases. The catalog instead retains non-redundant study
variants such as UK/U.K., USA/U.S.A./United States of America, Macau, and
Virgin Islands forms. It intentionally excludes ambiguous `Congo` and `Saint
Martin` aliases.

Byte identity is not visual similarity. The review list for potentially
confusing but separately recorded designs includes Romania/Chad,
Indonesia/Monaco, Luxembourg/Netherlands, Ireland/Côte d’Ivoire, Mali/Guinea,
Australia/New Zealand, and UK territorial blue ensigns. Only an exact SHA-256
match requires a declared duplicate group.

## Safety and runtime use

`validate:flags` checks roster, aliases, source exceptions, catalog/capital
cross-references, local asset one-to-one coverage, SHA-256 hashes, and SVG
safety. It rejects scripts, event attributes, foreign/external references,
embedded images, animation, unsafe CSS imports/URLs, malformed SVG roots, and
non-deterministic markers. It also rejects undeclared identical asset hashes.

The quiz renders only the current record's local `<img>` URL through
`flagAssetUrl()`. Assets are public static files rather than inlined SVG or an
eager JavaScript import, so a run can lazy-load the current flag. Stable code
filenames intentionally avoid answer-bearing names.

Review this dataset annually, and whenever a territory flag, legal status, or
source package revision changes. Re-check provenance, usage caveats, aliases,
hashes, duplicate groups, and the exact roster before updating `checked`.
