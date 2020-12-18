import { mat4, vec3, vec4 } from "gl-matrix";
import { BufferUsageHint, Vec3AttributeBuffer, VertexArrayObject } from "./buffer";
import { Camera } from "./camera";
import { RenderParams } from "./gl";
import { FragmentShader, ShaderProgram, VertexShader } from "./shader";


export class BrushStrokePositionsBuffer extends Vec3AttributeBuffer{
    constructor(gl: WebGL2RenderingContext, brush_stroke: BrushStroke){
        super(gl, brush_stroke.voxels, BufferUsageHint.DYNAMIC_DRAW, "some brush buffer")
    }
}

export class BrushStroke{
    public readonly voxels = new Float32Array(1024 * 3) // 1024 vec3's
    public num_voxels : number
    public readonly color : vec4

    private positions_buffer?: BrushStrokePositionsBuffer

    constructor({start_postition, color}: {start_postition: vec3, color: vec4}){
        vec3.copy(this.get_voxel_ref(0), start_postition)
        this.num_voxels = 1
        this.color = vec4.create(); vec4.copy(this.color, color)
    }

    private get_voxel_ref(index: number) : vec3{
        return this.voxels.subarray(index * 3, (index+1) * 3)
    }

    private get_last_voxel_ref() : vec3{
        return this.get_voxel_ref(this.num_voxels - 1)
    }

    public add_voxel(voxel: vec3){
        let rounded_centered_voxel = vec3.fromValues(
            Math.floor(voxel[0]) + 0.5,
            Math.floor(voxel[1]) + 0.5,
            Math.floor(voxel[2]) + 0.5
        )
        if(vec3.equals(this.get_last_voxel_ref(), rounded_centered_voxel)){
            return
        }
        vec3.copy(this.get_voxel_ref(this.num_voxels), rounded_centered_voxel)
        if(this.positions_buffer !== undefined){
            this.positions_buffer.populate(this.voxels, BufferUsageHint.DYNAMIC_DRAW)
        }
        this.num_voxels += 1
    }
    public get_positions_buffer(gl: WebGL2RenderingContext) : BrushStrokePositionsBuffer{
        if(this.positions_buffer === undefined){
            this.positions_buffer = new BrushStrokePositionsBuffer(gl, this)
            return this.positions_buffer
        }
        return this.positions_buffer
    }
}



export class BrushShaderProgram extends ShaderProgram{
    vao: VertexArrayObject
    u_world_to_view: mat4
    constructor(gl:WebGL2RenderingContext){
        let vertex_shader = new VertexShader(gl, `
            layout(location=0) in vec3 a_position;

            uniform mat4 u_world_to_view;
            uniform mat4 u_view_to_device;

                void main(){
                    gl_Position = u_view_to_device * u_world_to_view * vec4(a_position, 1);
                }`
        )

        let fragment_shader = new FragmentShader(gl, `
            precision mediump float;

            uniform vec4 u_color;

            out highp vec4 outf_color;

            void main(){
                outf_color = u_color;
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
            brush_stroke.get_positions_buffer(this.gl).useWithAttribute({vao:this.vao, location: positions_location})
            this.vao.bind()

            let uniform_location = this.gl.getUniformLocation(this.glprogram, "u_world_to_view");
            this.gl.uniformMatrix4fv(uniform_location, false, this.u_world_to_view);

            uniform_location = this.gl.getUniformLocation(this.glprogram, "u_view_to_device");
            this.gl.uniformMatrix4fv(uniform_location, false, camera.view_to_device_matrix);

            uniform_location = this.gl.getUniformLocation(this.glprogram, "u_color")
            this.gl.uniform4f(
                uniform_location, brush_stroke.color[0], brush_stroke.color[1], brush_stroke.color[2], brush_stroke.color[3]
            );

            //console.log(`Trying to draw ${vao.num_positions} verts`)
            this.gl.drawArrays(this.gl.LINE_STRIP, 0, brush_stroke.num_voxels)
        }

    }
}
