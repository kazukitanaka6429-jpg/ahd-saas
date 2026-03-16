# 監査ログ機能の全面強化 — 実装計画

## 概要
ログ分析画面を「監査完全対応済み」と謳えるレベルに強化する。
既存の`operation_logs`テーブルと`logOperation`ユーティリティを拡張し、不足している7項目のログ取得を実現する。

## ユーザー確認事項

> [!IMPORTANT]
> 以下の2点について、実装前にご判断をお願いします。
>
> **Q1. 閲覧ログ（#4）の対象範囲はどこまでにしますか？**
> - **A案（推奨）**: 利用者の個人情報画面を開いた時のみ記録する（個人情報保護の観点で十分）
> - **B案**: すべての画面アクセスを記録する（ログ量が膨大になる可能性あり）
>
> **Q2. ログの保持期間（#5）は何年にしますか？**
> - **A案（推奨）**: 1年分を通常表示。1年以上前のログは「アーカイブ」扱いにして検索可能だが通常一覧には出さない
> - **B案**: 全期間を無制限に保持・表示する

---

## 対応する不足項目と変更内容

### #1. 施設側の操作ログが未記録 → **既に大半が対応済み（微修正のみ）**

調査の結果、`logOperation`は以下の12ファイル・34箇所で既に呼び出されていました：
- `daily-record.ts`（日報保存）, `resident.ts`（利用者の作成/更新/削除）, `staff.ts`（職員の作成/更新/削除）
- `facility.ts`（施設の作成/更新/削除）, `shift.ts`（シフト更新）, `medical-cooperation.ts`（医療連携）
- `medical-v/upsert-medical-v.ts`, `audit/manual.ts`, `resident-documents.ts`, `hq/upsert-and-log.ts`
- `residents/page.tsx`（利用者一覧の閲覧ログ）

**追加が必要な箇所**: `notifications.ts`（通知の作成/解決操作）のみ。

---

### #2. ログイン・ログアウトの記録

#### 変更ファイル
- [MODIFY] [middleware.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/middleware.ts) — ログイン検知
- [MODIFY] [operation-logger.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/lib/operation-logger.ts) — `LOGIN` / `LOGOUT` を `TargetResource` に追加
- [MODIFY] [operation-log-labels.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/lib/operation-log-labels.ts) — ラベル追加

**方針**: ログイン成功時にミドルウェアで`logOperation`を呼び出す。ログアウトはサインアウトアクション内で記録する。

---

### #3. 削除操作のデータスナップショット

#### 変更ファイル
- [MODIFY] [resident.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/resident.ts) — 削除前にデータを取得して`details.before`に記録
- [MODIFY] [staff.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/staff.ts) — 同上

**方針**: 削除操作の実行前に、対象レコードのデータを取得し、`logOperation`の`before`パラメータに渡す。削除後のデータは`null`として記録。

---

### #4. 閲覧ログ（READ操作）

#### 変更ファイル
- [MODIFY] [residents/page.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/residents/page.tsx) — 既に実装済み ✅
- [NEW] 利用者詳細ページに閲覧ログを追加（Q1の回答次第）

**方針**: 利用者の個人情報画面を開いた時点で`READ`操作として記録する。

---

### #5. ログの保持期間・自動アーカイブ

#### 変更ファイル
- [MODIFY] [get-operation-logs.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/admin/get-operation-logs.ts) — デフォルトで直近1年分のみ取得
- [MODIFY] [client.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/analysis/client.tsx) — 「アーカイブを含む」チェックボックスを追加

**方針**: Q2の回答に基づき実装。推奨案ではUIに「過去のログも表示」トグルを追加し、デフォルトOFFとする。

---

### #6. 改ざん防止（ログの不変性）

#### DB変更
- `operation_logs`テーブルに対して、`UPDATE`と`DELETE`を禁止するRLSポリシーを追加

**方針**: データベースレベルで「ログは追記のみ（INSERT ONLY）」に制限する。管理者であってもログの変更・削除が不可能になる。

---

### #7. アラート・異常検知

#### 変更ファイル
- [MODIFY] [client.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/analysis/client.tsx) — 統計サマリーカードを追加

**方針**: ログ分析画面の上部に、以下の統計情報をカード形式で表示：
- 本日の操作件数
- 直近24時間の`DELETE`操作件数（赤色で強調）
- 深夜帯（22:00〜6:00）の操作件数

---

### UI改修: フィルター・ラベルの拡張

#### 変更ファイル
- [MODIFY] [client.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/analysis/client.tsx) — フィルター選択肢に`LOGIN`/`LOGOUT`/`READ`を追加
- [MODIFY] [operation-log-labels.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/lib/operation-log-labels.ts) — 新しいラベル定義の追加

---

## 検証計画

### 自動テスト（Jest）
- `operation-logger.ts`の正常系テスト（各ActionTypeでINSERTが実行されること）
- `operation-logger.ts`の異常系テスト（DB接続エラー時にメイン処理をブロックしないこと）
- `get-operation-logs.ts`のフィルター正常系テスト
- `get-operation-logs.ts`の権限テスト（admin以外は空結果を返すこと）

### 手動検証
- ログ分析画面で各操作タイプのフィルタリングが正しく動作すること
- CSV出力に新規項目（LOGIN/LOGOUT/READ）が含まれること
