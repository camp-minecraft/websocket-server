const WebSocket = require("ws");
const app = require("express")();
const server = require("http").Server(app);
const uuid = require("uuid");

const wss = new WebSocket.Server({
    port: 19131,  // 19131ポートでWebSocketサーバーを待機
  });
  
  console.info(`WebSocket is Ready. Type "/connect localhost:19131"`);
  
  // マイクラから接続された際の処理
  wss.on("connection", ws => {
    console.log("Connected");
    // イベント購読用のJSONを組み立てる
    const subscribeMessageJSON = {
      "header": {
        "version": 1, // プロトコルのバージョンを指定。1.18.2の時点では1で問題ない
        "requestId": uuid.v4(), // UUIDv4を指定
        "messageType": "commandRequest",  // "commandRequest" を指定
        "messagePurpose": "subscribe", // "subscribe" を指定
      },
      "body": {
        "eventName": "PlayerTravelled" // イベント名を指定。イベント名は後述
      },
    };
  
    // イベント購読用のJSONをシリアライズ（文字列化）して送信
    ws.send(JSON.stringify(subscribeMessageJSON));
  
    // マイクラからメッセージが届いた際の処理を定義
    ws.on("message", rawData => {
      const data = JSON.parse(rawData); // 生メッセージをオブジェクトに変換
      console.log(data);
      if (!data.body.eventName) { // メッセージにイベント名が含まれていない場合は処理を抜ける
        return;
      }
      if (data.body.eventName != "PlayerTravelled") {
        return; // メッセージのイベント名がPlayerTravelledでない場合は処理を抜ける
      }
      if (ws.readyState !== WebSocket.OPEN) {
        return; // WebSocketがOPEN状態でない場合は処理を抜ける
      }
  
      // コマンド発行用JSONの組み立て
      const commandRequestMessageJSON = {
        "header": {
          "version": 1, // プロトコルのバージョン1.18.2時点では1でOK
          "requestId": uuid.v4(), // UUIDv4を生成して指定
          "messageType": "commandRequest", // commandRequestを指定
          "messagePurpose": "commandRequest", // commandRequestを指定
        },
        "body": {
          "origin": {
            "type": "player" // 誰がコマンドを実行するかを指定（ただし、Player以外にどの値が利用可能かは要調査）
          },
          "version": 1, // プロトコルのバージョン1.18.2時点では1でOK
          "commandLine": "tell @s hello", // マイクラで実行したいコマンドを指定（ここではニワトリをスポーンさせるコマンドを指定）
        }
      };
  
      // コマンド発行用のJSONをシリアライズ（文字列化）して送信
      ws.send(JSON.stringify(commandRequestMessageJSON));
    })
  });