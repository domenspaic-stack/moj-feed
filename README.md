# Moj feed

Osebni YouTube feed samo s temami, ki te zanimajo, v slovenščini, srbohrvaščini in angleščini.
Brez Shorts, brez trendov, brez naključnih priporočil.

## Zagon

Dvakrat klikni `zazeni.bat` (ali v terminalu `node server.js`) in odpri http://localhost:8080.

## Brezplačen YouTube API ključ (enkratno, ~5 minut)

1. Odpri https://console.cloud.google.com/ in se prijavi z Google računom.
2. Zgoraj izberi **Select a project → New project**, ime npr. `moj-feed`, **Create**.
3. Meni **APIs & Services → Library**, poišči **YouTube Data API v3** in klikni **Enable**.
4. **APIs & Services → Credentials → Create credentials → API key**.
5. Klikni na nov ključ → **Application restrictions: Websites** → dodaj `http://localhost:8080/*`.
   Pod **API restrictions** izberi samo **YouTube Data API v3**. Shrani.
6. Ključ prilepi v aplikaciji v **Nastavitve**.

## Kvota

Google da 10.000 enot na dan zastonj. Eno iskanje porabi ~100 enot, zato ena polna osvežitev
(5 tem × 3 jeziki) porabi ~1.500 enot. Rezultati se shranijo za 6 ur, zato običajno ne
porabiš niti polovice. Gumb **Osveži** prisilno naloži vse znova.

## Teme

Gumb **Teme**: dodaj, uredi ali izbriši teme. Za vsak jezik lahko vpišeš svoje iskalne izraze
(ločene z vejico); če pustiš prazno, se uporabi ime teme.

## Reklame

Videi se predvajajo v uradnem YouTube predvajalniku. Brez reklam so, če si v brskalniku
prijavljen z računom YouTube Premium.
