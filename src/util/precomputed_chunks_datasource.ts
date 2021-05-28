export class PrecomputedChunksScale{
    public readonly base_url: string
    public readonly key: string
    public readonly size: [number, number, number]
    public readonly resolution: [number, number, number]
    public readonly voxel_offset: [number, number, number]
    public readonly chunk_sizes: [number, number, number][]
    public readonly encoding: string

    constructor(
        base_url: string,
        public readonly raw_scale: {
            key: string,
            size: [number, number, number],
            resolution: [number, number, number],
            voxel_offset: [number, number, number],
            chunk_sizes: Array<[number, number, number]>,
            encoding:  "raw" | "jpeg" | "compressed_segmentation",
        },
    ){
        this.base_url = base_url.replace(/\/$/, "")
        this.key = raw_scale.key.replace(/\/$/, "")
        this.size = raw_scale.size
        this.resolution = raw_scale.resolution
        this.voxel_offset = raw_scale.voxel_offset
        this.chunk_sizes = raw_scale.chunk_sizes
        this.encoding = raw_scale.encoding
    }

    public getUrl() : string{
        return "precomputed://" + this.base_url + "/" + this.key
    }

    public getChunkUrl(interval: {x: [number, number], y: [number, number], z: [number, number]}): string{
        return this.getUrl().toString() +
            `${interval.x[0]}-${interval.x[1]}_${interval.y[0]}-${interval.y[1]}_${interval.z[0]}-${interval.z[1]}`
    }

    public getFullChunkUrl(): string{
        return this.getChunkUrl({x: [0, this.size[0]], y: [0, this.size[1]], z: [0, this.size[2]]})
    }
}

export class PrecomputedChunks{
    public readonly type: string;
    public readonly data_type: string;
    public readonly num_channels: number;
    public readonly scales: PrecomputedChunksScale[];

    constructor(
        public readonly base_url: string,
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
        this.scales = raw_info.scales.map((raw_scale: any) => new PrecomputedChunksScale(base_url, raw_scale))
    }

    public static async create(url: URL | string): Promise<PrecomputedChunks>{
        const base_url = url.toString().replace(/^precomputed:\/\//, "").replace(/\/$/, "").replace(/\/info$/, "")
        if(!["http:", "https:"].includes(new URL(base_url.toString()).protocol)){
            throw `Unsupported precomputed chunks URL: ${base_url}`
        }
        const info_resp = await fetch(base_url + "/info")
        if(!info_resp.ok){
            throw `Failed requesting ${base_url + "/info"}`
        }
        return new PrecomputedChunks(base_url, await info_resp.json())
    }
}
