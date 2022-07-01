const WebSocket = require("ws");
const app = require("express")();
const server = require("http").Server(app);
const uuid = require("uuid/v4");

function setBlockCommand(x, y, z, blockType) {
    return JSON.stringify({
        body: {
            origin: {
                type: "player",
            },
            commandLine: util.format("setblock %s %s %s %s", x, y, z, blockType),
            version: 1,
        },
        header: {
            requestId: uuid(),
            messagePurpose: "commandRequest",
            version: 1,
            messageType: "commandRequest",
        },
    });
}

function subscribePlayerChatEventCommand() {
    return JSON.stringify({
        "body": {
            "eventName": "PlayerMessage"
            //"eventName": "PlayerChat"
        },
        "header": {
            "requestId": uuid(), // UUID
            "messagePurpose": "subscribe",
            "version": 1,
            "messageType": "commandRequest"
        }
    });
}

const wss = new WebSocket.Server({server});

// マイクラ側からの接続時に呼び出される関数
wss.on('connection', socket => {
    console.log('user connected');

    // ユーザー発言時のイベントをsubscribe
    socket.send(subscribePlayerChatEventCommand());

    // 各種イベント発生時に呼ばれる関数
    socket.on('message', packet => {
        console.log('Message Event');
        console.log(packet);
        const res = JSON.parse(packet);

        // ユーザーが「build」と発言した場合だけ実行
        if (res.header.messagePurpose === 'event' && res.body.properties.Sender !== '外部') {
            if (res.body.eventName === 'PlayerMessage' && res.body.properties.Message.startsWith('build')) {
                console.log('start build');

                // 石ブロックを配置するリクエストを送信
                socket.send(setBlockCommand('~0', '~0', '~0', 'stonebrick'));
            }
        }
    });

});

server.listen(9999, () => {
    console.log('listening on *:3000');
});


