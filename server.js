const WebSocket = require("ws");
const app = require("express")();
const server = require("http").Server(app);
const uuid = require("uuid");
const fetch = require("node-fetch");
const { response } = require("express");
const { create } = require("domain");
const { w3cwebsocket } = require("websocket");

const GAS_API_URL =
    "https://script.google.com/macros/s/AKfycbyAgeH65cJV2_wZKjCUmu-UAVNedl_3Buk08kFsl4zS_v0jhKLJPUOGN-_ntn3OHNYdsA/exec";
// "https://script.google.com/macros/s/AKfycbyxdO8jvvVTpns9iTcRui9ONIfQv4Cp9Npmg6te3SRu/dev";

const wss = new WebSocket.Server({
    port: 9999, // 9999ポートでWebSocketサーバーを待機
});

console.info(`WebSocket is Ready. Type "/connect localhost:9999"`);

// マイクラから接続された際の処理
wss.on("connection", (ws, req) => {

    // 初回接続時、ID・クライアントの種類を登録
    // HTTPリクエストのヘッダー情報から分類
    if (req.headers["user-agent"] === undefined) {
        ws.client = "Minecraft";
        ws.firstConnectedTime = new Date().getTime();
        let prevMinecraftWebsocketId = ws.minecraftWebsocketId;
        ws.minecraftWebsocketId = uuid.v4();
        console.log(`[MinecraftWebsocketID Change Log] ${prevMinecraftWebsocketId} -> ${ws.minecraftWebsocketId}`);
        console.log("MC wsID:" + ws.minecraftWebsocketId)
    } else {
        ws.client = "Browser";
    }

    // 初回接続時、全ブラウザにマイクラのクライアントリストを送信する
    // ブラウザ側でそれを受け取り、「グループ登録」処理を開始する
    let minecraftWebsocketList = {
        header: {
            messagePurpose: "submitMinecraftClientList"
        },
        body: {
            clientList: []
        }
    }

    // 全てのWS接続のうち、マイクラとのWS接続情報を登録
    wss.clients.forEach((client) => {
        if (client.client === "Minecraft") {
            console.log("MC wsID:" + client.minecraftWebsocketId)
            minecraftWebsocketList.body.clientList.push({
                minecraftWebsocketId: client.minecraftWebsocketId,
                group: client.groupIndex,
                connectedTime: client.firstConnectedTime,
                player: "",
            })
            // この情報を送信
            console.log("送信する情報----------------------")
            console.log(minecraftWebsocketList)
            console.log("--------------------------------")
        }
    })

    // 上記の情報を全てのブラウザに送信
    wss.clients.forEach((client) => {
        if (client.client === "Minecraft") return;
        client.send(JSON.stringify(minecraftWebsocketList))
    })

    // マイクラクライアントのプレイヤー情報を取得するためのコマンドを送信
    // コマンドのrequestIDをWSに紐付け
    // このコマンドのレスポンスが返り次第、requestIDをもとにプレイヤー情報とWSを紐付け
    linkWebSocketIdAndGroup();

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
    // イベント購読用のJSONをシリアライズして送信
    if (ws.client == "Minecraft") ws.send(JSON.stringify(subscribeMessageJSON));
    // ws.send(JSON.stringify(subscribeBlockJSON));
    // ws.send(JSON.stringify(subscribeAgentJSON));
    // ws.send(JSON.stringify(subscribeTpJSON));

    // マイクラからメッセージが届いた際の処理を定義
    ws.on("message", (rawData) => {
        const data = JSON.parse(rawData); // 生メッセージをオブジェクトに変換
        if (data.body.type != "title") console.log(data);
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
                    sendCommand(msg);
                }
            }
        }
        else if (!!data.header.messagePurpose) {
            switch (data.header.messagePurpose) {
                case "GAS Request":
                    console.log(data);
                    sendCommand("/" + data.body.command, data.header.commandSetId);

                    break;

                case "commandResponse":
                    wss.clients.forEach((client) => {
                        if (client.client == "Minecraft") return;
                        client.send(JSON.stringify(data));
                    })

                    // もし/listdに対するレスポンスだったら
                    if (data.body.maxPlayerCount) {
                        try {

                            [...wss.clients].filter((target) => {
                                console.log(`${target.listdRequestId}(${target.client}) | ${data.header.requestId}`);
                                return target.listdRequestId === data.header.requestId
                            })[0].minecraftWebsocketId;
                        } catch(e) {
                            console.log(e);
                        }

                        wss.clients.forEach((client) => {
                            if (client.client == "Minecraft") return;

                            let sendMinecraftWebsocketId = [...wss.clients].filter((target) => {
                                return target.listdRequestId === data.header.requestId
                            })[0].minecraftWebsocketId;

                            let sendMinecraftGroupIndex = [...wss.clients].filter((target) => {
                                return target.listdRequestId === data.header.requestId
                            })[0].groupIndex;

                            let sendPlayersName = [];
                            JSON.parse(data.body.details.split(" ")[1]).result.forEach((result) => {
                                sendPlayersName.push(result.name);
                            })

                            let sendData = {
                                header: {
                                    messagePurpose: "submitPlayerList"
                                },
                                body: {
                                    minecraftWebsocketId: sendMinecraftWebsocketId,
                                    players: sendPlayersName,
                                    groupIndex: sendMinecraftGroupIndex,
                                }
                            }
                            console.log("プレーヤー名---------------------")
                            console.log(sendData);
                            console.log("-------------------------------")
                            client.send(JSON.stringify(sendData));
                        })
                    }

                    break;

                case "submitGroup":
                    /*送られてくるデータ
                    {
                        header: {
                            messagePurpose: "submitGroup",
                        },
                        body: {
                            groupIndex: groupIndex,
                            minecraftWebsocketIdList: minecraftWebsocketIdList,
                        }
                    }
                    */

                    // 送られてきたデータにマイクラクライアントが含まれていたら、groupIndexをパラメータとして付与する
                    wss.clients.forEach((client) => {
                        if (data.body.minecraftWebsocketIdList.includes(client.minecraftWebsocketId)) {
                            client.groupIndex = data.body.groupIndex;
                        }
                    })
                    break;

                default:
                    break;
            }
        }

        else if (!data.body.eventName) {
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

    function sendCommand(msg, commandSetId = "", clientGroupList = "ABCDEFGHIJKLMNOPQRSTU".split("")) {
        let sendCmd;
        if (msg.charAt(0) == "?") {
            sendCmd = "/" + msg.split("?")[1];
        } else {
            sendCmd = msg;
        }
        if (sendCmd === "/listd") {
            linkWebSocketIdAndGroup();
            return
        }
        // clientList = generateClientList(clientGroupList)
        clientList = wss.clients

        clientList.forEach((client) => {
            let _sendData = generateCommandRequest(sendCmd);
            _sendData.header.commandSetId = commandSetId;
            let sendData = JSON.stringify(_sendData);
            if (client.client == "Minecraft") {
                client.send(sendData);
                ws.send(JSON.stringify({

                    header: {
                        messagePurpose: "linkCommandSet",
                    },
                    body: {
                        commandId: JSON.parse(sendData).header.requestId,
                        commandSetId: commandSetId,
                        minecraftWebsocketId: client.minecraftWebsocketId,
                        groupIndex: client.groupIndex,
                    }
                }));
            }
        })
    }

    function linkWebSocketIdAndGroup() {
        let sendCmd = "/listd"

        wss.clients.forEach((client) => {
            let sendData = generateCommandRequest(sendCmd);

            if (client.client == "Minecraft") {
                client.send(JSON.stringify(sendData));
                client.listdRequestId = sendData.header.requestId
            }
        })
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
        sendCommand(`/execute ${player} ~ ~ ~ agent tp -1 19 66 180`);
        sendCommand(`/codebuilder navigate ${player} false https://minecraft.makecode.com/#tutorial:56182-20805-41056-46836`)
    }

    ws.on("close", function (ws) {
        console.log(`${ws.client} is closed`);
        console.log(ws);
    })
});

function generateClientList(groupList) {
    const rootGroupList = wss.clients;
    const resultGroupList = new Array();
    rootGroupList.forEach((client) => {
        if (client.client != "Minecraft") return;
        if (groupList.includes(client.groupIndex)) {
            resultGroupList.push(client);
        }
    })
    return resultGroupList;
}
wss.on("close", function (ws, req) {
    console.log("ws server is closed");
    console.log(ws)
})


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
            commandSetId: "",
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