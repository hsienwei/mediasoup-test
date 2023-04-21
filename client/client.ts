

import MediasoupMgr from './mediasoupMgr'

interface Msg {
    type: string;
    data?: string;
}

const div = document.getElementById("version") as HTMLDivElement;
div.innerText = `mediasoup version: ${MediasoupMgr.getMediasoupVersion()} 
                    device ${MediasoupMgr.getDevice()}`;





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




