# パーティション子テーブル RLS 適用記録

## 概要

| 項目 | 内容 |
|------|------|
| **実施日** | 2026-01-14 |
| **目的** | Supabase本番環境で、パーティション子テーブルのRLS未設定警告（Security Advisor 10件）を安全に解消 |
| **ステータス** | ✅ 完了 |

---

## 対象テーブル

### グループA: 業務日誌（daily_records）
| 親テーブル | 子テーブル |
|------------|-----------|
| `daily_records_partitioned` | `daily_records_2024`, `_2025`, `_2026`, `_2027`, `_default` |

### グループB: 医療連携V（medical_coord_v_records）
| 親テーブル | 子テーブル |
|------------|-----------|
| `medical_coord_v_records` | `medical_coord_v_records_2024`, `_2025`, `_2026`, `_2027`, `_default` |

---

## 方針

1. **子テーブル直叩きの穴を塞ぐ**：子テーブルにも親と**完全同一条件**のポリシーを明示適用
2. **全許可禁止**：`USING(true)` / `WITH CHECK(true)` は絶対禁止
3. **段階適用**：Phase1（低リスク）→ 検証 → Phase2（残り）
4. **動的コピー**：`medical_coord_v_records_*` は親の `pg_policies` から動的に複製（手書きミス排除）

---

## 実行ファイル

| ファイル | 用途 |
|----------|------|
| `supabase/rls_fix/A1_phase1_apply_rls.sql` | Phase1: `_2027`, `_default` のみ適用 |
| `supabase/rls_fix/A2_phase2_apply_rls.sql` | Phase2: `_2024`, `_2025`, `_2026` 適用 |
| `supabase/rls_fix/B_verify_rls.sql` | 検証（RLS状態、ポリシー本数、親子完全一致） |
| `supabase/rls_fix/C_rollback_rls.sql` | 緊急復旧（RLS無効化） |

---

## 実行手順の要点

```
1. A1_phase1_apply_rls.sql 実行
2. B_verify_rls.sql で検証 → 合格条件確認
3. アプリ動作確認（業務日誌、医療連携V）
4. A2_phase2_apply_rls.sql 実行
5. B_verify_rls.sql で最終検証
6. Security Advisor で警告消失を確認
```

---

## 合格条件（最重要）

| 確認項目 | 期待値 |
|----------|--------|
| RLS状態 | 対象10テーブル全て `✅ RLS有効` |
| daily_records 親子完全一致 | 全行 `✅ 完全一致` |
| medical_coord_v_records 親子完全一致 | 全行 `✅ 完全一致` |
| Security Advisor | 該当10件の警告が消失 |

---

## 実施結果

| 確認項目 | 結果 |
|----------|------|
| Phase1 適用 | ✅ 完了 |
| Phase2 適用 | ✅ 完了 |
| B_verify 全項目 | ✅ 合格 |
| アプリスモークテスト | ✅ OK |
| Security Advisor 警告 | ✅ 0件（解消） |

### アプリスモークテスト詳細

| 画面 | 確認内容 | 結果 |
|------|----------|------|
| 業務日誌 (/daily-reports) | 一覧表示、新規作成、編集保存 | ✅ |
| 医療連携V (/medical-v) | 画面表示、チェック更新保存 | ✅ |
| 本社日次確認 (/hq/daily) | 閲覧、編集更新（admin権限） | ✅ |

---

## ロールバック手順

問題発生時は以下を実行：

```sql
-- C_rollback_rls.sql の内容
BEGIN;
ALTER TABLE public.daily_records_2024 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records_2025 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records_2026 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records_2027 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records_default DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_2024 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_2025 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_2026 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_2027 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_default DISABLE ROW LEVEL SECURITY;
COMMIT;
```

---

## 次回以降の注意（Cursor AI 運用ルール）

> **⚠️ 重要：RLS関連の警告や修正が発生した場合、必ずこのドキュメントを最初に参照すること**

### Cursor AI への指示

1. **RLS関連タスクを受けたら**：まず `docs/operations/rls_partition_fix.md` を確認
2. **新しいパーティションが追加された場合**：同様の手順で子テーブルにもRLS+ポリシーを適用
3. **ポリシー変更時**：親を変更したら子テーブルも同一条件に更新
4. **禁止事項**：
   - `USING(true)` / `WITH CHECK(true)` の全許可は絶対禁止
   - 親ポリシーを推測で書かない（必ず `pg_policies` から取得）
5. **検証必須**：適用後は必ず `B_verify_rls.sql` 相当の完全一致チェックを実行

### 将来のパーティション追加時

新しい年（例：`_2028`）のパーティションが追加された場合：
1. `A1_phase1_apply_rls.sql` を参考に新パーティション用SQLを作成
2. `B_verify_rls.sql` の対象テーブルリストに追加
3. 同様の段階適用・検証手順を実施

---

## 関連ファイル

- `supabase/rls_fix/` ディレクトリ配下の全ファイル
- `supabase/migrations/20250101000013_medical_v.sql` (親テーブルRLS設定)

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-01-14 | 初回実施：全10テーブルにRLS適用完了 |
