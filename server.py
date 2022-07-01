from websocket_server import WebsocketServer
from datetime import datetime
import time
import json
import uuid


def start():
    def new_client(client, server):
        print(time.time())
        print('New client {}:{} has joined.'.format(
            client['address'][0], client['address'][1]))
        # クライアントへメッセージ送信
        server.send_message(client, subscribePlayerChatEventCommand())
        # クライアントへメッセージ送信
        server.send_message(client, 'from server 2st message in new_client')

    # クライアントが切断した時のイベント
    def client_left(client, server):
        print(time.time())
        print('Client {}:{} has left.'.format(
            client['address'][0], client['address'][1]))

    # クライアントからのメッセージを受信した時のイベント
    def message_received(client, server, message):
        print("MINECRAFTからのmessage: ", message)
        time.sleep(2)
        # クライアントへメッセージ送信
        server.send_message(
            client, 'from server 1st message in message_received')
        time.sleep(2)
        # クライアントへメッセージ送信
        server.send_message(
            client, 'from server 2st message in message_received')

    # 10005番ポートでサーバーを立ち上げる
    server = WebsocketServer(port=9999, host='192.168.1.17')
    # イベントで使うメソッドの設定
    server.set_fn_new_client(new_client)
    server.set_fn_client_left(client_left)
    server.set_fn_message_received(message_received)
    # 実行
    server.run_forever()
    
def subscribePlayerChatEventCommand():
    temp = '{"body": {"eventName": "PlayerMessage"},"header": {"requestId": ' + str(uuid.uuid4()) + ',"messagePurpose": "subscribe","version": 1,"messageType": "commandRequest"}}'
    print(temp)
    return temp
if __name__ == "__main__":
    start()
