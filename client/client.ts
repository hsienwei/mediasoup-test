

import MediasoupMgr from './mediasoupMgr'

import WebsocketClient, { Message, Response } from './WebsocketClient'

interface Msg {
    type: string;
    data?: string;
}

const div = document.getElementById("version") as HTMLDivElement;
div.innerText = `mediasoup version: ${MediasoupMgr.getMediasoupVersion()} 
                    device ${MediasoupMgr.getDevice()}`;

const btn = document.getElementById("test") as HTMLButtonElement;
btn.onclick = connect;

const btn2 = document.getElementById("test2") as HTMLButtonElement;
btn2.onclick = createRoom;


const btn3 = document.getElementById("test3") as HTMLButtonElement;
btn3.onclick = listRoom;

const btn4 = document.getElementById("test4") as HTMLButtonElement;
btn4.onclick = askProduce;

const wsClient = new WebsocketClient(`ws://${window.location.hostname}:3478`);

async function connect() {
    
    const { success } = await wsClient.login();
    if(success)
    {
        console.log("login success")
    }
}

async function createRoom() {
    const msg: Message = new Message("CREATE_ROOM")
    msg.data = { name: 1234 };
    const response: Response = await wsClient.request(msg);
    console.log(response);
}

async function listRoom() {
    const msg: Message = new Message("LIST_ROOM")
    const response: Response = await wsClient.request(msg);
    console.log(response);
}

async function askProduce() {
    const msg: Message = new Message("ASK_PRODUCE")
    msg.data = { name: 1234 };
    const response: Response = await wsClient.request(msg);
    console.log(response);
}



const ws = new WebSocket(`ws://${window.location.hostname}:3478`);
ws.onopen = (event) => {
    console.log("open");
    const btn = document.getElementById("btn_create_room") as HTMLButtonElement;
    btn.disabled = false;    
    btn.onclick = onProduceRequest;
};


ws.onmessage = (event: MessageEvent) => {
    const msg: Msg = JSON.parse( event.data );

    if (msg.type === "produceResp") {
       onProduceResp(msg.data);
    }

    if (msg.type === "producerID") {
        mgr.onGetProduceID(msg.data);
    }

    if(msg.type === "respRoomProducer") {
        mgr.onRespProducerID(msg.data);
    }
};

const mgr: MediasoupMgr = new MediasoupMgr(ws);

function onProduceResp(data: any) {
    navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        const videoTrack = stream.getVideoTracks()[0];

        const video = document.getElementById("source") as HTMLVideoElement;
        video.srcObject = stream;
        mgr.onProduceResp(data, videoTrack);
    });
}


function onProduceRequest() {
    
    mgr.onProduceRequest(
        {
            type: "produceReq",
            data: "1234"
        }
    );
}




