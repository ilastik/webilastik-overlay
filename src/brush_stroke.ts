import { quat, vec3 } from "gl-matrix";
import { BufferUsageHint, Vec3AttributeBuffer } from "./buffer";
// import { vec3ToString } from "./utils";
import { VertexArray } from "./vertex_primitives";

export class BrushStroke extends VertexArray{
    public camera_position: vec3
    public readonly camera_orientation: quat
    public num_voxels : number
    public readonly color : vec3
    public readonly positions_buffer: Vec3AttributeBuffer

    constructor({gl, start_postition, color, camera_position, camera_orientation}: {
        gl: WebGL2RenderingContext,
        start_postition: vec3,
        color: vec3,
        camera_position: vec3,
        camera_orientation: quat
    }){
        let data = new Float32Array(1024 * 3) // 1024 vec3's
        super(data)
        this.camera_position = vec3.create(); vec3.copy(this.camera_position, camera_position)
        this.camera_orientation = quat.create(); quat.copy(this.camera_orientation, camera_orientation)
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
        console.log(`Current number of voxels: ${this.num_voxels}`)
    }

    public destroy(){
        this.positions_buffer.destroy()
    }
}
