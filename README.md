# HGペイント（歩行グラフィックペイント）

A pixel art tool for creating RPG walking sprites.

https://rpgja.github.io/rpgen-walk/

![image](https://github.com/user-attachments/assets/8705c4d1-8a57-4092-b74c-1bffe0335935)


## 概要 / Overview

**HGペイント（歩行グラフィックペイント）** は、RPG の歩行グラフィックを自作できるWebアプリです。  
基本的な規格は [RPGEN](https://rpgen.org/) に準拠しており、 **RPGツクール** や **ウディタ** にも対応しています。

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

- ✅ RPGEN / RPGツクール 規格
- ✅ オニオンスキン
- ✅ 歩行グラ以外のモーションのプレビュー
- 🚧 肌色カラーパレット
- ✅ 打ち込み補助マクロ
  - ✅ 左右反転
  - ✅ 輪郭塗り
- 🚧 ツクールMV用の同梱素材を作る
- 🚧 多言語対応（英語、中国語、韓国語）

## Webアプリのライセンス / License

- **MIT**  
  Webアプリそのものには MIT ライセンスが適用されます。詳細は [`LICENSE`](./LICENSE) をご覧ください。

> [!NOTE]
> Although this application uses a library originally licensed under AGPLv3,
> both the application and the library are authored by the same developer,
> who hereby distributes this application under the MIT license.
> 
> このWebアプリはもともとAGPLv3でライセンスされたライブラリを使用していますが、
> Webアプリとライブラリの両方が同じ開発者によって作成されており、
> MITライセンスの下でこのWebアプリを配布しています。

## 作品利用について / About Your Creations

- このWebアプリで作成された画像やデータの著作権および利用権は、すべて作成者（利用者）に帰属します。
- 商用・非商用を問わず、自由に利用・改変・配布いただけます。
- 著作権表記や利用報告も一切不要です。
- 安心してご活用ください。

## 同梱素材について / About Included Assets

- このWebアプリの同梱素材は、 **エルル氏** のオリジナル作品を改変して再配布したものです。
- このWebアプリの提供者と **エルル氏は無関係** です。
- 同梱素材を **改変・再配布** する際は、 **エルル氏が定めた利用規約** に従ってください。

> [!NOTE]
> ※[規約ページ](http://erl.hatenablog.jp/entry/readme-using) が閉鎖されているため、以下に抜粋します：
> 1. わかりやすいところに **エルル氏作と明記する** こと
> 2.  **非営利** であること（絶対に一切お金を取らないこと）

> [!TIP]
> - ただし、同梱素材の視覚的特徴や構造的要素だけを参考にし、
> 線・配色・形状・デザインを完全に自分で描いた場合、
> エルル氏の派生著作物ではなく、
> ユーザーの完全自作物と見なされる余地があります。https://github.com/rpgja/rpgen-walk/issues/1
> - この記述は法的な助言ではなく、権利関係について最終的な判断を行うものではありません。
> ご利用の際は、自己責任でご判断ください。

## コントリビュート / Contributing

改善案・バグ報告・PR 歓迎です！

1. Issue を作成
2. Fork & ブランチ作成
3. PR を送信してレビューを待つ

---

Pull requests are welcome! Let's build better sprite tools together 🧙‍♀️✨
