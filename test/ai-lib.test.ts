// ============================================================================
// src/lib/ai.ts testleri — model yanıtı ayrıştırma ve sağlayıcı seçimi.
//
// extractJson bu projede GERÇEK hatalar yüzünden yazıldı (PROGRESS §5):
//  - madde 8: bazı Workers AI modelleri `response` alanında zaten
//    ayrıştırılmış NESNE döndürüyor; String(...) uygulanınca
//    "[object Object]" olup JSON.parse patlıyordu.
//  - madde 9: yanıt token sınırında kesilince JSON dengeli kapanmıyordu.
// Bu testler o iki durumu kalıcı olarak korur.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { extractJson, providerName, modelName, fallbackEnv, fallbackConfigured } from '../src/lib/ai';

describe('extractJson', () => {
  it('düz JSON metnini ayrıştırır', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('model ZATEN NESNE döndürdüyse doğrudan kullanır (PROGRESS §5 madde 8)', () => {
    const nesne = { questions: [{ body: 'x' }] };
    expect(extractJson(nesne)).toBe(nesne);
  });

  it('```json çitlerini soyar', () => {
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('çitsiz ``` bloklarını da soyar', () => {
    expect(extractJson('```\n{"a":3}\n```')).toEqual({ a: 3 });
  });

  it('giriş cümlesini tolere eder', () => {
    expect(extractJson('İşte sonuç:\n{"a":4}')).toEqual({ a: 4 });
  });

  it('sondaki açıklamayı tolere eder', () => {
    expect(extractJson('{"a":5}\nUmarım yardımcı olur.')).toEqual({ a: 5 });
  });

  it('dizi kökünü ayrıştırır', () => {
    expect(extractJson('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('iç içe nesnelerde doğru kapanışı bulur', () => {
    expect(extractJson('{"a":{"b":{"c":1}},"d":2}')).toEqual({ a: { b: { c: 1 } }, d: 2 });
  });

  it('dize içindeki süslü parantezi sınır sanmaz', () => {
    expect(extractJson('{"metin":"burada } var","x":1}')).toEqual({ metin: 'burada } var', x: 1 });
  });

  it('kaçışlı tırnağı doğru işler', () => {
    expect(extractJson('{"metin":"o \\"dedi\\" ki"}')).toEqual({ metin: 'o "dedi" ki' });
  });

  it('KESİLMİŞ yanıtta anlaşılır hata verir (PROGRESS §5 madde 9)', () => {
    expect(() => extractJson('{"a":1,"b":')).toThrowError(/kapanm/i);
  });

  it('JSON hiç yoksa anlaşılır hata verir', () => {
    expect(() => extractJson('burada hiç JSON yok')).toThrowError(/JSON bulunamad/i);
  });

  it('boş girdide çökmez, hata mesajı verir', () => {
    expect(() => extractJson('')).toThrowError();
  });
});

describe('providerName / modelName', () => {
  it('sağlayıcı verilmediyse workers-ai varsayar', () => {
    expect(providerName({})).toBe('workers-ai');
  });

  it('sağlayıcı adını küçük harfe çevirir', () => {
    expect(providerName({ AI_PROVIDER: 'OpenAI' })).toBe('openai');
  });

  it('model verilmediyse workers-ai için varsayılan model döner', () => {
    expect(modelName({})).toContain('@cf/');
  });

  it('harici sağlayıcıda model yoksa "bilinmiyor" döner', () => {
    expect(modelName({ AI_PROVIDER: 'openai' })).toBe('bilinmiyor');
  });

  it('verilen modeli aynen döndürür', () => {
    expect(modelName({ AI_MODEL: 'gemini-3.7-flash' })).toBe('gemini-3.7-flash');
  });
});

describe('fallbackEnv / fallbackConfigured', () => {
  it('yedek sağlayıcı tanımsızsa null döner', () => {
    expect(fallbackEnv({})).toBeNull();
    expect(fallbackConfigured({})).toBe(false);
  });

  it('yedek env birincil gibi görünen bir görünüm üretir', () => {
    const y = fallbackEnv({
      AI_FALLBACK_PROVIDER: 'openai',
      AI_FALLBACK_MODEL: 'gemini-3.7-flash',
      AI_FALLBACK_API_KEY: 'anahtar',
    });
    expect(y).not.toBeNull();
    expect(providerName(y!)).toBe('openai');
    expect(modelName(y!)).toBe('gemini-3.7-flash');
  });

  it('anahtar yoksa yedek yapılandırılmış sayılmaz', () => {
    expect(fallbackConfigured({ AI_FALLBACK_PROVIDER: 'openai', AI_FALLBACK_MODEL: 'm' })).toBe(false);
  });

  it('anahtar varsa yedek yapılandırılmış sayılır', () => {
    expect(
      fallbackConfigured({ AI_FALLBACK_PROVIDER: 'openai', AI_FALLBACK_MODEL: 'm', AI_FALLBACK_API_KEY: 'k' })
    ).toBe(true);
  });

  it('ANAHTAR TEMİZLİĞİ: BOM ve boşluk kırpılır (gerçek hata, AKTARIM §6)', () => {
    // Not Defteri ile kaydedilen anahtar başına görünmez UTF-8 BOM ekliyordu
    // ve Google "Please pass a valid API key" diyordu.
    const y = fallbackEnv({
      AI_FALLBACK_PROVIDER: 'openai',
      AI_FALLBACK_MODEL: 'm',
      AI_FALLBACK_API_KEY: '﻿  gercek-anahtar  ',
    });
    expect(y!.AI_API_KEY).toBe('gercek-anahtar');
  });

  it('sıfır genişlikli karakterler de temizlenir', () => {
    const y = fallbackEnv({
      AI_FALLBACK_PROVIDER: 'openai',
      AI_FALLBACK_MODEL: 'm',
      AI_FALLBACK_API_KEY: 'anah​tar',
    });
    expect(y!.AI_API_KEY).toBe('anahtar');
  });
});
