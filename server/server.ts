import * as mediasoup from "mediasoup"
import { types  } from "mediasoup"

//let rtpParameters: types.RtpParameters;
// types.RtpParameters.RtpCodecCapability


export type AppData =
{
  [key: string]: unknown;
};


console.log(mediasoup.version);

async function start() {

    mediasoup.observer.on("newworker", (worker) =>
{
  console.log("new worker created [pid:%d]", worker.pid);
});

    const worker = await mediasoup.createWorker<{ foo: number }>(
        {
            logLevel: "warn",
            //dtlsCertificateFile: "/home/foo/dtls-cert.pem",
            //dtlsPrivateKeyFile: "/home/foo/dtls-key.pem",
            //appData: { foo: 123 }
        });


        //const rtpCapabilities = mediasoup.getSupportedRtpCapabilities();
        //console.log(rtpCapabilities);


        // worker.close();


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

    const router = await worker.createRouter({ mediaCodecs });


    const webRtcServer = await worker.createWebRtcServer(
        {
          listenInfos :
          [
            {
              protocol : 'udp',
              ip       : '127.0.0.1',
              port     : 20000
            },
            {
              protocol : 'tcp',
              ip       : '127.0.0.1',
              port     : 20000
            }
          ]
        });

    const transport = await router.createWebRtcTransport(
        {
            // Use webRtcServer or listenIps
            webRtcServer: webRtcServer,
            //listenIps: [{ ip: "192.168.0.111", announcedIp: "88.12.10.41" }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true
        }
    )
        console.log(transport.id);


        const producer = await transport.produce(
            {
              kind          : "video",
              rtpParameters :
              {
                mid    : "1",
                codecs :
                [
                  {
                    mimeType    : "video/VP8",
                    payloadType : 101,
                    clockRate   : 90000,
                    rtcpFeedback :
                    [
                      { type: "nack" },
                      { type: "nack", parameter: "pli" },
                      { type: "ccm", parameter: "fir" },
                      { type: "goog-remb" }
                    ]
                  },
                  {
                    mimeType    : "video/rtx",
                    payloadType : 102,
                    clockRate   : 90000,
                    parameters  : { apt: 101 }
                  }
                ],
                headerExtensions :
                [
                  {
                    id  : 2, 
                    uri : "urn:ietf:params:rtp-hdrext:sdes:mid"
                  },
                  { 
                    id  : 3, 
                    uri : "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id"
                  },
                  { 
                    id  : 5, 
                    uri: "urn:3gpp:video-orientation" 
                  },
                  { 
                    id  : 6, 
                    uri : "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
                  }
                ],
                encodings :
                [
                  { rid: "r0", /*active: true,*/ maxBitrate: 100000 },
                  { rid: "r1", /*active: true,*/ maxBitrate: 300000 },
                  { rid: "r2", /*active: true,*/ maxBitrate: 900000 }
                ],
                rtcp :
                {
                  cname : "Zjhd656aqfoo"
                }
              }
            });


            const consumer = await transport.consume(
                {
                  producerId      : producer.id, //"a7a955cf-fe67-4327-bd98-bbd85d7e2ba3",
                  rtpCapabilities :
                  {
                    codecs :
                    [
                      {
                        mimeType             : "audio/opus",
                        kind                 : "audio",
                        clockRate            : 48000,
                        preferredPayloadType : 100,
                        channels             : 2
                      },
                      {
                        mimeType             : "video/VP8",
                        kind                 : "video",
                        clockRate            : 90000,
                        preferredPayloadType : 101,
                        rtcpFeedback         :
                        [
                          { type: "nack" },
                          { type: "nack", parameter: "pli" },
                          { type: "ccm", parameter: "fir" },
                          { type: "goog-remb" }
                        ],
                        parameters :
                        {
                          "level-asymmetry-allowed" : 1,
                          "packetization-mode"      : 1,
                          "profile-level-id"        : "4d0032"
                        }
                      },
                      {
                        mimeType             : "video/rtx",
                        kind                 : "video",
                        clockRate            : 90000,
                        preferredPayloadType : 102,
                        rtcpFeedback         : [],
                        parameters           :
                        {
                          apt : 101
                        }
                      }
                    ],
                    headerExtensions :
                    [
                      {
                        kind             : "video",
                        uri              : "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time", // eslint-disable-line max-len
                        preferredId      : 4,
                        preferredEncrypt : false
                      },
                      {
                        kind             : "audio",
                        uri              : "urn:ietf:params:rtp-hdrext:ssrc-audio-level",
                        preferredId      : 8,
                        preferredEncrypt : false
                      },
                      {
                        kind             : "video",
                        uri              : "urn:3gpp:video-orientation",
                        preferredId      : 9,
                        preferredEncrypt : false
                      },
                      {
                        kind             : "video",
                        uri              : "urn:ietf:params:rtp-hdrext:toffset",
                        preferredId      : 10,
                        preferredEncrypt : false
                      }
                    ]
                  }
                });


                console.log(await transport.getStats())
}


start()
.then( () => {
    console.log("started")
})
