# Phase 3: HQ Daily Check Walkthrough

## 実装内容 (Changes Implemented)

### データベース
- `external_billing_imports` テーブルを追加 (CSVインポートデータ用)

### バックエンド (Server Actions)
- `importBillingCsv`: CSVアップロード、Shift-JISデコード、DB登録 (Wash-Replace)
  - 項目マッピング: 朝食, 昼食, 夕食, 日中活動, 夜勤加配
- `getHqDailyData`: 施設・月指定で、SaaSデータ(`daily_records`)とCSVデータをマージして取得

### フロントエンド (UI)
- `/hq/daily`: 本社日次確認画面
- `BillingImporter`: CSVアップロードコンポーネント (即時反映)
- `HqCheckMatrix`:
  - 5行固定表示 (朝食〜夜勤加配)
  - Sticky Layout (左:利用者/項目, 右:合計/判定, 中央:スクロール)
  - インタラクティブなセル (クリックで修正可能)
  - 判定機能 (SaaS数 ≠ CSV数 で赤色警告)

## 検証方法 (Verification Steps)

### 1. 準備
- サーバーを起動 (`npm run dev`)
- ブラウザで `http://localhost:3000/hq/daily` にアクセス

### 2. CSVインポート確認
1. 「請求データCSV取込」ボタンから、テスト用csv (Shift-JIS推奨) を選択
2. アップロード成功後、トースト通知が表示され、画面がリロードされるか確認
3. 「CSV」列に数字が反映されていることを確認

### 3. マトリクス表示・動作確認
1. **Sticky動作**: 横スクロール時、左側の「利用者名」「項目」と、右側の「合計」「判定」が固定されているか
2. **5行構成**: 各利用者につき、指定の5行が正しい色で表示されているか
3. **データ修正**: 1日〜31日のセルをクリックし、チェックマークのON/OFFが切り替わるか
4. **即時反映**: クリック後、右側の「SaaS」列の数字が即座に変わるか (リロードで確定)

### 4. 判定ロジック確認
1. SaaSデータとCSVデータが不一致の場合、「判定」列が赤色(NG)になるか
2. 一致している場合、青色(OK)になるか

## 既知の制限 (Limitations)
- CSVのヘッダーは「利用者名」「利用料項目名」「数量」を想定しています。これらが存在しない場合、インポートエラーになります。
- 現状、SaaS上の施設名はログインユーザーの所属施設(`staff.facility_id`)に固定されています。
