# Social image assets

`Inter.ttf` is from the Google Fonts Inter distribution:
https://github.com/google/fonts/blob/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf

Copyright 2020 The Inter Project Authors. The accompanying `Inter-OFL.txt` is the SIL Open Font License 1.1 supplied with the font.

The font is used only by `pnpm generate:social` to render the project's text-and-portrait layouts into PNG. It is not copied to `public/` or loaded by the website. Existing public portrait JPEGs remain unchanged. The generator uses no remote image or inference service.

`social-manifest.json` records generator/font/source/output hashes. Regenerate all cards after editing their layout, titles, portraits or font. Builds reject stale or missing cards rather than silently displaying obsolete artwork.
