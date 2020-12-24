import { mat4, quat, vec3 } from "gl-matrix";
import { BufferUsageHint, Vec3AttributeBuffer, VertexArrayObject } from "./buffer";
import { Camera } from "./camera";
import { RenderParams } from "./gl";
import { FragmentShader, ShaderProgram, VertexShader } from "./shader";
import { LineStrip } from "./vertex_primitives";


export class BrushStroke extends LineStrip{
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
        vec3.copy(this.getVertRef(0), start_postition)
        this.num_voxels = 1
        this.color = vec3.create(); vec3.copy(this.color, color)
        this.positions_buffer = new Vec3AttributeBuffer(gl, data, BufferUsageHint.DYNAMIC_DRAW)
    }

    private getLastVoxelRef() : vec3{
        return this.getVertRef(this.num_voxels - 1)
    }

    public add_voxel(voxel: vec3){
        let rounded_centered_voxel = vec3.fromValues(
            Math.floor(voxel[0]) + 0.5,
            Math.floor(voxel[1]) + 0.5,
            Math.floor(voxel[2]) + 0.5
        )
        if(vec3.equals(this.getLastVoxelRef(), rounded_centered_voxel)){
            return
        }
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
}

export class BrushShaderProgram extends ShaderProgram{
    vao: VertexArrayObject
    u_world_to_view: mat4
    constructor(gl:WebGL2RenderingContext){
        let vertex_shader = new VertexShader(gl, `
            in vec3 a_position;

            uniform mat4 u_world_to_view;
            uniform mat4 u_view_to_device;

                void main(){
                    gl_Position = u_view_to_device * u_world_to_view * vec4(a_position, 1);
                }`
        )

        let fragment_shader = new FragmentShader(gl, `
            precision mediump float;

            uniform vec3 u_color;

            out highp vec4 outf_color;

            void main(){
                outf_color = vec4(u_color, 1);
            }`
        )

        super(gl, vertex_shader, fragment_shader)
        this.vao = new VertexArrayObject(gl)
        this.u_world_to_view = mat4.create()
    }

    public render({
        brush_strokes,
        camera,
        renderParams=new RenderParams({})
    }: {
        brush_strokes: Array<BrushStroke>,
        camera: Camera,
        renderParams?: RenderParams
    }){
        renderParams.use(this.gl)
        this.use()

        camera.get_world_to_view_matrix(this.u_world_to_view)

        for(let brush_stroke of brush_strokes){
            let positions_location = this.getAttribLocation("a_position")
            brush_stroke.positions_buffer.useWithAttribute({vao:this.vao, location: positions_location})
            this.vao.bind()

            let uniform_location = this.gl.getUniformLocation(this.glprogram, "u_world_to_view");
            this.gl.uniformMatrix4fv(uniform_location, false, this.u_world_to_view);

            uniform_location = this.gl.getUniformLocation(this.glprogram, "u_view_to_device");
            this.gl.uniformMatrix4fv(uniform_location, false, camera.view_to_device_matrix);

            uniform_location = this.gl.getUniformLocation(this.glprogram, "u_color")
            this.gl.uniform3f(
                uniform_location, brush_stroke.color[0], brush_stroke.color[1], brush_stroke.color[2]
            );

            //console.log(`Trying to draw ${vao.num_positions} verts`)
            this.gl.drawArrays(this.gl.LINE_STRIP, 0, brush_stroke.num_voxels)
        }

    }
}
