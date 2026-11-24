# 雪見 活動レポート ダッシュボード（GitHub Pages 公開対応版）

GitHub Pages などの静的ホスティングサービスにそのままアップロードして公開できる構成です。

## フォルダ構成
```text
├── index.html               # メインHTML（OGP・ファビコン・相対パス設定済み）
├── .nojekyll                # GitHub Pages の不要なビルド処理をスキップする設定ファイル
├── data/
│   └── default_data.json    # 公開時に初期表示されるデータ（JSON出力したファイルで上書き）
├── css/
│   └── style.css            # デザイン・ダークモード・カレンダースタイル
└── js/
    ├── config.js            # カラー定数・日付正規化・種別判定ヘルパー
    ├── store.js             # 状態管理・localStorage永続化・JSON出力
    ├── parser.js            # Excel / CSV / JSON の自動読み込み・パース処理
    ├── modals.js            # 詳細モーダル（最新歌唱日ソート）・データ編集モーダル
    ├── tabs/                # 各タブの描画モジュール（7ファイル）
    └── main.js              # 全体制御・公開JSON自動読み込み・初期化
```

## GitHub Pages での公開手順

1. **リポジトリの作成**
   - GitHub にログインし、新しいリポジトリ（例: `yukimi-report`）を作成します。
2. **ファイルのアップロード**
   - 解凍したフォルダ内の **中身すべて**（`index.html`, `.nojekyll`, `css/`, `js/`, `data/`）をリポジトリのルート直下にアップロードします。
   - ※隠しファイル（`.nojekyll`）もそのまま含めてください。
3. **Pages の有効化**
   - リポジトリの **Settings** ＞ **Pages** を開きます。
   - **Build and deployment** の **Source** を `Deploy from a branch` にし、Branch で `main`（フォルダは `/ (root)`）を選択して **Save** を押します。
   - 数十秒〜1分ほどで `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。

## 閲覧者全員に最新データを初期表示させる方法（重要）
ブラウザの `localStorage` は閲覧者ごとの端末に保存されるため、全員に同じデータを最初から見せたい場合は以下の手順で更新します。

1. 自分のブラウザでダッシュボードを開き、最新の Excel / CSV を読み込みます。
2. 右上の **「💾 JSON出力」** ボタンを押して JSON ファイルをダウンロードします。
3. ダウンロードしたファイル名を **`default_data.json`** に変更し、リポジトリ内の `data/default_data.json` を上書きして GitHub にアップロード（コミット）します。
4. 以降、URL にアクセスした人は自動的に最新の `data/default_data.json` が読み込まれた状態で表示されます。
