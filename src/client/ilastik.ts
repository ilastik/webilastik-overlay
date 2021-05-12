import { sleep } from "../util/misc"
import { IJsonable, Jsonable } from "../util/serialization"

export class Session{
    ilastik_url: string
    session_url: string
    token: string

    protected constructor({ilastik_url, session_url, token}: {
        ilastik_url: URL,
        session_url: URL,
        token: string
    }){
        this.ilastik_url = ilastik_url.toString().replace(/\/$/, "")
        this.session_url = session_url.toString().replace(/\/$/, "")
        this.token = token
    }

    public static async create({ilastik_url, session_duration_seconds, timeout_s=60, onProgress=(_) => {}}: {
        ilastik_url: URL,
        session_duration_seconds: number,
        timeout_s: number,
        onProgress?: (message: string) => void,
    }): Promise<Session>{
        const clean_ilastik_url = ilastik_url.toString().replace(/\/$/, "")
        const new_session_url = clean_ilastik_url + "/session"
        while(timeout_s > 0){
            let session_creation_response = await fetch(new_session_url, {
                method: "POST",
                body: JSON.stringify({session_duration: session_duration_seconds})
            })
            if(!session_creation_response.ok){
                onProgress(
                    `Requesting session failed (${session_creation_response.status}): ${session_creation_response.body}`
                )
                timeout_s -= 2
                await sleep(2000)
                continue
            }
            onProgress(`Successfully requested a session!`)
            let raw_session_data: {url: string, id: string, token: string} = await session_creation_response.json()
            while(timeout_s){
                let session_status_response = await fetch(clean_ilastik_url + `/session/${raw_session_data.id}`)
                if(session_status_response.ok  && (await session_status_response.json())["status"] == "ready"){
                    onProgress(`Session has become ready!`)
                    break
                }
                onProgress(`Session is not ready yet`)
                timeout_s -= 2
                await sleep(2000)
            }
            return new Session({
                ilastik_url: new URL(clean_ilastik_url),
                session_url: new URL(raw_session_data.url),
                token: raw_session_data["token"],
            })
        }
        throw `Could not create a session`
    }

    public static async load({ilastik_url, session_url, token}: {
        ilastik_url: URL, session_url:URL, token: string
    }): Promise<Session>{
        const status_endpoint = session_url.toString().replace(/\/?$/, "/status")
        let session_status_resp = await fetch(status_endpoint, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        if(!session_status_resp.ok){
            throw Error(`Bad response from session: ${session_status_resp.status}`)
        }
        return new Session({
            ilastik_url: ilastik_url,
            session_url: session_url,
            token: token,
        })
    }

    public createAppletSocket(applet_name: string): WebSocket{
        //FIXME  is there a point to handling socket errors?:
        let ws_url = new URL(this.session_url)
        ws_url.protocol = "ws:" //FIXME: use wss
        ws_url.pathname = ws_url.pathname + `/ws/${applet_name}`
        return new WebSocket(ws_url.toString())
    }

    public async close(): Promise<true | undefined>{
        let close_session_response = await fetch(this.session_url + `/close`, {method: "DELETE"})
        if(close_session_response.ok){
            return undefined
        }
        return true
    }
}

export abstract class FeatureExtractor implements IJsonable{
    public static fromJsonValue(data: any): FeatureExtractor{
        let feature_class_name = data["__class__"]
        if(feature_class_name == "GaussianSmoothing"){
            return new GaussianSmoothing(data)
        }
        if(feature_class_name == "GaussianGradientMagnitude"){
            return new GaussianGradientMagnitude(data)
        }
        if(feature_class_name == "HessianOfGaussianEigenvalues"){
            return new HessianOfGaussianEigenvalues(data)
        }
        if(feature_class_name == "LaplacianOfGaussian"){
            return new LaplacianOfGaussian(data)
        }
        if(feature_class_name == "DifferenceOfGaussians"){
            return new DifferenceOfGaussians(data)
        }
        if(feature_class_name == "StructureTensorEigenvalues"){
            return new StructureTensorEigenvalues(data)
        }
        throw Error(`Bad feature extractor class name in ${JSON.stringify(data)}`)
    }

    public static fromJsonList(data: Jsonable): FeatureExtractor[]{
        if(!(data instanceof Array)){
            throw `Bad payload: ${JSON.stringify(data)}`
        }
        return data.map(v => FeatureExtractor.fromJsonValue(v))
    }

    public equals(other: FeatureExtractor) : boolean{
        if(this.constructor !== other.constructor){
            return false
        }
        //FIXME: maybe impelment a faster comparison here?
        return JSON.stringify(this.toJsonValue()) == JSON.stringify(other.toJsonValue())
    }

