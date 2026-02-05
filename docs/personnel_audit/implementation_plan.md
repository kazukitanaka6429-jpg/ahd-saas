# 人員配置監査システム 実装計画書

## ゴール
グループホーム（GH）のスタッフ配置状況を監査するための「人員配置表」機能を実装します。
外部の勤怠データやスポットバイトデータをインポートし、訪問看護などのGH業務外時間を差し引くことで、GHとしての純粋な勤務時間を算出します。
算出された時間に基づき、日中（1名以上）および夜間（2名以上）の配置基準が1分単位で満たされているかを厳密にチェックします。

**中心となるロジック:**
`GH勤務時間 = (勤怠実績 OR 業務日誌手入力 OR スポットバイト) - (訪問看護時間 + その他手入力控除)`

## ユーザー確認事項
> [!IMPORTANT]
> **CSVフォーマット確認:** 以下のCSVサンプルをチャットにてご提供ください（完了済み）。
> 1.  勤怠管理システム（Kintai）
> 2.  スポットバイト（カイテクなど）
> 3.  訪問看護実施記録
>
> **スタッフ紐付け:**
> - システムは **漢字氏名（完全一致）** でスタッフを紐付けます。
> - **要件:** CSV内の氏名がDB内のスタッフと一致しない場合、インポート画面でエラー一覧を表示し、ユーザーが確認できるようにします。
> - 職員番号（ID）による管理は将来的なフェーズで検討します。

## 変更内容

### 1. データベーススキーマ（新規テーブル）

#### [NEW] `attendance_records` (勤怠実績)
外部の勤怠システムからのインポートデータを保持します。（スキーマはサンプル待ちで仮定）
- `id` (uuid)
- `facility_id` (uuid)
- `staff_name` (text, CSVからの生の氏名)
- `work_date` (date)
- `start_time` (time)
- `end_time` (time)
- `break_time_minutes` (int)

#### [NEW] `spot_job_records` (スポットバイト)
スポットバイトサービス（カイテクなど）からのインポートデータを保持します。
- `id` (uuid)
- `facility_id` (uuid)
- `job_apply_id` (text) - CSV: `案件応募ID`
- `job_id` (text) - CSV: `案件ID`
- `work_date` (date) - CSV: `勤務予定日`
- `start_time` (time) - CSV: `出勤時刻_実労働` または `出勤予定時刻`
- `end_time` (time) - CSV: `退勤時刻_実労働` または `退勤予定時刻`
- `staff_name` (text) - CSV: `ワーカーの名前`
- `provider` (text) - 例: 'Kaitekku'

#### [NEW] `visiting_nursing_records` (訪問看護記録)
控除対象となる訪問看護の記録を保持します。
- `id` (uuid)
- `facility_id` (uuid)
- `resident_name` (text) - CSV: `利用者名`
- `visit_date` (date) - CSV: `訪問日`
- `start_time` (time) - CSV: `開始時間`
- `end_time` (time) - CSV: `終了時間`
- `nursing_staff_name` (text) - CSV: `主訪問者`
- `secondary_nursing_staff_name_1` (text) - CSV: `副訪問者①`
- `secondary_nursing_staff_name_2` (text) - CSV: `副訪問者②`
- `secondary_nursing_staff_name_3` (text) - CSV: `副訪問者③`
- `service_type` (text) - CSV: `サービス内容`

#### [NEW] `manual_work_records` (手動勤務登録)
監査画面から手動で登録する「勤務時間」データ。業務日誌やCSVがない、あるいは補正が必要な場合に使用します。
- `id` (uuid)
- `facility_id` (uuid)
- `staff_id` (uuid)
- `target_date` (date)
- `start_time` (time)
- `end_time` (time)
- `is_night_shift` (boolean) - UIサポート用
- `note` (text)

#### [NEW] `manual_deductions` (手動控除)
タイプ⑤の「その他手入力」による控除時間を保持します。
- `id` (uuid)
- `facility_id` (uuid)
- `staff_id` (uuid)
- `target_date` (date)
- `start_time` (time)
- `end_time` (time)
- `reason` (text)

