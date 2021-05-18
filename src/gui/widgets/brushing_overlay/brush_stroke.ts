import { quat, vec3 } from "gl-matrix";
import { Vec3AttributeBuffer, BufferUsageHint } from "../../../gl/buffer";
import { VertexArray } from "../../../gl/vertex_primitives";
import { ensureObject, IJsonable, IJsonableObject, Jsonable } from "../../../util/serialization";
// import { vec3ToString } from "./utils";

export class BrushStroke extends VertexArray implements IJsonable{
    public readonly camera_orientation: quat
    public num_voxels : number
    public readonly color : vec3
    public readonly positions_buffer: Vec3AttributeBuffer
    public readonly annotated_data_url: URL;

    constructor({gl, start_postition, color, camera_orientation, annotated_data_url}: {
        gl: WebGL2RenderingContext,
        start_postition: vec3,
        color: vec3,
        camera_orientation: quat,
        annotated_data_url: URL,
    }){
        let data = new Float32Array(1024 * 3) // 1024 vec3's
        super(data)
        this.camera_orientation = quat.create(); quat.copy(this.camera_orientation, camera_orientation)
        this.annotated_data_url = annotated_data_url
        this.num_voxels = 0
        this.color = vec3.create(); vec3.copy(this.color, color)
        this.positions_buffer = new Vec3AttributeBuffer(gl, data, BufferUsageHint.DYNAMIC_DRAW)
        this.add_voxel(start_postition)
    }

    private getLastVoxelRef() : vec3{
        return this.getVertRef(this.num_voxels - 1)
    }

    public add_voxel(voxel: vec3){
        let rounded_centered_voxel = vec3.fromValues(
            Math.floor(voxel[0]),
            Math.floor(voxel[1]),
            Math.floor(voxel[2])
        )
        if(vec3.equals(this.getLastVoxelRef(), rounded_centered_voxel)){
            return
        }
        // console.log(`Added voxel ${vecToString(rounded_centered_voxel)} to brush stroke`)
        vec3.copy(this.getVertRef(this.num_voxels), rounded_centered_voxel)
        this.positions_buffer.populate({
            dstByteOffset: this.num_voxels * voxel.length * Float32Array.BYTES_PER_ELEMENT,
            data: new Float32Array(rounded_centered_voxel)
        })
        this.num_voxels += 1
    }

    public destroy(){
        this.positions_buffer.destroy()
    }

    public toJsonValue(): IJsonableObject{
        let raw_voxels: Array<{x: number, y: number, z: number}> = []
        for(let i=0; i<this.num_voxels; i++){
            let vert = this.getVertRef(0)
            raw_voxels.push({x: vert[0], y: vert[1], z: vert[2]})
        }

        return {
            "voxels": raw_voxels,
            "color": {
                "r": Math.floor(this.color[0] * 255), //FIXME: rounding issues?
                "g": Math.floor(this.color[1] * 255),
                "b": Math.floor(this.color[2] * 255),
            },
            "raw_data": {"url": this.annotated_data_url.toString()},
            "camera_orientation": [
                this.camera_orientation[0], this.camera_orientation[1], this.camera_orientation[2], this.camera_orientation[3],
            ],
        }
    }

    public static fromJsonValue(gl: WebGL2RenderingContext, value: Jsonable): BrushStroke{
        let raw = ensureObject(value)
        //FIXME: better error checking
        let voxels = (raw["voxels"] as Array<any>).map(v => vec3.fromValues(v["x"], v["y"], v["z"]));
        let raw_color = ensureObject(raw["color"])
        let color = vec3.fromValues(
            raw_color["r"] as number / 255,  //FIXME: rounding issues?
            raw_color["g"]  as number / 255,
            raw_color["b"]  as number / 255,
        )
        let camera_orientation: quat;
        if("camera_orientation" in raw){
            let raw_camera_orientation = raw["camera_orientation"] as Array<number>;
            camera_orientation = quat.fromValues(
                raw_camera_orientation[0], raw_camera_orientation[1], raw_camera_orientation[2], raw_camera_orientation[3]
            )
        }else{
            camera_orientation = quat.create()
        }
        let raw_data = ensureObject(raw["raw_data"])
        let brush_stroke = new BrushStroke({
            gl, start_postition: voxels[0], camera_orientation, color, annotated_data_url: new URL(raw_data["url"] as string)
        })
        for(let i=1; i<voxels.length; i++){
            brush_stroke.add_voxel(voxels[i])
        }
        return brush_stroke
    }
}

export interface IBrushStrokeHandler{
    getCurrentColor: () => vec3,
    handleNewBrushStroke: (stroke: BrushStroke) => any,
}