    public toJsonValue(): Jsonable{
        let out = JSON.parse(JSON.stringify(this))
        //FIXME: Class name
        out["__class__"] = this.constructor.name
        return out
    }
}

export class GaussianSmoothing extends FeatureExtractor{
    public readonly sigma: number;
    public readonly axis_2d: string;
    public constructor({sigma, axis_2d="z"}:{
        sigma: number,
        axis_2d?: string
    }){
        super()
        this.sigma=sigma
        this.axis_2d=axis_2d
    }
}

export class GaussianGradientMagnitude extends FeatureExtractor{
    public readonly sigma: number;
    public readonly axis_2d: string;
    public constructor({sigma, axis_2d="z"}: {
        sigma: number,
        axis_2d?: string
    }){
        super()
        this.sigma=sigma
        this.axis_2d=axis_2d
    }
}

export class HessianOfGaussianEigenvalues extends FeatureExtractor{
    public readonly scale: number;
    public readonly axis_2d: string;
    public constructor({scale, axis_2d='z'}: {
        scale: number,
        axis_2d?: string
    }){
        super()
        this.scale=scale
        this.axis_2d=axis_2d
    }
}

export class LaplacianOfGaussian extends FeatureExtractor{
    public readonly scale: number;
    public readonly axis_2d: string;
    public constructor({scale, axis_2d='z'}: {
        scale: number,
        axis_2d?: string
    }){
        super()
        this.scale=scale
        this.axis_2d=axis_2d
    }
}

export class DifferenceOfGaussians extends FeatureExtractor{
    public readonly sigma0: number;
    public readonly sigma1: number;
    public readonly axis_2d: string;
    public constructor({sigma0, sigma1, axis_2d="z"}: {
        sigma0: number,
        sigma1: number,
        axis_2d?: string
    }){
        super()
        this.sigma0=sigma0
        this.sigma1=sigma1
        this.axis_2d=axis_2d
    }
}

export class StructureTensorEigenvalues extends FeatureExtractor{
    public readonly innerScale: number;
    public readonly outerScale: number;
    public readonly axis_2d: string;
    public constructor({innerScale, outerScale, axis_2d="z"}: {
        innerScale: number,
        outerScale: number,
        axis_2d?: string
    }){
        super()
        this.innerScale=innerScale
        this.outerScale=outerScale
        this.axis_2d=axis_2d
    }
}

export class Color{
    public readonly r: number;
    public readonly g: number;
    public readonly b: number;
    public readonly a: number;
    public constructor({r=0, g=0, b=0, a=255}: {r: number, g: number, b: number, a: number}){
        this.r = r; this.g = g; this.b = b; this.a = a;
    }
    public static fromJsonData(data: any): Color{
        return new Color(data)
    }
}

export class Annotation{
    public constructor(
        public readonly voxels: Array<{x:number, y:number, z:number}>,
        public readonly color: Color,
        public readonly raw_data: DataSource
    ){
    }
    public static fromJsonData(data: any): Annotation{
        return new Annotation(
            data["voxels"],
            Color.fromJsonData(data["color"]),
            DataSource.fromJsonData(data["raw_data"])
        )
    }
}

export class Shape5D{
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;
    public readonly t: number;
    public readonly c: number;
    constructor({x, y, z, t, c}: {x: number, y: number, z: number, t: number, c: number}){
        this.x = x; this.y = y; this.z = z; this.t = t; this.c = c;
    }
    public static fromJsonData(data: any){
        return new this(data)
    }
}

export class DataSource{
    public constructor(public readonly url: string, public readonly shape: Shape5D){
    }
    public static fromJsonData(data: any) : DataSource{
        return new this(data["url"], Shape5D.fromJsonData(data["shape"]))
    }
}

export class Lane{
    public constructor(public readonly raw_data: DataSource){
    }
    public static fromJsonData(data: any): Lane{
        return new Lane(DataSource.fromJsonData(data["raw_data"]))
    }
}

// export abstract class Applet{
//     public constructor(public readonly name: string, public readonly socket: WebSocket){
//         socket.addEventListener('message', (event) => {
//             let payload = JSON.parse(event.data)
//             if("applet_name" in payload && payload["applet_name"] == this.name){
//                 console.debug(`+++>>> Applet ${this.name} got message ${JSON.stringify(payload, null, 4)}`)
//                 this.updateState(payload)
//             }
//         })
//     }

//     protected doRpc(method_name: string, args: any){
//         console.debug(`>>>>>> Running RPC" ${this.name}.${method_name} with payloaf ${JSON.stringify(args, null, 4)}`)
//         this.socket.send(JSON.stringify({
//             "applet_name": this.name,
//             "method_name": method_name,
//             "args": args
//         }))
//     }

//     protected updateState(event_payload: any){
//         console.debug(`Applet ${this.name} did not process socket event ${event_payload}`)
//     }
// }

// export type OnItemsChangedCallback<T> = (items: Array<T>) => any;

// export abstract class SequenceProviderApplet<T> extends Applet{
//     public items: Array<T> = []
//     private onItemsChanged: OnItemsChangedCallback<T>
//     public constructor({name, socket, onItemsChanged=(_) => {}}: {
//         name: string,
//         socket: WebSocket,
//         onItemsChanged?: OnItemsChangedCallback<T>,
//     }){
//         super(name, socket)
//         this.onItemsChanged = onItemsChanged
//     }

//     public async setItems(items: Array<T>) : Promise<any>{
//         this.items = [...items]
//         this.doRpc("set_items", {"items": items})
//         this.onItemsChanged(items)
//     }
// }

// export class DataSelectionApplet extends SequenceProviderApplet<Lane>{
//     public async addLaneFromUrl(url: string){
//         this.doRpc("add", {"items": [{"raw_data": url}]})
//     }
//     protected updateState(event_payload: any){
//         this.items = (<Array<any>> event_payload["items"]).map(item => Lane.fromJsonData(item))
//     }
// }

// export class BrushingApplet extends SequenceProviderApplet<Annotation>{
//     protected updateState(event_payload: any){
//         this.items = (<Array<any>>event_payload["items"]).map(item => Annotation.fromJsonData(item))
//     }
// }

// export class PixelClassificationApplet extends Applet{
// }

// export class ExportApplet extends Applet{
// }
