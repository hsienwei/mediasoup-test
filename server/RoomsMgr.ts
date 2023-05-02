

import * as mediasoup from "mediasoup"
import { types  } from "mediasoup"
import * as config from './config/config'
import { MediaKind } from "mediasoup/node/lib/RtpParameters";
import { WorkerResourceUsage } from "mediasoup/node/lib/types";

import WebSocket from "ws"

interface Room {
  router: types.Router;
  transport?: types.WebRtcTransport;
  transportC?: types.WebRtcTransport;
  name: string;
  producerID?: string;
}

interface TransportConnectData {
    transportId: string;
    dtlsParameters : types.DtlsParameters;
    isSend?: boolean;
}

interface TransportStartData {
    transportId: string;
    kind : MediaKind;
    rtpParameters: types.RtpParameters;
    appData: types.AppData;
}



type RoomTransportProperty = Pick<types.WebRtcTransport, "id" | "iceParameters" | "iceCandidates" | "dtlsParameters">;


export default class RoomsMgr {
    private worker: mediasoup.types.Worker | null = null; 

    private webRtcServer: mediasoup.types.WebRtcServer | null = null;

    private rooms: Room[] = [];

    public async init() {
        mediasoup.observer.on("newworker", (worker) => {
            console.log("new worker created [pid:%d]", worker.pid);
        });

        this.worker = await mediasoup.createWorker(
            config.mediasoup.workerSettings as types.WorkerSettings
        );

        this.worker.observer.on("newwebrtcserver", (webrtcserver) => {
            console.log("============= webrtcserver new ==========");
        });

        this.worker.observer.on("newrouter", (webrtcserver) => {
            console.log("============= router new ==========");
        });

        this.webRtcServer = await this.worker.createWebRtcServer(
            config.mediasoup.webRtcServerOptions as types.WebRtcServerOptions
        );
    }


    private async createTransport(): Promise<[types.Router, types.WebRtcTransport, types.WebRtcTransport]>
    {
        if (this.worker === null) return Promise.reject("worker is null");
        if (this.webRtcServer === null) return Promise.reject("webRtcServer is null");

        const router = await this.worker.createRouter(config.mediasoup.routerOptions as types.RouterOptions);

        const transport = await router.createWebRtcTransport(
            {
                // Use webRtcServer or listenIps
                webRtcServer: this.webRtcServer,
                //listenIps: [{ ip: "127.0.0.1"/*, announcedIp: "88.12.10.41" */}],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true
            }
        );

        const transportCosumer = await router.createWebRtcTransport(
            {
                // Use webRtcServer or listenIps
                webRtcServer: this.webRtcServer,
                //listenIps: [{ ip: "127.0.0.1"/*, announcedIp: "88.12.10.41" */}],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true
            }
        );

        return [router, transport, transportCosumer];
    
    
    }

    public async createR(roomName: string): Promise<boolean> {
        if(roomName.length === 0)
        Promise.reject("room name illegal")

        if (this.worker === null) return Promise.reject("worker is null");
        if (this.webRtcServer === null) return Promise.reject("webRtcServer is null");


        if( this.rooms.find( (room) => {
            return room.name === roomName;
        }))
            return false;

        const router = await this.worker.createRouter(config.mediasoup.routerOptions as types.RouterOptions);

        const room: Room = {
            router: router,
            name: roomName,
        };
        this.rooms.push(room);

        return true;
    }

    public async createP(roomName: string): Promise<{result: boolean, roomp?: RoomTransportProperty}> {


        const room: Room | undefined = this.rooms.find( (room) => {
            return room.name === roomName;
        });
        
        if(room === undefined)    return {result: false};

        if (this.webRtcServer === null) return {result: false};

        const transport = await room.router.createWebRtcTransport(
            {
                // Use webRtcServer or listenIps
                webRtcServer: this.webRtcServer,
                //listenIps: [{ ip: "127.0.0.1"/*, announcedIp: "88.12.10.41" */}],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true
            }
        );

        room.transport = transport;

        const property: RoomTransportProperty =
        {
            id: room.transport.id,
            iceParameters: room.transport.iceParameters,
            iceCandidates: room.transport.iceCandidates,
            dtlsParameters: room.transport.dtlsParameters
        };
                    

        return {result: true, roomp: property};
    }