### 2. ロジック実装（計算エンジン）

#### [NEW] `lib/audit/time-calculator.ts`
- **`calculateDailyPersonnel(facilityId, date)`**
    1.  **データ取得:**
        -   `AttendanceRecords` (ソースA - 勤怠CSV)
        -   `ManualWorkRecords` (ソースB - 手動登録)
        -   `DailyRecords` (ソースC - 業務日誌)
        -   `SpotJobRecords` (ソースD)
        -   `VisitingNursingRecords` (控除1)
        -   `ManualDeductions` (控除2)
    2.  **スタッフごとの処理:**
        -   **ベース時間の決定（優先順位）**:
            1.  `AttendanceRecords` (CSV) があれば採用。
            2.  `ManualWorkRecords` (手動) があれば採用。
            3.  `DailyRecords` (業務日誌) があれば **標準時間** を採用:
                -   日勤: 8:30〜17:30
                -   夜勤: 16:30〜9:30
        -   `SpotJob` の時間を追加。
        -   **`VisitingNursing`（訪問看護）の控除**:
            -   **主訪問者**: 開始から終了までの全時間を控除。
            -   **副訪問者**:
                -   所要時間 **90分未満**: 開始から終了までの全時間を控除。
                -   所要時間 **90分以上**: **開始から30分間のみ** を控除。
        -   `ManualDeductions` を控除。
    3.  **集計（1分単位のバケット方式）:**
        -   1日分の配列 `int[1440]` (0:00 - 23:59) を作成。
        -   スタッフが在席している（GH勤務時間 > 0）各分について、カウントをインクリメント。
    4.  **検証:**
        -   **日中 (5:01-21:59)**: カウント >= 1 であるか確認。
        -   **夜間 (22:00-5:00 翌朝)**: カウント >= 2 であるか確認。
    5.  **結果:**
        -   合格/不合格
        -   違反区間のリスト

### 3. UI実装

#### [NEW] `app/(dashboard)/audit/personnel/page.tsx`
- **ヘッダー**: 施設選択、日付選択（月/日）。
- **アクションバー**: 「CSVインポート」、「勤務追加（手動）」、「控除追加（手動）」。
- **勤務追加ダイアログ**:
    -   スタッフ選択プルダウン。
    -   **自動入力ロジック**: スタッフ選択時、その日の業務日誌に記録があれば、日勤(8:30-17:30)/夜勤(16:30-9:30)時間を開始・終了フォームに自動セットする。
- **メインビュー（タイムライン）**:
    -   スタッフごとの可視化行。
    -   **青色バー**: ベース勤務時間。
    -   **赤色オーバーレイ**: 控除時間。
    -   **緑色バー**: 有効なGH勤務時間。
    -   **アラートバナー**: 画面上部に「問題なし」または「違反検出: 14:02-14:05」を表示。

#### [NEW] `app/actions/audit/imports.ts`
- `importAttendanceCSV(formData)`: CSV解析、氏名マッチング、UPSERT処理。
- `importSpotJobCSV(formData)`
- `importNursingCSV(formData)`

## 検証計画

### 自動テスト
- `calculateDailyPersonnel` ロジックに対してユニットテストを作成します:
    - ケース1: 単純な正常シフト (9:00-18:00)。
    - ケース2: 控除ロジック (9:00-18:00 から 10:00-11:00 の看護時間を引く)。
    - ケース3: 重複チェック (シフト交代時の 16:59, 17:00, 17:01 の挙動)。
    - ケース4: 夜間の境界値チェック (22:00)。
    - ケース5: 副訪問者の90分ルール (90分以上の場合、30分だけ引かれているか)。

### 手動検証
1.  **インポートテスト**: サンプルCSVをアップロードし、DBにデータが保存されることを確認。
2.  **表示確認**: タイムラインUIで「引き算」が正しく描画されているか確認。
3.  **アラート確認**: 意図的に5分間の空白（レコード削除など）を作り、システムが「違反」と判定するか確認。
