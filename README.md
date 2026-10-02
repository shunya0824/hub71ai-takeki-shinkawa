# DiveAbuDhabi

Next.js App Router + TypeScript のアブダビ移住支援デモ。UI は英語。会社スポンサーで移住する本人・家族を代表ケースとして実装しています。

## 起動

Node.js 20.9 以上が必要です。

```sh
npm install
npm run dev
```

http://127.0.0.1:3000 を開いてください。トップページの「Take a peek at a sample plan」から、入力済みの合成データで試すこともできます。

## OpenAI API の設定

`.env.local` を用意してあります。キーをローカルで入力してください。設定ファイルは Git の対象外です。

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

保存後に開発サーバーを再起動し、画面の「AI connected」を確認してください。モデルは Responses API、画像入力、Structured Outputs に対応する利用可能なモデルへ変更できます。

キーが空の場合はデモモードです。相談は定型応答、OCR は合成サンプル、計画は決定的なルールで動きます。キーを設定すると、実 AI が相談、アップロード画像の読み取り、プロフィールに合わせた計画説明、自由文からの変更意図の解釈を担当します。HTTP エラーや不正な AI 出力は表示し、実 API の失敗をデモ回答へ黙って置き換えません。

計画のタスク構造、日程、依存関係、費用は検証できる初期スキャフォールドを使います。AI はその説明を個別化します。法的適格性、公式費用、処理期間を保証する実用サービスではありません。費用と日程はデモ前提です。実 API の接続テストは利用可能なキーを設定した後に行ってください。

API キーはサーバーだけで使用します。Responses API に `store: false` を指定し、相談と計画生成にパスポート番号のフィールドを送信しません。画像 OCR では同意済みの画像を OpenAI に送ります。合成データだけで試してください。

## 実装済み

- LP、移住概要、3ルートの選択と対応範囲表示
- 本人・家族の追加、編集、削除、処理同意、OCR候補の修正と確定
- 不足項目だけを聞く相談、回答保留、ブラウザ保存と再開
- 到着前・到着時・到着後の計画、期限・期間・担当・書類・費用・出典
- 前提タスクの確認、完了チェックと取り消し、進捗更新
- ダッシュボード、期限間近・期限超過・依存関係の表示
- 遅延／到着日変更のプレビュー、差分適用、変更履歴
- 完了項目とタスク ID の維持、古い version の変更案を拒否
- 出典検索、確認日と検証状態、計画 JSON のエクスポート
- スマホ表示、ダイアログのキーボード操作、リセット、API失敗の模擬操作

創業者・自己スポンサーの計画、音声、複数企業ケース、共有、端末間同期は未実装です。メンバーを既存計画の作成後に編集してもタスクは自動再生成しません。プロフィール変更による計画全体の見直しは次の段階です。

## 保存と削除

ケース、メンバーの確認済み情報、会話、計画、進捗、変更履歴を同じブラウザの localStorage に保存します。画像は保存しません。パスポート番号は保存と相談・計画APIの送信から除外します。ダッシュボードの Demo settings（スマホは Settings）→ Reset all demo data で削除できます。

Simulate API failure は開発環境で相談・計画・再計画APIを失敗させる検証用機能です。現行計画と入力は保持されます。

## 検証

```sh
npm run typecheck
npm run test
npm run build
```

単体テストは遅延の伝播、無関係なタスクの維持、完了状態、到着日の変更、version 競合、不正な依存関係・出典、費用の区分、パスポート番号の除外を確認します。

ローカルでAPIのスモークテストを行う場合は、開発サーバーを起動してから実行します。

```sh
npm run test:api
```

## 構成

- `app/`：ページ、レイアウト、Route Handlers
- `components/`：英語UI、オンボーディング、ワークスペース
- `lib/schema.ts`：Zodの共通データ契約
- `lib/planner.ts`：計画生成、依存関係検証、再計画、集計
- `lib/ai.ts`：サーバー専用のOpenAI接続
- `lib/storage.ts`：保存と送信時の識別番号除外
- `knowledge/sources.json`：既知のsourceIds付き出典ノート
- `tests/`：計画とデータ保護のテスト

匿名APIは入力サイズと単一プロセス内のリクエスト数を制限します。公開運用の前には共有ストレージのレート制限、信頼できる接続元識別、アクセス制御、制度・費用の正式検証、実データの保持・削除運用が必要です。現在の開発サーバーは127.0.0.1に限定しています。

## 実装参照

[Next.js installation](https://nextjs.org/docs/app/getting-started/installation)、[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、[OpenAI images and vision](https://developers.openai.com/api/docs/guides/images-vision)。制度の確認状態は画面の Helpful resources と `knowledge/sources.json` を参照してください。
