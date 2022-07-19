# MCEE Websocketサーバ仕様書
作成：2022/07/19

更新：2022/07/19

作成者：めいぷる

MCEE Websocketサーバは、メンターと生徒のワールドをつなぐためのサーバーです！

スプレッドシートとMCEEのワールドを接続し、生徒の進捗を管理したりすることができます。


## 接続手順
グループホストPCで以下の手順を踏んでください。

1. (初回接続のみ)MCEEを起動する
2. (初回接続のみ)設定＞プロフィール＞暗号化されたWebsocketの要求→OFF
3. デスクトップの`CAMP.sh`を実行
4. ワールドを開く
5. コマンドで`/connect localhost:9999`と入力
6. 接続完了

## 仕様
### コースクリア時

1. コース毎に設置されたコマンドブロックが、クリアを検知し`/tellraw`コマンドでクリア情報をチャットに送信する。
<details>
<summary>送信情報例（JSON形式、詳細は後述）</summary>

```
{
    "header": {
        "sender": "oishic"  #送信者（グループ）を識別
        "type": "clear"     #送信情報の種類["clear","init"]
    },
    "body": {
        "player": "テストタロウ"    #クリアした生徒の名前
        "course": "1"             #クリアしたコース
    }
}
```
</details>
2. WSサーバがチャットを検知し、GAS APIを叩く。
3. GASスクリプトが進捗管理表を変更する。


### 送信情報
#### クリア時
例１
<details>
<summary>クリア時</summary>

```
{
    "header": {
        "sender": "oishic"  #送信者（グループ）を識別
        "type": "clear"     #送信情報の種類["clear","init"]
    },
    "body": {
        "player": "テストタロウ"    #クリアした生徒の名前
        "course": "1"             #クリアしたコース
    }
}
```
</details>