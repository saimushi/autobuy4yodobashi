# ヨドバシ購入支援Bot

以下の事が可能です。

- 検索ワードに一致した最初を検索、在庫が復活した場合にLINEに通知を行う
  + **※但し、別途「[LINE notify](https://notify-bot.line.me/)」への登録が必要**
- 最大で5件まで商品の登録が可能

## 注意事項

- ヨドバシ側の仕様変更等により、急に利用が出来なくなる可能性があります。
- 在庫の検知を保証するツールではありません。あくまで注文可能な状態の場合に通知を行うのみです。

***他予期しない事象が起こっても、製作者は責任を負いかねますので予めご了承の上ご利用下さい。***


## 使い方

- 先ずはこの「[glitch.com](https://glitch.com/)に会員登録を行って下さい。
- その後、[このページ](https://glitch.com/~autobuy4yodobashi)の「Remix your own」を押して、新たにプロジェクトを作成して下さい。
- 作成したプロジェクトの「Share」 -> 「Live site」のURLをコピーして置いて下さい。
- 次に「[https://console.cron-job.org/](https://console.cron-job.org/)」に会員登録を行って下さい。
- 「[cron-job.org](https://console.cron-job.org/)」にログインし「CREATE CRONJOB」を押して下さい。
- 「URL」に先程コピーした「Live site」のURLを貼り付けして下さい。
- 「Execution schedule」を「Every 1 minute(s)」に変更して下さい。
  + 「title」と「Notify me when...」は好きな用に設定を変えて下さい。
- 「CREATE」で作成を完了して下さい。
  + ※ cron-jobは1分お気に作成したプロジェクトへアクセスを行う事で24時間実行出来るように延命し続ける事を試みます。
  + ※ 通常のglitchのプロジェクトは5分で自動的にスリープしてしまう為です。
- 作成したプロジェクトへ戻り「.env」ファイルに必要な情報を追記して下さい。

以上

***不明点は作者までお問い合わせ下さい。***

[https://twitter.com/saimushi](https://twitter.com/saimushi)
