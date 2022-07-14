const WebSocket = require("ws");
const app = require("express")();
const server = require("http").Server(app);
const uuid = require("uuid");

const wss = new WebSocket.Server({
  port: 9999, // 9999ポートでWebSocketサーバーを待機
});

console.info(`WebSocket is Ready. Type "/connect localhost:9999"`);

// マイクラから接続された際の処理
wss.on("connection", (ws) => {
  console.log("Connected");
  // イベント購読用のJSONを組み立てる
  const subscribeMessageJSON = {
    header: {
      version: 1, // プロトコルのバージョンを指定。1.18.2の時点では1で問題ない
      requestId: uuid.v4(), // UUIDv4を指定
      messageType: "commandRequest", // "commandRequest" を指定
      messagePurpose: "subscribe", // "subscribe" を指定
    },
    body: {
      eventName: "PlayerMessage"
    },
  };

  const subscribeBlockJSON = {
    header: {
      version: 1, // プロトコルのバージョンを指定。1.18.2の時点では1で問題ない
      requestId: uuid.v4(), // UUIDv4を指定
      messageType: "commandRequest", // "commandRequest" を指定
      messagePurpose: "subscribe", // "subscribe" を指定
    },
    body: {
      eventName: "BlockPlaced"
    },
  };

  const subscribeAgentJSON = {
    header: {
      version: 1, // プロトコルのバージョンを指定。1.18.2の時点では1で問題ない
      requestId: uuid.v4(), // UUIDv4を指定
      messageType: "commandRequest", // "commandRequest" を指定
      messagePurpose: "subscribe", // "subscribe" を指定
    },
    body: {
      eventName: "AgentCommand"
    },
  };

  const subscribeTpJSON = {
    header: {
      version: 1, // プロトコルのバージョンを指定。1.18.2の時点では1で問題ない
      requestId: uuid.v4(), // UUIDv4を指定
      messageType: "commandRequest", // "commandRequest" を指定
      messagePurpose: "subscribe", // "subscribe" を指定
    },
    body: {
      eventName: "AgentCommand"
    },
  };
  // イベント購読用のJSONをシリアライズ（文字列化）して送信
  ws.send(JSON.stringify(subscribeMessageJSON));
  ws.send(JSON.stringify(subscribeBlockJSON));
  ws.send(JSON.stringify(subscribeAgentJSON));
  ws.send(JSON.stringify(subscribeTpJSON));

  // マイクラからメッセージが届いた際の処理を定義
  ws.on("message", (rawData) => {
    console.log(rawData);
    const data = JSON.parse(rawData); // 生メッセージをオブジェクトに変換
    console.log(data);
    let sendcmd = "test";
    if (data.body.eventName == "PlayerMessage") {
      const msg = data.body.properties.Message;
      const cmd = msg.split(" ")[0];
      const subcmd = msg.split(" ")[1];
      if (cmd == "tp") {
        if (subcmd == "0") {
          sendcmd = "tp oishic 20 6 30";
        } else if (subcmd == "1") {
          sendcmd = "tp oishic 49 5 104";
        }
      }
    }
    if (!data.body.eventName) {
      // メッセージにイベント名が含まれていない場合は処理を抜ける
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      return; // WebSocketがOPEN状態でない場合は処理を抜ける
    }

    // コマンド発行用JSONの組み立て
    const commandRequestMessageJSON = {
      header: {
        version: 1, // プロトコルのバージョン1.18.2時点では1でOK
        requestId: uuid.v4(), // UUIDv4を生成して指定
        messageType: "commandRequest", // commandRequestを指定
        messagePurpose: "commandRequest", // commandRequestを指定
      },
      body: {
        origin: {
          type: "player", // 誰がコマンドを実行するかを指定（ただし、Player以外にどの値が利用可能かは要調査）
        },
        version: 1, // プロトコルのバージョン1.18.2時点では1でOK
        commandLine: sendcmd, // マイクラで実行したいコマンドを指定
      },
    };

    // コマンド発行用のJSONをシリアライズ（文字列化）して送信
    ws.send(JSON.stringify(commandRequestMessageJSON));
    // console.log(wss.clients);
    // wss.clients.forEach(client => {
    //     client.send("response");
    // })
    // ws.send("response");
  });
});
