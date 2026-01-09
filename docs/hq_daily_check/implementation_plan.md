# 実装計画: 医療連携IV ロジック修正

## 目的
`REQUIREMENTS.md` に定義された正しい医療連携IV (1/2/3) の判定ロジックを `get-hq-daily-data.ts` に実装する。また、資格 (`is_medical_target`) によるフィルタリングも追加する。

## 現状の課題
- レコードがあれば一律 "IV 1" と判定されている。
- 看護師の資格有無が考慮されていない。
- 同日担当数による区分の変化 (1名→IV1, 2名→IV2, 3名以上→IV3) が実装されていない。

## 実装詳細

### 1. データ取得の強化 (`get-hq-daily-data.ts`)

以下のデータを追加取得する:
- **Qualifications**: `is_medical_target = true` の資格IDリスト
- **Staffs**: 関連するスタッフの `qualification_id`
- **Medical Records**: 対象月の全 `medical_cooperation_records` (resident_id, staff_id, date)

### 2. ロジックフロー

1. **資格判定マップ作成**:
   - `TargetQualificationIds`: Set<string>
   - `MedicalStaffMap`: Map<string, boolean> (StaffId -> isTarget)

2. **日次スタッフ負荷マップ作成 (`DailyStaffLoadMap`)**:
   - 構造: `Record<DateString, Record<StaffId, ResidentCount>>`
   - 全レコードを走査し、`MedicalStaffMap` が true のスタッフについて、日ごとの担当利用者数をカウントする。

3. **マトリクス値計算 (`getDailyValues`)**:
   - 各日付・利用者について、担当スタッフID (`staff_id`) を特定。
   - スタッフが `MedicalStaffMap` に含まれていない場合 -> **対象外 (false)**
   - 含まれている場合、`DailyStaffLoadMap` からその日の担当数 (`count`) を取得。
   - 判定:
     - `medical_iv_1`: count === 1
     - `medical_iv_2`: count === 2
     - `medical_iv_3`: count >= 3

## 変更ファイル

- `app/actions/hq/get-hq-daily-data.ts`

## 検証プラン

- 既存のデータに対し、意図的に複数の利用者を同じ看護師に割り当て、IV 1 -> 2 -> 3 と変化することを確認する。
- 資格のないスタッフを割り当てた場合、IV判定がつかないことを確認する。
