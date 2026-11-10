# FASS expansion — Version 34 (AY2025/26)

This update adds source-linked, **partial** audit definitions for 13 previously unencoded FASS primary majors, and selected second majors/minors. These are working interpretations of official published requirements, **not complete graduation certifications**. Existing pathways and the History exact-20-unit rule remain unchanged.

New primary majors: Anthropology, Communications and New Media, English Language and Linguistics, English Literature, Global Studies, Japanese Studies, Malay Studies, Philosophy, Psychology, Social Work, South Asian Studies, Southeast Asian Studies, Theatre and Performance Studies.

New second-major pathways: Communications and New Media, English Language and Linguistics, English Literature, Japanese Studies, Malay Studies, Philosophy, Social Work, South Asian Studies, Southeast Asian Studies.

New minor pathways: English Language and Linguistics, Japanese Studies, Philosophy.

## Deliberately unresolved in this iteration

- Recognised non-prefix course lists and their caps are not yet encoded for all new programmes. Their totals currently count the major prefix, and therefore may undercount legitimate recognised courses.
- Japanese Studies: LAJ language courses and approved JS-recognised courses require proper inclusion in the total with caps; waiver assumptions not implemented.
- Anthropology: SC4101 and other AN-recognised courses need total-unit and level allocations with the 20-unit recognised cap.
- Global Studies: thematic/region and language allocations are not implemented.
- Psychology: PL328x lab choices, advanced group baskets, and the 2000/3000 elective condition need exact mapping.
- Southeast Asian Studies: single-language-track requirement and recognised non-SE baskets are not yet evaluated.
- Theatre and Performance Studies: three strand baskets need official mapping.
- Social Work: internship/field practice units belong to CHS project requirements and need integration into the CHS audit.
- Communications and New Media: NM3550C is an additional CHS project requirement; substitute-unit logic needs refinement.
- Some primary-major compulsory OR groups are encoded as choice checks, but not all course preclusions or exemptions are represented.
- Not-yet-added cohort-2025 Chinese Language, and any programme that is not available for that cohort, remain outside this release.

These incomplete definitions are marked `implementationStatus: "partial"`; the registry shows an audit but does **not** label it fully Supported. Do not interpret green numerical checks alone as a degree clearance.

## Sources

Each definition has a `source` URL. Major sources include the NUS FASS departmental sites for Anthropology, CNM, ELTS, Global Studies, Japanese Studies, Malay Studies, Philosophy, Psychology, Social Work, South Asian Studies, and Southeast Asian Studies.

## Tests

Run `node --test src/tests/*.test.cjs` after installing the source files. The added tests verify that 13 new primary pathways resolve for AY2025/26, remain marked partial, and correctly detect missing compulsory courses. The full local Vite build must still be run in the user's project.
