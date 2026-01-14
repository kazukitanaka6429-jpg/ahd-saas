# ロゴ背景削除の実装計画

## ゴール
サイドバーのロゴ画像（`logo.png`）の白い背景を削除し、暗いサイドバーの背景に馴染むようにする。

## ユーザーレビューの必要性
> [!IMPORTANT]
> 画像生成ツールを使用してロゴの透過版を作成します。生成された画像の品質（エッジの綺麗さや、暗い背景上での視認性）を確認していただく必要があります。もし文字色が黒のままだと見えなくなるため、その場合は調整が必要です。

## 変更内容

### アセット
#### [NEW] [logo_transparent.png](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/public/logo_transparent.png)
- `public/logo.png` を元に、白背景を削除した新しい画像ファイルを生成します。

### コンポーネント
#### [MODIFY] [sidebar.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/layout/sidebar.tsx)
- ロゴの参照先を `/logo.png` から `/logo_transparent.png` に変更します。

## 検証計画

### 手動検証
1. アプリケーションをリロードする。
2. ダッシュボードのサイドバーを確認する。
3. ロゴの白い背景が消えていることを確認する。
4. ロゴの文字やマークが背景色と同化せずに視認できるか確認する。
