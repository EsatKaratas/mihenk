// ============================================================================
// src/lib/prompts.ts testleri — Madde 2.
//
// NEDEN: prompts.ts jüriye "modele ne söylüyoruz?" diye gösterilen dosya
// (dosyanın kendi başlığı). buildQuestionPrompt'a topicArea/bloomFocus
// eklenirken (a) mevcut davranışın (topicArea/bloomFocus verilmediğinde)
// DEĞİŞMEDİĞİNİ ve (b) yeni alanların yalnızca kendi koşullarında
// göründüğünü doğrulamak, sessiz bir regresyonu (ör. varsayılanda bile
// yönlendirme satırı sızması) test aşamasında yakalar.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { buildQuestionPrompt, type QuestionSpec } from '../src/lib/prompts';

const temelSpec: QuestionSpec = {
  subject: 'Fen Bilimleri',
  grade: 7,
  outcomeCode: 'FEN.7.1.2',
  outcomeLabel: 'Sürtünme kuvvetinin etkilerini açıklar',
  mcCount: 2,
  openCount: 1,
  optionCount: 4,
};

describe('buildQuestionPrompt — Madde 2 eklemeleri', () => {
  it('topicArea/bloomFocus verilmezse eski davranış aynen korunur', () => {
    const p = buildQuestionPrompt(temelSpec, 'Sürtünme yüzeye bağlıdır.');
    expect(p).not.toContain('Konu alanı:');
    expect(p).not.toContain('Bilişsel düzey yönlendirmesi');
  });

  it('topicArea verilince bağlama ek satır olarak eklenir', () => {
    const p = buildQuestionPrompt({ ...temelSpec, topicArea: 'Kuvvet ve Hareket' }, 'metin');
    expect(p).toContain('Konu alanı: Kuvvet ve Hareket');
  });

  it('bloomFocus "dengeli" iken yönlendirme satırı EKLENMEZ (varsayılan = mevcut davranış)', () => {
    const p = buildQuestionPrompt({ ...temelSpec, bloomFocus: 'dengeli' }, 'metin');
    expect(p).not.toContain('Bilişsel düzey yönlendirmesi');
  });

  it('bloomFocus "temel" iken alt düzey yönlendirmesi eklenir', () => {
    const p = buildQuestionPrompt({ ...temelSpec, bloomFocus: 'temel' }, 'metin');
    expect(p).toContain('Bilişsel düzey yönlendirmesi');
    expect(p).toContain('hatirlama');
  });

  it('bloomFocus "ust" iken üst düzey yönlendirmesi eklenir', () => {
    const p = buildQuestionPrompt({ ...temelSpec, bloomFocus: 'ust' }, 'metin');
    expect(p).toContain('Bilişsel düzey yönlendirmesi');
    expect(p).toContain('analiz');
  });

  it('yönlendirme bir zorunluluk değil, eğilim olarak yazılır (HITL: karar öğretmende kalır)', () => {
    const p = buildQuestionPrompt({ ...temelSpec, bloomFocus: 'ust' }, 'metin');
    expect(p).toContain('bir zorunluluk değil');
  });

  it('çıktı JSON şeması (alan adları) topicArea/bloomFocus ile değişmez', () => {
    const bos = buildQuestionPrompt(temelSpec, 'metin');
    const dolu = buildQuestionPrompt({ ...temelSpec, topicArea: 'X', bloomFocus: 'ust' }, 'metin');
    // Her iki durumda da aynı ÇIKTI BİÇİMİ bloğu (alan adları) yer almalı.
    ['"questions"', '"type"', '"correctKey"', '"distractorRationale"', '"needsSource"'].forEach((alan) => {
      expect(bos).toContain(alan);
      expect(dolu).toContain(alan);
    });
  });
});
