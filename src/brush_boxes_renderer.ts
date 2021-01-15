import { mat4, vec3 } from "gl-matrix"
import { BrushStroke, VoxelShape } from "."
import { BufferUsageHint, VertexArrayObject } from "./buffer"
import { Camera } from "./camera"
import { RenderParams } from "./gl"
import { FragmentShader, ShaderProgram, VertexShader } from "./shader"
import { Cube } from "./shapes"
// import { m4_to_s, vec3ToString } from "./utils"


export class BrushelBoxRenderer extends ShaderProgram{
    u_world_to_view : mat4 = mat4.create()
    box : Cube
    vao: VertexArrayObject

    constructor(gl: WebGL2RenderingContext){
        super(
            gl,
            new VertexShader(gl, `
                //vertex shader to render a single voxel of the brush stroke. Use instanced rendering to render the whole stroke

                in vec3 a_position_o; //box vertex

                uniform vec3 u_offset_v; //as stored in the brush stroke

                uniform mat4 u_object_to_voxel;
                uniform mat4 u_voxel_to_world;
                uniform mat4 u_world_to_view;
                uniform mat4 u_view_to_device;

                // vec3 face_colors[6] = vec3[](
                //     vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1),
                //     vec3(1, 1, 0), vec3(0, 1, 1), vec3(1, 0, 1)
                // );
                // out vec3 v_color;

                void main(){
                    vec4 position_v = (u_object_to_voxel * vec4(a_position_o, 1)) + vec4(u_offset_v, 0);
                    gl_Position = u_view_to_device * u_world_to_view * u_voxel_to_world * position_v;
                    // v_color = face_colors[int(floor(float(gl_VertexID) / 6.0))]; //2 tris per side, 3 verts per tri
                }
            `),
            new FragmentShader(gl, `
                precision mediump float;

                uniform vec3 u_color;
                // in vec3 v_color;

                out highp vec4 outf_color;

                void main(){
                    outf_color = vec4(u_color, 1);
                    // outf_color = vec4(v_color, 1);
                }
            `)
        )
        this.box = new Cube({gl, sideLength: 1, position: vec3.fromValues(0.5, 0.5, 0.5)})
        this.vao = new VertexArrayObject(gl) //FIXME: cleanup the vao and box buffer (but vao autodelets on GC anyway...)
    }

    public render({
        brush_strokes,
        camera,
        voxelShape,
        renderParams=new RenderParams({})
    }: {
        brush_strokes: Array<BrushStroke>,
        camera: Camera,
        voxelShape: VoxelShape,
        renderParams?: RenderParams
    }){
        renderParams.use(this.gl)
        this.use()
        this.vao.bind()

        this.box.getPositionsBuffer(this.gl, BufferUsageHint.STATIC_DRAW).useWithAttribute({
            vao: this.vao, location: this.getAttribLocation("a_position_o")
        })

        //m converts box to a 1x1x1 box centered at 0.5, in voxel coords
        this.gl.uniformMatrix4fv(this.getUniformLocation("u_object_to_voxel").raw, false, this.box.object_to_world_matrix);

        this.gl.uniformMatrix4fv(this.getUniformLocation("u_voxel_to_world").raw, false, voxelShape.voxelToWorldMatrix);
        // console.log("u_voxel_to_world")
        // console.log(m4_to_s(voxelShape.voxelToWorldMatrix))

        camera.get_world_to_view_matrix(this.u_world_to_view)
        this.gl.uniformMatrix4fv(this.getUniformLocation("u_world_to_view").raw, false, this.u_world_to_view);

        this.gl.uniformMatrix4fv(this.getUniformLocation("u_view_to_device").raw, false, camera.view_to_device_matrix);
        // console.log("u_view_to_device")
        // console.log(m4_to_s(camera.view_to_device_matrix))

        for(let brush_stroke of brush_strokes){
            let u_offset_v = brush_stroke.getVertRef(0)
            this.gl.uniform3f(this.getUniformLocation("u_offset_v").raw, u_offset_v[0], u_offset_v[1], u_offset_v[2])
            // console.log(`u_offset_v: ${vec3ToString(u_offset_v)}`)

            this.gl.uniform3f(this.getUniformLocation("u_color").raw, brush_stroke.color[0], brush_stroke.color[1], brush_stroke.color[2]);

            //console.log(`Trying to draw ${vao.num_positions} verts`)
            this.gl.drawArrays(this.box.vertices.getDrawingMode(), 0, this.box.vertices.numVerts)
            // console.log("---+++---+++_--++++++++++++++")
            // throw "do something"
        }
    }
}
