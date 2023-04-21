
import RoomsMgr from "./RoomsMgr";

const mgr = new RoomsMgr();

async function createRoomMgr() {
  await mgr.init();
  mgr.createRoom("default")
  .then( () => {
    console.log("create room end");
  })
}

import WebSocket from "ws"
import { IncomingMessage, createServer}  from "http"
import express from "express"
import { AddressInfo } from "net";


const app = express();

const server = createServer(app);
const wss = new WebSocket.Server({ server });

interface Msg {
  type: string;
  data?: string;
}



function onConnection(ws: WebSocket, request: IncomingMessage): void {
  ws.onmessage = (event: WebSocket.MessageEvent): void => {

    const msg: Msg = JSON.parse(event.data.toString());

    if(msg.type === "list") {
      ws.send(JSON.stringify( mgr.getList()));
    }

    if(msg.type === "produceReq"){
      //ws.send(JSON.stringify( mgr.getList()));
      mgr.createRoom(msg.data ?? "")
      .then((roomProperty) => {
        console.log(JSON.stringify( roomProperty))
        ws.send(JSON.stringify(
          {
            type: "produceResp",
            data: roomProperty
          }
        ));
      });
    }

    if(msg.type === "produceStart") {
      mgr.produceStart(msg.data  as any, event.target)
    }

    if(msg.type === "produceConnect") {
      mgr.produceConnect(msg.data  as any)
    }

    if(msg.type === "getRoomProducer") {
      mgr.roomProducer(msg.data  as any, event.target)
    }

    // ws.on("create", (data: Buffer): void => {
    //   ws.send(mgr.getList());
    // })
  };
};

wss.on('connection', onConnection);

wss.on("close", (ws: WebSocket) => {
  console.log("close");
})

wss.on("error", (error: Error) => {
  console.log("error");
  console.log(error);
})


app.get('/test', function (req, res, next) {
  res.send("hello, server alive.");
});

app.get('/room', function (req, res, next) {
  res.send(mgr.getList());
});

app.get('/room/:name', function (req, res, next) {
  res.send(mgr.getRoom(req.params.name)?.transport ?? "not exist");
});

app.get('/rtpcapabilities/:name', function (req, res, next) {
  // if( req.query.t === "1")
  // {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.send(mgr.getRoom(req.params.name)?.router.rtpCapabilities);
  // }
  // else
  // {
  //   res.status(400).send();
  // }

});

server.listen(process.env.PORT || 3478, () => {
  console.log(`Server started on port ${(server.address() as AddressInfo).port} :)`);
});

createRoomMgr()