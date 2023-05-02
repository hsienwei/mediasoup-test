interface Data {
    [key: string]: any
}

function createSequenceNumber(): number {
    return Date.now() * 10000 + Math.floor(Math.random() * 10000);
}

export class Message {
    public sequence: number = 0;
    public type: MessageType = MessageType.REQUEST;
    public from?: string;
    public data?: Data;
    constructor(public message?: string) {
        this.sequence = createSequenceNumber();
    }
}

export class Request {
    constructor(public callback: (response: Message) => void, public sendTime: number = Date.now()) { }
}

export class Response {
    constructor(public success: boolean = false, public message?: Message) { }
}

enum MessageType {
    REQUEST = 1,
    RESPONSE,
    NOTIFY
}


enum ConnectState {
    IDLE,
    CONNECTING,
    CONNECTED,
    CLOSEING,
    CLOSED
}

export default class WebsocketClient {
    private requestMap = new Map<number, Request>();
    private conn: WebSocket | null = null;
    private state: ConnectState = ConnectState.IDLE;
    private timer: number;

    constructor(private wsurl: string){}

    async request(data: Message): Promise<Response> {
        return new Promise((resolve, _) => {
            let seq = data.sequence

            // asynchronous wait ack from server
            let callback = (msg: Message) => {    
                // remove from sendq
                this.requestMap.delete(seq)
                resolve(new Response(true, msg))
                clearTimeout(this.timer);
            }

            this.requestMap.set(seq, new Request(callback)) 

            if (!this.send(JSON.stringify(data))) {   
                resolve(new Response(false))
                clearTimeout(this.timer);
            } else {
                this.timer = setTimeout(() => {
                    this.requestMap.delete(seq)
                    console.log("time out")
                    resolve(new Response(false))
                }, 10000);
            }
        })
    }

    send(data: string): boolean {
        try {
            if (this.conn === null) {
                return false
            }
            this.conn.send(data)
        } catch (error) {
            return false
        }
        return true
    }

    async login(): Promise<{ success: boolean }> {
        if (this.state == ConnectState.CONNECTED) {
            return { success: false }
        }

        this.state = ConnectState.CONNECTING
        return new Promise((resolve, _) => {
            let conn = new WebSocket(this.wsurl)
            conn.binaryType = "arraybuffer"
            let returned = false
            conn.onopen = () => {
                console.info("websocket open - readyState:", conn.readyState)
                if (conn.readyState === WebSocket.OPEN) {
                    returned = true
                    resolve({ success: true })
                }
            }
    
            // overwrite onmessage
            conn.onmessage = (ev: MessageEvent) => {
                try {
                    let msg = new Message();
                    Object.assign(msg, JSON.parse(<string>ev.data))
                    if (msg.type === MessageType.RESPONSE) {
                        let req = this.requestMap.get(msg.sequence)    
                        if (req) {
                            req.callback(msg)                       
                        }
                    } else if (msg.type === MessageType.NOTIFY) {
                        console.log(msg.message, msg.from)
                    }
                } catch (error) {
                    console.error(ev.data, error)
                }
            }
    
            conn.onerror = (error) => {
                console.info("websocket error: ", error)
                if (returned) {
                    resolve({ success: false })
                }
            }
    
            conn.onclose = (e: CloseEvent) => {
                console.debug("event[onclose] fired")
                this.onclose(e.reason)
            }
            this.conn = conn;
            this.state = ConnectState.CONNECTED;
        })
    }

    public logout() {
        if (this.state === ConnectState.CLOSEING) {
            return
        }
        if (!this.conn) {
            return
        }
        this.state = ConnectState.CLOSEING;
        this.conn.close();
    }

    private onclose(reason: string) {
        console.info("connection closed due to " + reason)
        this.state = ConnectState.CLOSED
    }
    
}
