// ============================================================================
// KEŞİF KAMPÜSÜ — ATÖLYE ADI (sınıf) ve BELGEYE KİLİTLİ ÜRETİM ('materyal')
//
// NEDEN AYRI DOSYA: bu iki değişiklik ŞEMA sınırlarına dokunuyor ve şema
// hataları çalışma anında değil, ilk gerçek istekte ortaya çıkıyor.
//
// 🔴 YAKALADIĞI GERÇEK HATA: `grade` alanı metin için `.max(8)` idi.
// "Kimya ve İnsan Bilimleri Atölyesi" 33 karakter — yani atölyeler eklendiği
// anda sunucu her isteği reddedecekti. Arayüzde hiçbir belirti olmadan
// "model yanıt vermedi" gibi görünürdü.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { generateQuestionsSchema } from '../src/schemas/ai';

const temel = {
  subject: 'Keşif Kampüsü',
  outcomeCode: 'KK.KIM.1',
  outcomeLabel: 'Maddenin Tanecikli Yapısı',
};

describe('sınıf alanı: atölye adları', () => {
  it('33 karakterlik atölye adı geçer (eski 8 karakter sınırı reddediyordu)', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, grade: 'Kimya ve İnsan Bilimleri Atölyesi', mode: 'kazanim',
    });
    expect(r.success).toBe(true);
  });

  it('sayısal sınıf düzeyleri aynen çalışmaya devam eder', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, subject: 'Fen Bilimleri', grade: 7, mode: 'kazanim',
    });
    expect(r.success).toBe(true);
  });

  it('sınırsız uzunlukta değil: 60 karakteri aşan ad reddedilir', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, grade: 'A'.repeat(61), mode: 'kazanim',
    });
    expect(r.success).toBe(false);
  });
});

describe("'materyal' modu — belgeye kilitli üretim", () => {
  const belge = 'Sürtünme kuvveti hareketi engelleyen bir kuvvettir ve yüzeye bağlıdır.';

  it('geçerli bir moddur', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, grade: 'Fizik Atölyesi', mode: 'materyal', sourceText: belge,
    });
    expect(r.success).toBe(true);
  });

  it('BELGE METNİ ZORUNLUDUR — boş metinle "belgeye dayalı" iddiası reddedilir', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, grade: 'Fizik Atölyesi', mode: 'materyal', sourceText: '',
    });
    expect(r.success).toBe(false);
  });

  it('çok kısa belge metni de reddedilir (30 karakter alt sınırı)', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, grade: 'Fizik Atölyesi', mode: 'materyal', sourceText: 'kısa',
    });
    expect(r.success).toBe(false);
  });

  it('belgenin adı (materialName) kabul edilir', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, grade: 'Fizik Atölyesi', mode: 'materyal', sourceText: belge,
      materialName: 'Ders 3 — Sürtünme Kuvveti',
    });
    expect(r.success).toBe(true);
  });

  it('REGRESYON: kazanım modu hâlâ metin İSTEMİYOR', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, grade: 7, mode: 'kazanim', sourceText: '',
    });
    expect(r.success).toBe(true);
  });

  it('REGRESYON: kaynak modu hâlâ metin İSTİYOR', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel, grade: 7, mode: 'kaynak', sourceText: '',
    });
    expect(r.success).toBe(false);
  });
});
