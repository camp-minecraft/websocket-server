const WebSocket = require("ws");
const app = require("express")();
const server = require("http").Server(app);
const uuid = require("uuid");
const fetch = require("node-fetch");
const { response } = require("express");
const { create } = require("domain");

const GAS_API_URL =
    "https://script.google.com/macros/s/AKfycbyAgeH65cJV2_wZKjCUmu-UAVNedl_3Buk08kFsl4zS_v0jhKLJPUOGN-_ntn3OHNYdsA/exec";
// "https://script.google.com/macros/s/AKfycbyxdO8jvvVTpns9iTcRui9ONIfQv4Cp9Npmg6te3SRu/dev";

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
            eventName: "PlayerMessage",
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
            eventName: "BlockPlaced",
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
            eventName: "AgentCommand",
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
            eventName: "PlayerTeleported",
        },
    };
    // イベント購読用のJSONをシリアライズ（文字列化）して送信
    ws.send(JSON.stringify(subscribeMessageJSON));
    // ws.send(JSON.stringify(subscribeBlockJSON));
    // ws.send(JSON.stringify(subscribeAgentJSON));
    // ws.send(JSON.stringify(subscribeTpJSON));

    // マイクラからメッセージが届いた際の処理を定義
    ws.on("message", (rawData) => {
        const data = JSON.parse(rawData); // 生メッセージをオブジェクトに変換
        console.log(data);
        if (data.header.eventName == "PlayerMessage") {
            const msg = data.body.message;
            try {
                let msgJson = JSON.parse(msg);
                if (msgJson.header == undefined) {
                    let _msgJson = [];
                    msgJson.rawtext.forEach((segment) => {
                        _msgJson.push(segment.text);
                    });
                    let _ = _msgJson.join("")
                    console.log(_, typeof(_));
                    console.log(JSON.parse(_));
                    msgJson = JSON.parse(_msgJson.join(""));
                }
                console.log("msgJson: ", msgJson);
                switch (msgJson.header.type) {
                    case "init":
                        console.log("[CASE:init]");
                        initWorld(msgJson.body.group);
                        break;
                    case "clear":
                        console.log("[CASE:clear]");
                        commitClear(msgJson.body.player, msgJson.body.course);
                        break;

                    case "intro_agent":
                        console.log("[CASE:intro_agent]");
                        startAgentIntro(msgJson.body.player);
                        break;

                    default:
                        break;
                }
            } catch (error) {
                if (msg.charAt(0) == "?") {
                    sendCommand(msg, ws);
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
    });
    function initWorld(group) {
        const headers = { "Accept-Encoding": "identity" };
        console.log(GAS_API_URL + `?type=init&group=${group}`);
        fetch(GAS_API_URL + `?type=init&group=${group}`, { redirect: "follow", headers: headers })
            .then((response) => {
                let membersData = Buffer.from(response.body._readableState.buffer.head.data, "hex").toString();
                let groupMembers = createMembersData(membersData);
                console.log(groupMembers);
                sendInitWorld(groupMembers);
            })
            .catch((error) => {
                console.log("error", error)
            });
    }

    function sendCommand(msg) {
        let sendCmd;
        if (msg.charAt(0) == "?") {
            sendCmd = "/" + msg.split("?")[1];
        } else {
            sendCmd = msg;
        }
        console.log(sendCmd);
        ws.send(JSON.stringify(generateCommandRequest(sendCmd)));
    }

    function sendInitWorld(groupMembers) {
        //スコアボードのリセット
        sendCommand("/scoreboard objectives remove days");
        sendCommand("/scoreboard objectives add days dummy");
        //IDとDaysの紐付け
        groupMembers.forEach(element => {
            sendCommand(`/scoreboard players set ${element.account} days ${Number(element.days.charAt(0))}`);
        });
        //ワールドの生成
        //コースの生成

        //プレーヤーのセット

        //エージェントのスポーン

    }

    function startAgentIntro(player) {
        sendCommand(`/execute ${player} ~ ~ ~ agent tp -1 15 51 180`);
    }
});


function createMembersData(membersData) {
    let _membersDataJSON = JSON.parse(membersData);
    console.log(_membersDataJSON);
    let membersDataJSON = [];
    for (let [name, account, days, coord] of zip(
        Object.values(_membersDataJSON.body.member),
        Object.values(_membersDataJSON.body.account),
        Object.values(_membersDataJSON.body.days),
        Object.values(_membersDataJSON.body.coord),
    )) {
        membersDataJSON.push(
            {
                "name": name,
                "account": account,
                "days": days,
                "coord": coord,
            });
    }
    return membersDataJSON;
}

function commitClear(player, course) {
    var sendData = {
        player: player,
        course: course,
    };
    var postparam = {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept-Encoding": "identity",
        },
        body: JSON.stringify(sendData),
    };
    fetch(GAS_API_URL, postparam)
        .then((response) => console.log("Success:", response))
        .catch((error) => console.error("Error:", error));
}



function generateCommandRequest(cmd) {
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
            commandLine: cmd, // マイクラで実行したいコマンドを指定
        },
    };
    return commandRequestMessageJSON;
}

function* zip(...args) {

    const length = args[0].length;

    for (let arr of args) {
        if (arr.length !== length) {
            throw "Lengths of arrays are not eqaul.";
        }
    }

    for (let index = 0; index < length; index++) {
        let elms = [];
        for (arr of args) {
            elms.push(arr[index]);
        }
        yield elms;
    }
}

/*デバッグ用
websocket = await import('ws')
const ws = new websocket.WebSocket("ws://localhost:9999")
ws.send('{"body":{"eventName":"PlayerMessage","properties":{"Message":"{\\"header\\":{\\"type\\":\\"init\\"},\\"body\\":{\\"group\\":\\"A\\"}}"}}}')
*/