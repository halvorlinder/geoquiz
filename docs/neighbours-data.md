# Neighbour data

src/data/neighbours.json is a bundled, versioned (v1) policy dataset for the
shape-to-neighbours quiz. It covers the same 197 study entities as
capitals.json, checked on 2026-08-20. It currently contains 317 reciprocal
land-boundary edges, 157 eligible entities, and 40 known zero-neighbour
entities.

The separate Country borders image quiz renders this same authoritative roster
through display-only exact shared runs. Its geometry and ODbL provenance are in
`docs/border-lines-data.md`; it never determines neighbour answers.

## Scope and neutrality

The data represents the quiz's answer policy, not a legal boundary
determination. It counts terrestrial borders, including river and lake
boundaries, and excludes point-only contact. It includes ordinary exclaves and
integral national territory (for example Kaliningrad, Nakhchivan, Cabinda,
French Guiana, Ceuta, and Melilla). It excludes contacts created only through
dependencies in the territory deck.

Disputed and sensitive edges are recorded with concise neutral notes. The
dataset includes the approved Palestine, Kosovo, Israel-Syria, Russia-related,
South Asian, Guianas, Belize-Guatemala, Eritrea-Ethiopia, Sudan-South Sudan,
and Croatia-Serbia mappings without asserting recognition, control, or final
delimitation. It excludes the dependency-mediated UK/Spain, UK/Cyprus, and
Denmark/Canada contacts and a Morocco/Mauritania edge inferred through Western
Sahara.

Botswana-Zambia is included: current Botswana and Zambian official material
describes the Kazungula cross-border bridge and border arrangement. It is
recorded as a short terrestrial/riverside boundary, not a point-only contact.
Croatia-Montenegro is also included: Montenegro's Border Police describes a
19.7 km state-border segment, so it is not a point-only contact.

## Sources and maintenance

The top-level source catalog records stable IDs, direct URLs, descriptions, and
the checked date. UN Geospatial data and UN Maps provide the broad audit
baseline; they are not used to infer quiz answers and do not legally delimit
borders. Primary UN, government, parliamentary, and ICJ material records the
sensitive decisions. Government sources document the relevant administrative
or operational context and are not treated as recognition or delimitation
statements. Afghanistan-Pakistan is retained as a reciprocal study edge with a
neutral Durand Line note; its UN map reference supplies boundary context rather
than a position on that dispute.

When a border, territorial administration, or policy changes, update the
affected edge or exclusion, source references, note, checked date, and focused
snapshot tests. Perform an annual review even when no event has prompted one.
Run npm run validate:data to cross-check the exact capital roster, source
catalog, sorting, reciprocal graph, exclusions, and sensitive snapshots. The
later entity-catalog integration must add name/alias matching; this dataset
intentionally exposes codes only.
