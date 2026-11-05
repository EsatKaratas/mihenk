#!/usr/bin/env bash
# W8 — canlı ↔ disk SHA-256 (public/ altındaki izlenen tüm dosyalar), curl -L.
# Ölçüt 1 (ham): canlı bayt == disk dosyası. Ölçüt 2: canlı bayt == git blob'u (REF).
# Kullanım: bash sha-karsilastir.sh [commit] [url]
REPO=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
REF=${1:-HEAD}
URL=${2:-https://mihenk.bies.workers.dev}
TMP=$(mktemp -d)
ham=0; blobok=0; toplam=0; liste=""
h() { sha256sum | cut -c1-16; }
while IFS= read -r f; do
  yol=${f#public/}
  if [ "$yol" = "_headers" ] || [ "$yol" = "_redirects" ]; then echo "  atlandı: $yol (sunulmaz)"; continue; fi
  web="$URL/$yol"; [ "$yol" = "index.html" ] && web="$URL/"
  kod=$(curl -sL -H 'Cache-Control: no-cache' -o "$TMP/x" -w '%{http_code}' "$web?w8=$RANDOM")
  canli=$(h < "$TMP/x"); dosya=$(h < "$REPO/$f"); blob=$(git -C "$REPO" show "$REF:$f" | h)
  toplam=$((toplam+1)); s1=-; s2=-
  [ "$canli" = "$dosya" ] && { ham=$((ham+1)); s1=ok; }
  [ "$canli" = "$blob" ] && { blobok=$((blobok+1)); s2=ok; }
  [ "$s1$s2" = "okok" ] || liste="$liste\n  $kod $yol  disk:$s1 blob:$s2"
done < <(git -C "$REPO" ls-tree -r --name-only "$REF" public/)
echo "ref $(git -C "$REPO" rev-parse --short "$REF") · $toplam dosya · canlı=disk $ham · canlı=blob (bayt) $blobok"
printf "$liste\n"
rm -rf "$TMP"
