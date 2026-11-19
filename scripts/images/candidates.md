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
   Not test-built; kept as a further alternate (a small book wood engraving, so a weaker crop
   than the Met plate).
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

## Batch 2 (27 demons)

Commons files below were checked one by one through the API (`LicenseShortName` "Public domain",
`Copyrighted` false). Their `imageUrl` is `commons.wikimedia.org/w/thumb.php?f=…&w=<full width>`
(the file at its own size), because `upload.wikimedia.org` answered every original download with
HTTP 429 / Retry-After 600 from this sandbox while `thumb.php` served normally.

### willowisp
1. **Will-o-the-wisp and snake** — Hermann Hendrich (1854–1931), painting.
   https://commons.wikimedia.org/wiki/File:Will-o-the-wisp_and_snake_by_Hermann_Hendrich_1823.jpg — Public domain (the "1823" in the
   file name is wrong; Hendrich was born 1854). **Chosen**, **portrait**: tight crop on one glowing
   wisp figure over the dark marsh.
2. Arnold Böcklin, *Das Irrlicht*, 1882 — https://commons.wikimedia.org/wiki/File:Arnold_Böcklin_-_Das_Irrlicht_-1882.jpeg — Public domain.
3. *Led Astray. The Irish Will o' the Wisp*, John Gordon Thomson, 1880 — Public domain.
   (Rejected: John Doyle's *A Will O' The Wisp*, Yale CC0, is a political caricature of real people.)

### puck
1. **Puck, from *Puck of Pook's Hill* (facing p. 6)** — Arthur Rackham, 1906.
   https://commons.wikimedia.org/wiki/File:Puck_of_Pook%27s_Hill_-_Facing_Page_6.png — Public domain. **Chosen**, **portrait**: Rackham's
   wizened, pointy-capped hobgoblin (an old creature, not a child), cropped away from the two
   children in the plate.
2. *Robin Goodfellow, His Mad Pranks and Merry Jests*, title woodcut, 1639 —
   https://commons.wikimedia.org/wiki/File:Robin_Goodfellow_1639.jpg — Public domain, but only 373×561 and the figure is small.
3. H. R. Millar, *Puck of Pook's Hill* frontispiece, 1906 — Public domain (Puck is small in a wide scene).
   (Rejected: Fuseli's *Robin Goodfellow-Puck* 1787–90 and Reynolds's Puck — child-like nudes; Fuseli
   *Puck* 1810–20 Commons scan is CC BY-SA 4.0.)

### golem
1. **Golem** — Mikoláš Aleš, 1899, pen drawing for old Czech legends.
   https://commons.wikimedia.org/wiki/File:Golem_–_Mikoláš_Aleš_(Staré_pověsti_české).jpg — Public domain. **Chosen**: the golem's head
   with the Hebrew letters on his brow. Tried as a **cutout**, but the open hatching lets the fill eat
   the face; fell back to **portrait**.
2. Same drawing, smaller scans: "Mikoláš Aleš - The Maharal of Prague and the Golem (1899).jpg",
   "Ales golem.jpg" — Public domain. (Film stills of Paul Wegener rejected: real person.)

### oni
1. **Oni (鬼), from *Konjaku Gazu Zoku Hyakki*** — Toriyama Sekien, 1779.
   https://commons.wikimedia.org/wiki/File:SekienOni.jpg — Public domain. **Chosen**, **portrait** on the horned ogre (the page is
   densely inked, no clean paper to cut out).
2. Sekien, *Rashōmon no oni* and *Ushi-oni* (1780/81) — Commons, Public domain.
3. Met 53990 *Masks of Oni and Uzume* (probably 1807) — CC0.

### anubis
1. **Statuette of a canid-headed god, probably Anubis** — Ptolemaic Period, 332–30 BCE, plastered
   and painted wood. Met 590939 (front view `38.5_front.jpg`). — CC0. **Chosen**, **cutout**: upper
   half of the figure on a plain studio background.
2. AIC 64349 *Statuette of the God Anubis* — public domain. 3. Met 570303 *Anubis with scepter* — CC0.

