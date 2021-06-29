import { vec3 } from "gl-matrix"
import { DataSource, Session } from "../client/ilastik"
import { ParsedUrl } from "./misc"
import { ensureJsonArray, ensureJsonNumber, ensureJsonNumberTripplet, ensureJsonObject, ensureJsonString, JsonValue } from "./serialization"


const encodings = ["raw", "jpeg", "compressed_segmentation"] as const;
export type Encoding = typeof encodings[number];
export function ensureEncoding(value: string): Encoding{
    const variant = encodings.find(variant => variant === value)
    if(variant === undefined){
        throw Error(`Invalid encoding: ${value}`)
    }
    return variant
}

export class Scale{
    public readonly base_url: ParsedUrl
    public readonly key: string
    public readonly size: [number, number, number]
    public readonly resolution: [number, number, number]
    public readonly voxel_offset: [number, number, number]
    public readonly chunk_sizes: [number, number, number][]
    public readonly encoding: Encoding

    constructor(base_url: ParsedUrl, params: {
        key: string,
        size: [number, number, number],
        resolution: [number, number, number],
        voxel_offset: [number, number, number],
        chunk_sizes: Array<[number, number, number]>,
        encoding: Encoding,
    }){
        this.base_url = base_url
        this.key = params.key.replace(/^\//, "")
        this.size = params.size
        this.resolution = params.resolution
        this.voxel_offset = params.voxel_offset
        this.chunk_sizes = params.chunk_sizes
        this.encoding = params.encoding
    }

    public getUrl() : ParsedUrl{
        return this.base_url.concat(this.key)
    }

    public getChunkUrl(interval: {x: [number, number], y: [number, number], z: [number, number]}): ParsedUrl{
        return this.getUrl().concat(
            `${interval.x[0]}-${interval.x[1]}_${interval.y[0]}-${interval.y[1]}_${interval.z[0]}-${interval.z[1]}`
        )
    }

    public getFullChunkUrl(): ParsedUrl{
        return this.getChunkUrl({x: [0, this.size[0]], y: [0, this.size[1]], z: [0, this.size[2]]})
    }

    public toDataSource(): DataSource{
        return new DataSource(this.getUrl().getSchemedHref("://"), this.resolution)
    }

    public toResolutionDisplayString(): string{
        return `${this.resolution[0]} x ${this.resolution[1]} x ${this.resolution[2]} nm`
    }

    public isSameResolutionAs(other: Scale): boolean{
        return vec3.equals(this.resolution, other.resolution)
    }

    public async toStrippedPrecomputedChunks(session: Session): Promise<PrecomputedChunks>{
        const encoded_base_url = Session.btoa(this.base_url.getSchemedHref("://"))
        const resolution_str = `${this.resolution[0]}_${this.resolution[1]}_${this.resolution[2]}`
        const compound_url = ParsedUrl.parse(session.session_url)
            .concat(`stripped_precomputed_info/url=${encoded_base_url}/resolution=${resolution_str}`)
        return await PrecomputedChunks.create(compound_url)
    }

    public static fromJsonValue(base_url: ParsedUrl, value: JsonValue){
        const obj = ensureJsonObject(value)
        return new Scale(base_url, {
            key: ensureJsonString(obj.key),
            size: ensureJsonNumberTripplet(obj.size),
            resolution: ensureJsonNumberTripplet(obj.resolution),
            voxel_offset: ensureJsonNumberTripplet(obj.voxel_offset),
            chunk_sizes: ensureJsonArray(obj.chunk_sizes).map(element => ensureJsonNumberTripplet(element)),
            encoding: ensureEncoding(ensureJsonString(obj.encoding)),
        })
    }
}


const types = ["image", "segmentation"] as const;
export type Type = typeof types[number];
export function ensureType(value: string): Type{
    const variant = types.find(variant => variant === value)
    if(variant === undefined){
        throw Error(`Invalid type: ${value}`)
    }
    return variant
}

const dataTypes = ["uint8", "uint16", "uint32", "uint64", "float32"] as const;
export type DataType = typeof dataTypes[number];
export function ensureDataType(value: string): DataType{
    const variant = dataTypes.find(variant => variant === value)
    if(variant === undefined){
        throw Error(`Invalid data type: ${value}`)
    }
    return variant
}

export class PrecomputedChunks{
    public readonly url: ParsedUrl;
    public readonly type: Type;
    public readonly data_type: DataType;
    public readonly num_channels: number;
    public readonly scales: Scale[];

    constructor(params: {
        url: ParsedUrl,
        type: Type,
        data_type: DataType,
        num_channels: number,
        scales: Array<Scale>,
    }){
        if(params.url.href.includes("/info")){
            debugger;
        }
        this.url = params.url
        this.type = params.type
        this.data_type = params.data_type
        this.num_channels = params.num_channels
        this.scales = params.scales
    }

    public static async create(url: ParsedUrl): Promise<PrecomputedChunks>{
        url = url.ensureDataScheme("precomputed")
        url = url.name == "info" ? url.getParent() : url
        if(!["http://", "https://"].includes(url.protocol)){
            throw `Unsupported precomputed chunks URL: ${url.getSchemedHref("+")}`
        }
        const info_url = url.concat("info").href
        const info_resp = await fetch(info_url)
        if(!info_resp.ok){
            throw `Failed requesting ${info_url}`
        }

        const raw_info = ensureJsonObject(await info_resp.json())
        return new PrecomputedChunks({
            url,
            type: ensureType(ensureJsonString(raw_info["type"])),
            data_type: ensureDataType(ensureJsonString(raw_info["data_type"])),
            num_channels: ensureJsonNumber(raw_info["num_channels"]),
            scales: ensureJsonArray(raw_info["scales"]).map(raw_scale => Scale.fromJsonValue(url, raw_scale))
        })
    }

    public isStripped(): boolean{
        return this.url.href.includes("stripped_precomputed_info/url=")
    }

    public findScale(target: vec3 | Scale): Scale | undefined{
        const resolution = target instanceof Scale ? target.resolution : target
        return this.scales.find(scale => vec3.equals(scale.resolution, resolution))
    }

    public async getUnstripped(): Promise<PrecomputedChunks>{
        const match = this.url.href.match(/stripped_precomputed_info\/url=(?<url>[^/]+)\/resolution=(?<resolution>\d+_\d+_\d+)/)
        if(match === null){
            return this
        }
        const encoded_url = match.groups!["url"]
        const url = ParsedUrl.parse(Session.atob(encoded_url))
        return await PrecomputedChunks.create(url)
    }
}
