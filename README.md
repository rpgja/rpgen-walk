# rpgen-walk

A pixel art tool for creating RPG walking sprites.

## 概要 / Overview

**rpgen-walk** は、RPG の歩行グラフィックを自作できるツールです。  
基本的な規格は [RPGEN](https://rpgen.org/) に準拠しており、今後は **RPGツクール** や **ウディタ** にも対応しています。

### 競合アプリに対する強み / Features

- 各フレームが独立したレイヤー構造を持ち、柔軟な編集が可能
- ドット絵を手軽に始められる、充実したテンプレート
- **Undo / Redo** 完備で安心の編集操作
- シンプルな UI と軽快な動作

## 採用技術 / Tech Stack

- **開発言語**: TypeScript  
- **実行環境**: Volta / pnpm / Biome  
- **フロントエンド**: SvelteKit / Tailwind CSS / Skeleton / Lucide

## 別に守らなくてもいいコーディング規約 / Coding Standards

- 素のHTML + ユーティリティクラスで微調整
- Skeletonコンポーネント + ユーティリティクラスで微調整
- @apply等でDRYにするのは禁止

## 環境構築 / Getting Started

1. [Volta をインストール](https://docs.volta.sh/guide/getting-started)
2. このリポジトリをローカルにクローン
3. [pnpm をインストール](https://pnpm.io/ja/installation)
4. この `README.md` があるディレクトリを VS Code で開く
5. 拡張機能タブから推奨拡張をインストール
7. `pnpm i` を実行して依存関係をインストール
8. よく使うコマンド:
   - `pnpm run dev` — 開発ビルド
   - `pnpm run prod` — 本番ビルド

## 今後の予定 / Roadmap

- ✅ RPGEN 規格対応
- 🚧 RPGツクール・ウディタへのエクスポート
- 🚧 カスタムタイル対応
- 🚧 アニメーション再生機能の強化

## ライセンス / License

- **MIT**  
  本プロジェクト全体には MIT ライセンスが適用されます。詳細は [`LICENSE`](./LICENSE) をご覧ください。

> [!NOTE]
> Although this application uses a library originally licensed under AGPLv3,
> both the application and the library are authored by the same developer,
> who hereby distributes this application under the MIT license.
> 
> このアプリケーションはもともとAGPLv3でライセンスされたライブラリを使用していますが、
> アプリケーションとライブラリの両方が同じ開発者によって作成されており、
> MITライセンスの下でこのアプリケーションを配布しています。

## コントリビュート / Contributing

改善案・バグ報告・PR 歓迎です！

1. Issue を作成
2. Fork & ブランチ作成
3. PR を送信してレビューを待つ

---

Pull requests are welcome! Let's build better sprite tools together 🧙‍♀️✨
