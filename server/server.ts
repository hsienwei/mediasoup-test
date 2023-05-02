
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

function setupRESTfulApi() {
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
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.send(mgr.getRoom(req.params.name)?.router.rtpCapabilities);
  });
}

function setupWebSocket(connectFn: (ws: WebSocket, request: IncomingMessage) => void) {
  wss.on('connection', connectFn);

  wss.on("close", (ws: WebSocket) => {
    console.log("close");
  })
  
  wss.on("error", (error: Error) => {
    console.log(`error: ${error}`);
  })
}

async function createR(ws: WebSocket, msg: any) {
  const result = await mgr.createR(msg.data.name);

  console.log("resend");
  ws.send(JSON.stringify({
    type: 2,
    sequence: msg.sequence,
    message: 'CREATE_ROOM',
    data: { "result": result }
  }));
}

async function createProducer(ws: WebSocket, msg: any) {
  const result = await mgr.createP(msg.data.name);

  console.log("resend");
  ws.send(JSON.stringify({
    type: 2,
    sequence: msg.sequence,
    message: 'ASK_PRODUCE',
    data: result
  }));
}

function onConnection(ws: WebSocket, request: IncomingMessage): void {
  ws.onmessage = (event: WebSocket.MessageEvent): void => {

    const msg: any = JSON.parse(event.data.toString());


    console.log(msg);

    if(msg.type === 1)
    {
      if(msg.message === "CREATE_ROOM") 
      {
        createR(ws, msg);
        return;
      }

      if(msg.message === "LIST_ROOM") 
      {
        setTimeout( () => {
          console.log("resend");
          ws.send( JSON.stringify({
            type: 3,
            sequence: msg.sequence,
            message: 'LIST_ROOM'
          }));
        }, 3000);
        return;
      }

      if(msg.message === "ASK_PRODUCE")
      {
        createProducer(ws, msg);
        return;
      }
    }

    

    if (msg.type === "list") {
      ws.send(JSON.stringify(mgr.getList()));
    }

    if (msg.type === "produceReq") {
      mgr.createRoom(msg.data ?? "")
        .then((roomProperty) => {
          console.log(JSON.stringify(roomProperty))
          ws.send(JSON.stringify(
            {
              type: "produceResp",
              data: roomProperty
            }
          ));
        });
    }

    if (msg.type === "produceStart") {
      mgr.produceStart(msg.data as any, event.target)
    }

    if (msg.type === "produceConnect") {
      mgr.produceConnect(msg.data as any)
    }

    if (msg.type === "getRoomProducer") {
      mgr.roomProducer(msg.data as any, event.target)
    }
  };
};

setupWebSocket(onConnection);

setupRESTfulApi();

server.listen(process.env.PORT || 3478, () => {
  console.log(`Server started on port ${(server.address() as AddressInfo).port} :)`);
});

createRoomMgr()