### gonggong
1. **共工氏頭觸不周山 (Gonggong butts his head against Mount Buzhou)** — Ming-dynasty woodblock,
   *Anjian yanyi diwang yushi Pangu zhi Tang Yu zhuan*. https://commons.wikimedia.org/wiki/File:共工氏頭觸不周山.jpg — Public domain.
   **Chosen**, **portrait**: the only Commons image found that is labelled as Gonggong himself; shows
   him as a man, not the snake-bodied form.
2. 人面蛇身 ("human face, snake body"), Hu Wenhuan's *Shanhaijing tu*, 1644 — Public domain. The
   requested look (human head on a snake, wild hair) but not labelled Gonggong and only 337×412.
3. 祝融氏大戰康回 (Zhurong battles Kanghui = Gonggong), 1635 — Public domain; battle scene.

### valkyrie
1. **Valkyrie** — Peter Nicolai Arbo, 1864 (Nationalmuseum). https://commons.wikimedia.org/wiki/File:Valkyrie_by_Arbo.jpg — Public
   domain. **Chosen**, **portrait**: helmeted rider with spear and shield, adult woman, clothed.
2. Arbo, *The Valkyrie*, 1869, NG.M.00259 (Oslo) — Public domain. 3. AIC 44029 Fantin-Latour,
   *Debut of the Valkyrie*, 1879 lithograph — public domain.

### tyr
1. **Fenrir and Týr, SÁM 66 fol. 78v** — Jakob Sigurðsson, Icelandic manuscript, 1765–66.
   https://commons.wikimedia.org/wiki/File:SÁM_66,_78v,_Fenrir_and_Týr.jpg — Public domain. **Chosen**, **portrait**: crowned Týr with
   his hand in Fenrir's jaws.
2. NKS 1867 4to Fenrir page ("Treated NKS fenrir.jpg") — Public domain.

### brokkr
1. **"Once again the buzzing fly came in at the window"** — Arthur Rackham, 1901: the dwarf smiths at
   the bellows while Loki, as a fly, pesters them. https://commons.wikimedia.org/wiki/File:Once_again_the_buzzing_fly_came_in_at_the_window_(1901)_by_Arthur_Rackham.jpg
   — Public domain. **Chosen**, **portrait** on the bearded dwarf working the bellows.
2. Elmer Boyd Smith, *The third gift — an enormous hammer*, 1902 — Public domain (Brokk and Sindri
   at the forge, smaller figures). (Rejected: "Gullinbursty.jpg" — CC BY-SA 4.0.)

### ptah
1. **Cult Image of the God Ptah** — lapis lazuli, ca. 945–600 BCE. Met 549169 — CC0. **Chosen**,
   **cutout**: the blue capped, bearded god holding his was-sceptre on a plain background.
2. Met 587598 *Statue of the God Ptah* — CC0. 3. AIC 120347 *Statuette of Ptah* — public domain.

### tanuki
1. **Netsuke: Tanuki no Hara Tsutsumi (tanuki drumming on his belly)** — wood, 19th century.
   Met 59233 — CC0. **Chosen**, **cutout**: the grinning bake-danuki drumming his belly; the grey
   table shadow is cropped off at the bottom.
2. Sekien, "SekienTanuki.jpg" — Public domain but only 384×512 and without author/date metadata.
3. Met 60382 Garaku, *Tanuki with a Sake Bottle* (ivory netsuke) — CC0.
   (Rejected: "Sekien known as tanuki or mani…" — CC BY-SA 4.0; scrotum-gag prints — too sexual.)

### loki
1. **Loki, SÁM 66 fol. 79r** — Jakob Sigurðsson, 1765–66. https://commons.wikimedia.org/wiki/File:SÁM_66,_79r,_Loki.jpg — Public
   domain. **Chosen**, **portrait**: the grinning, long-haired trickster with his fishing net.
