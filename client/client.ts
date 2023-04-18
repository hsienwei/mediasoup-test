import MediasoupMgr from './mediasoupMgr'

//document.body.onload = (ev: Event) => {
    const div = document.getElementById("version") as HTMLDivElement;
    div.innerText = `mediasoup version: ${MediasoupMgr.getMediasoupVersion()} 
                    device ${MediasoupMgr.getDevice()}`;
                    new MediasoupMgr().test();
    
//} ;
