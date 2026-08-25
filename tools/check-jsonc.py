# -*- coding: utf-8 -*-
"""JSONC doğrulayıcı.

Neden var: yorumları basit bir regex (`//[^\n]*`) ile ayıklamak, dize
içindeki `//` dizisini de (örneğin bir URL'yi) yorum sanır ve dosyayı
bozuk gösterir. Bu ayrıştırıcı dize sınırlarına saygı duyar.

Kullanım:  python tools/check-jsonc.py wrangler.demo.jsonc
"""
import io
import json
import sys

BACKSLASH = chr(92)


def strip_comments(s):
    out = []
    i = 0
    n = len(s)
    in_str = False
    esc = False
    while i < n:
        ch = s[i]
        if in_str:
            out.append(ch)
            if esc:
                esc = False
            elif ch == BACKSLASH:
                esc = True
            elif ch == '"':
                in_str = False
            i += 1
            continue
        if ch == '"':
            in_str = True
            out.append(ch)
            i += 1
            continue
        if ch == '/' and i + 1 < n and s[i + 1] == '/':
            while i < n and s[i] != '\n':
                i += 1
            continue
        if ch == '/' and i + 1 < n and s[i + 1] == '*':
            i += 2
            while i + 1 < n and not (s[i] == '*' and s[i + 1] == '/'):
                i += 1
            i += 2
            continue
        out.append(ch)
        i += 1
    return ''.join(out)


def main():
    if len(sys.argv) < 2:
        print('kullanim: python tools/check-jsonc.py <dosya.jsonc>')
        return 2
    hatali = 0
    for path in sys.argv[1:]:
        try:
            raw = io.open(path, encoding='utf-8').read()
            data = json.loads(strip_comments(raw))
        except Exception as e:
            print('HATA  %s -> %s' % (path, e))
            hatali += 1
            continue
        print('GECERLI  %-24s %d ust duzey anahtar' % (path, len(data)))
        for k, v in (data.get('vars') or {}).items():
            print('           %-26s %s' % (k, v))
    return 1 if hatali else 0


if __name__ == '__main__':
    sys.exit(main())
