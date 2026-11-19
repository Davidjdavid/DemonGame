# Portrait candidates

Only public domain / CC0 sources were considered (Met `isPublicDomain: true`, AIC
`is_public_domain: true`, Commons `LicenseShortName` "Public domain" or "CC0").
The chosen image is listed first for each demon; the pipeline entry is in `manifest.json`.

## ares

1. **Head of Mars** — Roman, 2nd century, marble. Art Institute of Chicago 102074.
   https://www.artic.edu/artworks/102074 — CC0 (AIC open access, `is_public_domain: true`).
   **Chosen.** A bearded, helmeted head with a crest: the proud warrior, face to face. Light
   marble on a dark studio background separates cleanly, so it is a **cutout** (crop stops above
   the display plinth; the neck is cut flat).
2. **Marble relief fragment with the head of Mars** — Roman, early 3rd century CE. Met 250709.
   https://www.metmuseum.org/art/collection/search/250709 — CC0.
   Good backup (helmeted, bearded, would also cut out), but the piece is more damaged and
   the strange helmet crest reads less clearly as a war god at portrait size.
3. **Mars, from "The Planets"** — Jacob Matham, ca. 1597, engraving. Met 398836.
   https://www.metmuseum.org/art/collection/search/398836 — CC0.
   Full-length nude seen from behind inside an ornamental oval: no face. Rejected.
   (Also seen: AIC 142748 "Coin Depicting the God Ares", Thrace, 306–281 BCE, PD — a coin
   profile, too small and flat for a talk portrait.)

## hephaestus

1. **Plate 19: Vulcan standing in a niche swinging a hammer, with an anvil, hammer, and tongs at
   his feet, from "Mythological Gods and Goddesses"** — Giovanni Jacopo Caraglio after Rosso
   Fiorentino, 1526, engraving. Met 368141.
   https://www.metmuseum.org/art/collection/search/368141 — CC0.
   **Chosen.** Bearded smith in a pilos cap, hammer raised: reads as Hephaestus instantly.
   Cropped to head, arms and hammer. Tried as a **cutout** first, but the figure stands in an
   engraved, hatched niche (no bare paper around him), so nothing separates; fell back to
   **portrait**.
2. **Vulcan** — bronze statuette, late 16th century (European Sculpture dept.). Met 206781.
   https://www.metmuseum.org/art/collection/search/206781 — CC0.
   Bearded, arm raised to strike; the cutout from the grey background works, but the head is
   bowed (no eye contact) and dark bronze almost vanishes on the game's dark portrait frame.
   Kept as the backup.
3. **Hephaestus, Greek god of blacksmiths** — wood engraving, published 1878.
   https://commons.wikimedia.org/wiki/File:Hephaestus,_Greek_god_of_blacksmiths.jpg — Public domain.
   HEPH1878_NOTE
   (Also seen: Met 248094, Eretria Painter chous with the Return of Hephaistos, ca. 430–420 BCE,
   CC0 — he is a small rider on a mule, too small to crop. Commons "Vulcan (Hephaestus).
   Engraving by E. Jeaurat" (Wellcome) is CC BY 4.0 — rejected on license.)

## kappa

1. **Kappa (河童), from Gazu Hyakki Yagyō** — Toriyama Sekien, 1776, woodblock-printed book.
   https://commons.wikimedia.org/wiki/File:Kappa_jap_myth.jpg — Public domain (PD-Art, PD-old).
   **Chosen** (the requested print). The only Commons scan of this page is 485×640, so the crop
   on the kappa is 275×245 and was not upscaled. Tried as a **cutout**, but the kappa is woven
   into lotus leaves and reeds: a tight crop stays a rectangle and a wide crop gives a ragged
   clump of leaves with a tiny kappa. Fell back to **portrait**.
2. **Yōkai chakutōchō, kawatarō (kappa) pages** — Kitao Masayoshi, 1788, woodblock-printed book.
   https://commons.wikimedia.org/wiki/File:Masayoshi(1788)-Yōkai_chakutōchō-fol04a-kawataro.jpg
   — Public domain, 1873×2577. Best higher-resolution Edo-period alternative if the Sekien crop
   is too soft.
3. **Hokusai kappa** — Katsushika Hokusai (Commons file, source book not checked).
   https://commons.wikimedia.org/wiki/File:Hokusai_kappa.jpg — Public domain, but only 618×464.
   (Rejected: "Kappa to ama" / "Utamakura", Utamaro 1788 — sexually explicit shunga;
   "8.Kappa.jpg" (BYU) — CC BY-SA 4.0; AIC's Sekien books — marked not public domain.)

## Notes for the next batch

- Wikimedia Commons rate-limits this sandbox's shared IP hard (HTTP 429 with Retry-After up to
  600 s on both the API and upload.wikimedia.org). The pipeline waits it out, but a run that
  downloads many Commons files will be slow; the Met and AIC hosts were fine.
- The Met's search endpoint is now `/public/collection/v1.1/search?q=…&limit=…&offset=…`
  (v1 was retired). Too many object lookups in a row trip its bot wall (HTML instead of JSON).
