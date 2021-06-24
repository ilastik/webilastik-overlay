import { ParsedUrl } from "./misc"

export class PrecomputedChunksScale{
    public readonly base_url: ParsedUrl
    public readonly key: string
    public readonly size: [number, number, number]
    public readonly resolution: [number, number, number]
    public readonly voxel_offset: [number, number, number]
    public readonly chunk_sizes: [number, number, number][]
    public readonly encoding: string

    constructor(
        base_url: ParsedUrl,
        public readonly raw_scale: {
            key: string,
            size: [number, number, number],
            resolution: [number, number, number],
            voxel_offset: [number, number, number],
            chunk_sizes: Array<[number, number, number]>,
            encoding:  "raw" | "jpeg" | "compressed_segmentation",
        },
    ){
        this.base_url = base_url
        this.key = raw_scale.key.replace(/^\//, "")
        this.size = raw_scale.size
        this.resolution = raw_scale.resolution
        this.voxel_offset = raw_scale.voxel_offset
        this.chunk_sizes = raw_scale.chunk_sizes
        this.encoding = raw_scale.encoding
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
}

export class PrecomputedChunks{
    public readonly type: string;
    public readonly data_type: string;
    public readonly num_channels: number;
    public readonly scales: PrecomputedChunksScale[];

    constructor(
        public readonly url: ParsedUrl,
        raw_info: {
            "@type"?: "neuroglancer_multiscale_volume",
            type: "image" | "segmentation",
            data_type: "uint8" | "uint16" | "uint32" | "uint64" | "float32",
            num_channels: number,
            scales: any,
        },
    ){
        this.type = raw_info.type
        this.data_type = raw_info.data_type
        this.num_channels = raw_info.num_channels
        this.scales = raw_info.scales.map((raw_scale: any) => new PrecomputedChunksScale(url, raw_scale))
    }

    public static async create(url: URL | string): Promise<PrecomputedChunks>{
        let base_url = ParsedUrl.parse(url.toString())
        if(!base_url.protocol.startsWith("precomputed://")){
            base_url = base_url.withProtocol(`precomputed://${base_url.protocol}`)
        }
        if(base_url.name == "info"){
            base_url = base_url.getParent()
        }
        if(!["precomputed://http://", "precomputed://https:"].includes(base_url.protocol )){
            throw `Unsupported precomputed chunks URL: ${base_url}`
        }
        const info_url = base_url.concat("info").href
        const info_resp = await fetch(info_url)
        if(!info_resp.ok){
            throw `Failed requesting ${info_url}`
        }
        return new PrecomputedChunks(base_url, await info_resp.json())
    }

    /**Using fixer_server_url, produces a PrecomputedChunks object which has a single scale, specified via the resolution parameter */
    public static async create_stripped({url, fixer_server_url, resolution}: {
        url: URL | string, fixer_server_url: URL, resolution: [number, number, number]
    }): Promise<PrecomputedChunks>{
        const encoded_original_url = btoa(url.toString()).replace("+", "-").replace("/", "_")
        const resolution_str = `${resolution[0]}_${resolution[1]}_${resolution[2]}`
        const compound_url = ParsedUrl.parse(fixer_server_url.toString())
            .concat(`stripped_precomputed_info/url=${encoded_original_url}/resolution=${resolution_str}`)
        return await PrecomputedChunks.create(compound_url.href)
    }

    public async stripped(fixer_server_url: URL, scale: PrecomputedChunksScale): Promise<PrecomputedChunks>{
        return PrecomputedChunks.create_stripped({url: this.url.href, fixer_server_url, resolution: scale.resolution})
    }
}