2. "Processed SAM loki.jpg" — cleaned version of the same page, Public domain.
3. Emil Doepler, *Lokis Gezücht*, c. 1905 — Public domain (Loki's children, not Loki).

### kodama
1. **Kodama (木魅), from *Gazu Hyakki Yagyō*** — Toriyama Sekien, 1776. https://commons.wikimedia.org/wiki/File:SekienKodama.jpg —
   Public domain. **Chosen**, **portrait**: the old tree-spirit figure beneath the pine (the page is
   full of foliage, no clean paper to cut out). No other PD kodama image found.

### banshee
1. **Banshee, *Dictionnaire infernal*** — Louis Le Breton, 1863. https://commons.wikimedia.org/wiki/File:Ill_dict_infernal_p0092-78_banshee.jpg
   — Public domain. **Chosen**, **portrait** (she stands in an engraved landscape).
2. *The Banshee Appears*, R. Prowse, 1862 — Public domain. 3. "Banshee.jpg", W. H. Brooke, 1834 — Public domain.

### leprechaun
1. **The Leprechaun or Clurichaun, *Celtic Fairy Tales*** — John D. Batten, 1892.
   https://commons.wikimedia.org/wiki/File:Celtic_Fairy_Tales-1892-048-1.jpg — Public domain. **Chosen**, **portrait** (black
   ink background, so no cutout).
2. "Leprechaun or Clurichaun.png" — Public domain. 3. "Leprechaun engraving 1858.jpg" — Public domain, 300×539.

### oberon
1. **The Quarrel of Oberon and Titania** (detail) — Joseph Noel Paton, 1849, National Galleries of
   Scotland (Google Art Project scan). https://commons.wikimedia.org/wiki/File:Sir_Joseph_Noel_Paton_-_The_Quarrel_of_Oberon_and_Titania_-_Google_Art_Project.jpg
   — Public domain. **Chosen**, **portrait**: Oberon's head and shoulders only; the nude fairies
   around him are cropped out.
2. Paton, *The Reconciliation of Titania and Oberon*, 1847 — Public domain.

### gargoyle
1. **The Vampire (Le Stryge)** — Charles Meryon, 1853, etching. Met 360188 — CC0. **Chosen**,
   **portrait**: the horned chimera of Notre-Dame leaning on the parapet.
2. Same etching, Google Art Project scan on Commons — Public domain. 3. AIC 41293 D. Y. Cameron,
   *The Gargoyles, Stirling Castle*, 1898 — public domain.

### talos
1. **The dying Talos** — Fratelli Alinari photograph (before 1920) of the Talos krater, Ruvo di
   Puglia (c. 400 BCE). https://commons.wikimedia.org/wiki/File:Gebrüder_Alinari_-_Detail_einer_Vase_(Zeno_Fotografie).jpg —
   Public domain (PD-old-70-expired). **Chosen**, **portrait**: head and torso of the collapsing
   bronze giant, cropped above the waist.
   (Rejected: all modern photos of the krater on Commons — CC BY-SA, e.g. ArchaiOptix 2023,
   "Vase de Talos à Ruvo di Puglia.jpg". No PD alternate found.)

### troll
1. **Forest Troll (Skogtroll)** — Theodor Kittelsen, 1906 (Nasjonalmuseet, Oslo). https://commons.wikimedia.org/wiki/File:Theodor_Kittelsen_-_Forest_Troll_-_NG.K%26H.B.03222_-_National_Museum_of_Art,_Architecture_and_Design.jpg
   — Public domain. **Chosen**, **portrait**: the mountain-sized troll face with one glowing eye.
2. Kittelsen, *Sjøtrollet*, 1887 — Public domain. 3. John Bauer, *Troll at the door*, 1914 — Public domain.

### minotaur
1. **The Minotaur** — George Frederic Watts, 1885 (Tate). https://commons.wikimedia.org/wiki/File:George_Frederic_Watts_-_The_Minotaur_-_Google_Art_Project.jpg
   — Public domain. **Chosen**, **portrait**: bull head and shoulders gazing out to sea.
2. Met 192857 Barye, *Theseus Slaying the Minotaur* (bronze) — CC0. 3. "Star Lore Of All Ages
   (1911), The Minotaur" — Public domain.

### charon
1. **Charon (*Inferno*, Canto III, plate 9)** — Gustave Doré, 1857. https://commons.wikimedia.org/wiki/File:Gustave_Doré_-_Dante_Alighieri_-_Inferno_-_Plate_9_(Canto_III_-_Charon).jpg
   — Public domain. **Chosen**, **portrait**: head and upper body of the old ferryman (wood
   engraving with a full dark background, so no cutout).
2. AIC 129486 J. A. Koch, *Charon's Bark*, 1808–09 — public domain. 3. Met 251043 Sabouroff
   Painter lekythos with Charon, ca. 450 BCE — CC0.

