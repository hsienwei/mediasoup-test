import {version, detectDevice, Device, types }  from "mediasoup-client";
import { Transport } from "mediasoup-client/lib/types";

import axios from "axios"

// type RoomTransportProperty = Pick<types.WebRtcTransport, "id" | "iceParameters" | "iceCandidates" | "dtlsParameters">;
// types.
export default  class MediasoupMgr{
    constructor(private ws: WebSocket){
    }
    
    public static getMediasoupVersion(): string
    {
        return version;
    }

    public static getDevice(): string
    {
        return detectDevice() ?? "unknown";
    }


    public onProduceRequest(data: any) {
        this.ws.send(JSON.stringify(data));
    }


    public callback: (({ id }: {id: string}) => void) | null = null;
    public errorCallback: ((err: Error) => void)  | null= null;

    public onGetProduceID(data: any)
    {
        if(this.callback !== null)
        {
            console.log("onGetProduceID");
            const id: string = data.data;
            this.callback( { id });

            (document.getElementById("btn_receive") as HTMLButtonElement).disabled = false;
            (document.getElementById("btn_receive") as HTMLButtonElement).onclick = () => {
                this.ws.send( JSON.stringify(
                    {
                        type: "getRoomProducer",
                        data: "1234",
                    } 
                ));
            }
        }
    }

    public async onRespProducerID(data: any) {
        console.log("respRoomProducer")
        const device = new Device();

        const rtpdata = (await axios.get(`http://localhost:3478/rtpcapabilities/1234`));
        await device.load(
            {
                routerRtpCapabilities: rtpdata.data as types.RtpCapabilities
            }
        );

        console.log("recv transport used data")
        console.log(this.tempTransportData)
        

        const recvTransport: Transport = device.createRecvTransport(this.tempTransportData.consumerproperty);
        recvTransport.on("connect", (dtlsParameters, cb, err) => {
            this.ws.send(
                JSON.stringify(
                    {
                        type: "produceConnect",
                        data: {
                            transportId: recvTransport.id,
                            dtlsParameters: dtlsParameters.dtlsParameters,
                        }
                    }
                )
            );

            setTimeout(() => {
                console.log("run callback");
                cb();
            }, 3000);

        });

        console.log(data);
        (data as types.ConsumerOptions).kind = "video";
        // (data as types.ConsumerOptions).rtpParameters.codecs.push

        const consumer: types.Consumer = await recvTransport.consume(data as types.ConsumerOptions)
        const video = document.getElementById("stream") as HTMLVideoElement;
        video.srcObject = new MediaStream([consumer.track]);
    }

    private tempTransportData : any;
    public async onProduceResp(data: any, mediaStreamTrack: MediaStreamTrack) 
    {
        this.tempTransportData = data;

        const device = new Device();
        const rtpdata = (await axios.get(`http://localhost:3478/rtpcapabilities/1234`));
        await device.load(
            {
                routerRtpCapabilities: rtpdata.data as types.RtpCapabilities
            }
        );
        console.log(rtpdata)
        console.log(`canProduce("video") ${device.canProduce("video")}`)
        console.log(`canProduce("audio") ${device.canProduce("audio")}`)
        const sendTransport: Transport = device.createSendTransport(data);
        console.log(`send: Transport ${sendTransport.id}`);
        sendTransport.on("connect", (dtlsParameters, cb, err) => {
            console.log("send connect")
            console.log(dtlsParameters)
            this.ws.send(
                JSON.stringify(
                    {
                        type: "produceConnect",
                        data: {
                            transportId: sendTransport.id,
                            dtlsParameters: dtlsParameters.dtlsParameters,
                            isSend: true
                        }
                    }
                )
            );

            setTimeout(() => {
                console.log("run callback");
                cb();
            }, 3000);
        });

        sendTransport.on("produce", ({ kind, rtpParameters, appData }, cb, err) => {
            console.log("produce")
            console.log(rtpParameters)
            this.ws.send(
                JSON.stringify(
                    {
                        type: "produceStart",
                        data: {
                            transportId: sendTransport.id,
                            kind: kind,
                            rtpParameters: rtpParameters,
                            appData: appData
                        }
                    }
                )
            );

            this.callback = cb;
            this.errorCallback = err;
        });

        sendTransport.produce({
            track: mediaStreamTrack
        });

            // const rcev: Transport = device.createSendTransport(JSON.parse(data));

            // rcev.on("connect", (dtlsParameters, cb, err) => {
            //     console.log("rcev connect")
            // });

            // rcev.on("produce", (parameters, cb, err) => {
            //     console.log("produce")
            // });
            // rcev.consume()


        
    }
}