import { IJsonable, Jsonable } from "../util/serialization"

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
