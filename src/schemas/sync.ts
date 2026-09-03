// ============================================================================
// Zod şemaları — cihazlar arası senkron katmanı (§28b)
//
// agents.md §2: doğrulamasız c.req.json() kullanımı yasaktır. Bu dosyadaki her
// şema bir sunucu ucunun GİRDİ sözleşmesidir.
//
// Neden `payload` serbest bir JSON dizesi:
// Senkronlanan şey istemcinin oturum durumudur (yanıtlar, AI değerlendirmesi,
// öğretmen onayları). Bu yapı `public/app.js` tarafında yaşar ve ürün
// geliştikçe alan kazanır. Sunucu onu YORUMLAMAZ, yalnızca taşır ve saklar;
// bu yüzden şema alan alan kopyalanmaz. Buna karşılık BOYUT SINIRLANIR
// (agents.md §4 kaynak sınırı disiplini) ve JSON olarak ayrıştırılabilirliği
// sunucuda doğrulanır — bozuk gövde saklanmaz.
// ============================================================================

import { z } from 'zod';

/** Tek bir oturum gövdesi için üst sınır. Ölçüldü: 5 soruluk tam bir oturum
 *  (yanıtlar + AI değerlendirmesi + rubrik kırılımı) ~4-8 KB. 256 KB, gerçekçi
 *  bir sınavın çok üstünde ama D1 satırını da patlatmayan bir tavan. */
export const MAX_PAYLOAD_CHARS = 262144;

/** Oda kodu. BÜYÜK harf + rakam, karışan karakterler (0/O, 1/I) elenmiştir;
 *  kod sesli olarak okunup elle yazılacak. */
export const ROOM_RE = /^[A-HJ-NP-Z2-9]{4,12}$/;

const roomSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => ROOM_RE.test(v), 'Oda kodu 4-12 karakter olmalı ve yalnızca A-Z (I,O hariç) ile 2-9 içermelidir');

/** JSON olarak ayrıştırılabildiğini sunucuda doğrula: bozuk gövde saklanmaz,
 *  aksi hâlde hata çekme (pull) anında ve BAŞKA BİR CİHAZDA patlardı. */
const payloadSchema = z
  .string()
  .min(2)
  .max(MAX_PAYLOAD_CHARS)
  .refine((s) => {
    try {
      JSON.parse(s);
      return true;
    } catch {
      return false;
    }
  }, 'payload geçerli bir JSON dizesi olmalıdır');

export const SESSION_STATUSES = ['not_started', 'in_progress', 'submitted', 'graded'] as const;

export const syncPushSchema = z.object({
  room: roomSchema,
  exam: z
    .object({
      examId: z.number().int().min(0),
      title: z.string().max(200).default(''),
      payload: payloadSchema,
    })
    .optional(),
  sessions: z
    .array(
      z.object({
        examId: z.number().int().min(0),
        studentId: z.number().int().min(0),
        studentName: z.string().max(120).default(''),
        status: z.enum(SESSION_STATUSES),
        payload: payloadSchema,
      })
    )
    .max(60)
    .default([]),
});

export const syncPullSchema = z.object({
  room: roomSchema,
});

export const syncResetSchema = z.object({
  room: roomSchema,
});
