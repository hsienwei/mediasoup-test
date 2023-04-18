import {version, detectDevice, Device, types }  from "mediasoup-client";


export default  class MediasoupMgr{
    public static getMediasoupVersion(): string
    {
        return version;
    }

    public static getDevice(): string
    {
        return detectDevice() ?? "unknown";
    }


    public test() 
    {
        const device = new Device;

        const mediaCodecs: types.RtpCodecCapability[] =
        [
            {
                kind: "audio",
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2
            },
            {
                kind: "video",
                mimeType: "video/H264",
                clockRate: 90000,
                parameters:
                {
                    "packetization-mode": 1,
                    "profile-level-id": "42e01f",
                    "level-asymmetry-allowed": 1
                }
            },
            {
                kind: "video",
                mimeType: "video/VP8",
                clockRate: 90000,
                parameters: {

                }
            }
        ];

        device.load(
           { routerRtpCapabilities :
            { 
                codecs: mediaCodecs 
            } as types.RtpCapabilities
           }
        )
        .then( () => {
            console.log(device.canProduce("video"))
        }) 

        
    }
}