### hel
1. **Hel** — Johannes Gehrts, for *Walhall* (Felix and Therese Dahn), 1888–89.
   https://commons.wikimedia.org/wiki/File:Hel_(the_personification_of_Hel).png — Public domain. **Chosen**, **portrait** on her
   stern face. Note: no PD image found that shows her half living, half corpse.
2. "Hel (1889) by Johannes Gehrts.jpg" — same picture, smaller. 3. Willy Pogany, *The children of
   Loki*, 1920 — Public domain (Hel as a gaunt figure, small in the frame).

### basilisk
1. **Basilisk** — woodcut from Ulisse Aldrovandi's *Serpentum et draconum historiae*, 1640.
   https://commons.wikimedia.org/wiki/File:Basilisk_(1640).png — Public domain. **Chosen**, **cutout** (clean black-and-white print;
   it is wide, 1212×463).
2. "Basilisk aldrovandi.jpg" — same woodcut, 426×180. 3. Met 404617 Master DS, *Basilisk Supporting
   the Arms of Basel*, 1511 — CC0.

### jormungandr
1. **Jörmungandr (Miðgarðsormr) taking Thor's ox-head bait** — AM 738 4to, fol. 43r, 1680.
   https://commons.wikimedia.org/wiki/File:Jormungandr.jpg — Public domain (PD-Art). **Chosen**, **portrait** on the serpent's head
   and the dangling ox-head bait.
2. "AM 738 4to, 43r, BW Jörmungandr.jpeg" — black-and-white version. 3. SÁM 66 fol. 79v, *Thor and
   Jörmungandr* (1765–66) — Public domain; Lorenz Frølich, *Thor and Jörmungandr*, 1895 — Public domain.

### furfur
1. **Furfur, *Dictionnaire infernal*** — Louis Le Breton, 1863. https://commons.wikimedia.org/wiki/File:Ill_dict_infernal_p0306-290_furfur_demon.jpg
   — Public domain (the original `upload.wikimedia.org` URL; it was cached before the 429 wall).
   **Chosen**, **cutout** (classified on a blurred copy so the hatched ground drops out).
2. "Furfur.jpg" — same plate, 155×173, too small.

### amduscias
1. **Amduscias, *Dictionnaire infernal*** — Louis Le Breton, 1863. https://commons.wikimedia.org/wiki/File:Amduscias.jpg — Public
   domain. **Chosen**, **cutout** (blurred-copy classification; the scattered stones at the bottom are
   cropped off).
2. "Amduscias (Dictionnaire infernal).png" — Public domain, 1159×1329. 3. "Amdusias.jpg" — 155×193.

### asmodeus
1. **Asmodeus, *Dictionnaire infernal*** — Louis Le Breton, 1863. https://commons.wikimedia.org/wiki/File:Asmodeus.jpg — Public
   domain. **Chosen**, **cutout** (flat white-paper model; the engraving fills the plate, so mostly
   the sky around the heads and wings goes transparent).
2. "Asmodaeus.png" — Public domain, 1144×1321.

## Notes for the next batch

- Wikimedia Commons rate-limits this sandbox's shared IP hard (HTTP 429 with Retry-After up to
  600 s on both the API and upload.wikimedia.org). The pipeline waits it out, but a run that
  downloads many Commons files will be slow; the Met and AIC hosts were fine.
- The Met's search endpoint is now `/public/collection/v1.1/search?q=…&limit=…&offset=…`
  (v1 was retired). Too many object lookups in a row trip its bot wall (HTML instead of JSON).
- `upload.wikimedia.org` returned 429 with `Retry-After: 600` for every original from this sandbox
  (batch 2). `https://commons.wikimedia.org/w/thumb.php?f=<File_name>&w=<width>` served renders
  right away; ask for the file's own width to get it at full size. Use that as `imageUrl`.
- The Commons API also 429s often (Retry-After 8–60 s); run lookups strictly one at a time.
- The Cleveland Museum of Art open-access API is blocked by this sandbox's proxy (403).
- Cutout options added in batch 2: `blur` (classify on a blurred copy, for hatched grounds) and
  `flat` (one flat paper colour instead of a gradient plane, for prints that fill their plate).
