#!/usr/bin/env python3
"""
TurkishMMLU (AYueksel/TurkishMMLU, test split, 900 soru) -> T3 Ölçme-Değerlendirme
D1 şemasına (schema.sql) uygun seed SQL dönüştürücüsü.

Kaynak veride tespit edilen ve burada çözülen sorunlar:
  1. Ders adları İngilizce            -> lise ders adı + kısa kod eşlemesi (SUBJECT_MAP)
  2. Kazanım (learning_outcome) yok    -> ders+sınıf başına PLACEHOLDER kazanım satırı
                                           üretilir; status='pending_review' ile içeri
                                           aktarılır (İçerik Uzmanı ince taneli kazanımı
                                           sonradan atar — HITL ilkesi bozulmaz).
  3. answer index (0-4) / choices list -> correct_option_key (harf) + options JSON
                                           ({"key":"A","text":"..."})
  4. ai_estimated_time_sec eksik       -> zorluğa göre sabit heuristik süre atanır.
  5. LaTeX/formül ağırlıklı sorular    -> ayrı bir JSON'a alınır (varsayılan seed'e
                                           girmez), çünkü prototipte formül render'ı yok.

Kullanım:
    python3 convert_turkishmmlu.py /path/to/TurkishMMLU_test.json
Çıktılar (bu script'in bulunduğu klasöre yazılır):
    01_learning_outcomes.sql
    02_questions.sql
    excluded_latex_flagged.json
    import_summary.json
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

OUT_DIR = Path(__file__).parent

# 1) Ders adı eşlemesi: TurkishMMLU (EN) -> (kısa kod, TR ders adı)
SUBJECT_MAP = {
    "Biology": ("BIY", "Biyoloji"),
    "Geography": ("COG", "Coğrafya"),
    "Religion and Ethics": ("DKAB", "Din Kültürü ve Ahlak Bilgisi"),
    "Philosophy": ("FEL", "Felsefe"),
    "Physics": ("FIZ", "Fizik"),
    "Chemistry": ("KIM", "Kimya"),
    "Mathematics": ("MAT", "Matematik"),
    "History": ("TAR", "Tarih"),
    "Turkish Language and Literature": ("TDE", "Türk Dili ve Edebiyatı"),
}

# 4) Zorluk -> tahmini çözüm süresi (saniye) heuristiği (dataset bu alanı vermiyor)
DIFFICULTY_TIME_SEC = {"easy": 45, "medium": 75, "hard": 120}

# 5) LaTeX/formül tespiti için basit regex (matematik/fizik/kimya sorularında yoğun)
LATEX_PATTERN = re.compile(r"\\[a-zA-Z]+|\$.*?\$|\\frac|\\sqrt|\^\{|_\{")


def sql_escape(text: str) -> str:
    """SQLite tek tırnak kaçışı."""
    return text.replace("'", "''")


def option_letter(index: int) -> str:
    return chr(ord("A") + index)


def build_options_json(choices: list[str]) -> str:
    options = [{"key": option_letter(i), "text": c} for i, c in enumerate(choices)]
    return json.dumps(options, ensure_ascii=False)


def has_latex(record: dict) -> bool:
    text = record["question"] + " ".join(record["choices"])
    return bool(LATEX_PATTERN.search(text))


def main(src_path: str) -> None:
    with open(src_path, encoding="utf-8") as f:
        data = json.load(f)

    outcome_codes = {}  # (subject_code, grade) -> code string
    grouped_by_subject_grade = defaultdict(list)

    clean, flagged = [], []
    for r in data:
        (flagged if has_latex(r) else clean).append(r)

    # ---- 01_learning_outcomes.sql : placeholder kazanım satırları ----
    outcome_lines = [
        "-- TurkishMMLU içe aktarımı için PLACEHOLDER kazanım satırları.",
        "-- Bunlar ince taneli kazanım (örn. MAT.9.2.1) DEĞİLDIR — sadece ders+sınıf",
        "-- düzeyinde kaba bir gruplamadır. İçerik Uzmanı, ilişkili sorulara gerçek",
        "-- kazanım kodu atadıkça bu placeholder'lar terk edilebilir.",
        "",
    ]
    seen_codes = set()
    for r in clean + flagged:
        subj_en = r["subject"]
        grade = int(r["metadata"]["grade"])
        code_prefix, subj_tr = SUBJECT_MAP[subj_en]
        code = f"{code_prefix}.{grade}.GENEL"
        outcome_codes[(subj_en, grade)] = code
        grouped_by_subject_grade[(subj_en, grade)].append(r)
        if code not in seen_codes:
            seen_codes.add(code)
            desc = (
                f"{subj_tr} {grade}. Sınıf — Genel (TurkishMMLU içe aktarım placeholder'ı; "
                f"gerçek kazanım ataması İçerik Uzmanı tarafından yapılmalıdır)"
            )
            outcome_lines.append(
                "INSERT INTO learning_outcomes (code, description, subject, grade_level) "
                f"VALUES ('{sql_escape(code)}', '{sql_escape(desc)}', '{sql_escape(subj_tr)}', {grade});"
            )

    (OUT_DIR / "01_learning_outcomes.sql").write_text("\n".join(outcome_lines) + "\n", encoding="utf-8")

    # ---- 02_questions.sql : temiz (LaTeX'siz) sorular ----
    q_lines = [
        "-- TurkishMMLU (test split) içe aktarımı — LaTeX/formül içermeyen sorular.",
        "-- status='pending_review': hiçbir soru onaysız soru havuzuna girmez (HITL).",
        "-- learning_outcome_id, 01_learning_outcomes.sql ile aynı transaction/dosya",
        "-- sırasında eklenmiş placeholder koduna göre alt-sorgu ile bağlanır.",
        "",
    ]
    difficulty_count = Counter()
    for r in clean:
        subj_en = r["subject"]
        grade = int(r["metadata"]["grade"])
        code = outcome_codes[(subj_en, grade)]
        difficulty = r["metadata"]["difficulty"]
        difficulty_count[difficulty] += 1
        time_sec = DIFFICULTY_TIME_SEC.get(difficulty, 90)
        body = sql_escape(r["question"])
        options_json = sql_escape(build_options_json(r["choices"]))
        correct_key = option_letter(r["answer"])

        q_lines.append(
            "INSERT INTO questions (learning_outcome_id, type, body, options, "
            "correct_option_key, difficulty, ai_estimated_time_sec, status) "
            "SELECT id, 'multiple_choice', "
            f"'{body}', '{options_json}', '{correct_key}', '{sql_escape(difficulty)}', "
            f"{time_sec}, 'pending_review' "
            f"FROM learning_outcomes WHERE code = '{sql_escape(code)}';"
        )

    (OUT_DIR / "02_questions.sql").write_text("\n".join(q_lines) + "\n", encoding="utf-8")

    # ---- excluded_latex_flagged.json : formül ağırlıklı sorular (manuel/KaTeX için) ----
    flagged_out = [
        {
            **r,
            "_exclusion_reason": "latex_or_formula_markup_detected",
        }
        for r in flagged
    ]
    (OUT_DIR / "excluded_latex_flagged.json").write_text(
        json.dumps(flagged_out, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # ---- özet ----
    summary = {
        "source_total": len(data),
        "imported_clean": len(clean),
        "excluded_latex_flagged": len(flagged),
        "placeholder_learning_outcomes_created": len(seen_codes),
        "difficulty_distribution_imported": dict(difficulty_count),
        "subject_grade_pairs": sorted([f"{s} / {g}" for (s, g) in outcome_codes]),
    }
    (OUT_DIR / "import_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "TurkishMMLU_test.json")