    public async createRoom(roomName: string): Promise<RoomTransportProperty> {

        if(roomName.length === 0)
            Promise.reject("room name illegal")

        return new Promise<RoomTransportProperty>( (resolve, reject) => {
            if(this.worker === null)   
            {
                reject("worker not init.");
                return;
            }

            this.createTransport()
            .then( ([router, transport, transportConsume]) => {

                const room: Room = {
                    router: router,
                    transport: transport,
                    transportC: transportConsume,
                    name: roomName,
                };

                transport.observer.on("newproducer", (producer) => {
                    console.log(`producer added ${producer.id}`);
                    room.producerID = producer.id;
                });

                transportConsume.observer.on("newconsumer", (consumer) => {
                    console.log(`consumer added ${consumer.id}`);
                });

                this.rooms.push(room);

                if(room.transport)
                {
                    const property: RoomTransportProperty = 
                    {
                        id: room.transport.id,
                        iceParameters : room.transport.iceParameters,
                        iceCandidates: room.transport.iceCandidates,
                        dtlsParameters: room.transport.dtlsParameters
                    };
                    
                    if( room.transportC )
                    {
                    (property as any)["consumerproperty"] = {
                        id: room.transportC.id,
                        iceParameters : room.transportC.iceParameters,
                        iceCandidates: room.transportC.iceCandidates,
                        dtlsParameters: room.transportC.dtlsParameters
                    };
                    }
                    resolve(property);
                }
                else
                {
                    reject();
                }
            })
            .catch( () => {
                reject("room create failed.");
            })
        });

    }


    public produceConnect(data: TransportConnectData) {
        const { transportId, dtlsParameters, isSend } = data;
        const room = this.rooms.find((room) => {
            
            if(isSend)
                return room.transport?.id === transportId ;
            else
                return room.transportC?.id === transportId ;
        });
        console.log(room?.name);
        console.log(dtlsParameters.fingerprints);
        if(isSend)
        {
            if(room !== undefined)
                room.transport?.connect({dtlsParameters});
        }
        else
        {
            if(room !== undefined)
                room.transportC?.connect({dtlsParameters});
        }
            
    }

    public async roomProducer(data: any, ws: WebSocket) {
        const room = this.rooms.find((room) => {
            return room.name === data ;
        });

        if(room === undefined)
            return;

        if(room.producerID === undefined)
            return;

        const consumer = await room.transportC?.consume({
            producerId: room.producerID,
            rtpCapabilities: room.router.rtpCapabilities
        });

        console.log("roomProducer");
        ws.send(JSON.stringify(
            {
                type: "respRoomProducer",
                data: {
                    id: consumer?.id,//consumerid   room.transport.id,
                    producerId: consumer?.producerId,
                    rtpParameters: consumer?.rtpParameters,      
                } 
            }));
    }

    public produceStart(data: TransportStartData, ws: WebSocket) {
        const { transportId, kind, rtpParameters, appData} = data;
        const room = this.rooms.find((room) => {
            return room.transport?.id === transportId ;
        });

        
        if(room === undefined)    return;
        
        room.transport?.produce({
            kind,
            rtpParameters,
            appData
        }).then( (producer) => {
            ws.send(
                JSON.stringify( {
                    type: "producerID",
                    data: producer.id
                }
                 
                )
            );
        })

        
        
    }

    public getList(): string[]
    {
        return this.rooms.map( (room) => {
            return room.name + "_" + room.transport?.id;
        });
    }

    public getRoom(name: string): Room | undefined {
        return this.rooms.find( (room) => {
            return room.name === name;
        });
    }
}

