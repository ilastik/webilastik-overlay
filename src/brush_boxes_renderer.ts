import { mat4 } from "gl-matrix"
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

                vec3 project(vec3 v, vec3 onto){
                    float proj_length = dot(v, normalize(onto));
                    return normalize(onto) * proj_length;
                }
                vec3 projectOntoPlane(vec3 v, vec3 planeNormal){
                    return v - project(v, planeNormal);
                }

                in vec3 a_vert_pos_vx; //box vertex

                uniform vec3 u_offset_vx; //as stored in the brush stroke
                uniform vec3 u_voxel_shape;
                uniform mat4 u_world_to_clip;

                out vec4 v_box_center_c;

                vec3 face_colors[6] = vec3[](
                    vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1),
                    vec3(1, 1, 0), vec3(0, 1, 1), vec3(1, 0, 1)
                );
                out vec3 v_color;

                void main(){
                    vec3 box_center_w = u_voxel_shape * (u_offset_vx + vec3(0.5, 0.5, 0.5));
                    v_box_center_c = u_world_to_clip * vec4(box_center_w, 1);

                    vec3 vert_pos_w = u_voxel_shape * a_vert_pos_vx + box_center_w;
                    vec4 vert_pos_c = u_world_to_clip * vec4(vert_pos_w, 1);


                    gl_Position = vert_pos_c;
                    v_color = face_colors[int(floor(float(gl_VertexID) / 6.0))]; //2 tris per side, 3 verts per tri
                }
            `),
            new FragmentShader(gl, `
                precision mediump float;

                in vec4 v_box_center_c;
                // uniform vec3 u_color;
                in vec3 v_color;

                out highp vec4 outf_color;

                void main(){
                    // outf_color = vec4(u_color, 1);
                    vec3 color = v_color;
                    if(v_box_center_c.z < 0.0){
                        color = mix(color, vec3(1,1,1), 0.5); //make brighter when in front of slicing plane
                    }else{
                        color = mix(color, vec3(0,0,0), 0.5); //make darker when behind slicing plane
                    }
                    outf_color = vec4(color, 1);
                }
            `)
        )
        this.box = new Cube({gl})
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
            vao: this.vao, location: this.getAttribLocation("a_vert_pos_vx")
        })

        this.gl.uniform3fv(this.getUniformLocation("u_voxel_shape").raw, voxelShape.proportions);

        this.gl.uniformMatrix4fv(this.getUniformLocation("u_world_to_clip").raw, false, camera.world_to_clip);

        for(let brush_stroke of brush_strokes){
            this.gl.uniform3fv(this.getUniformLocation("u_offset_vx").raw, brush_stroke.getVertRef(0))
            // console.log(`u_offset_vx: ${vec3ToString(u_offset_vx)}`)

            // this.gl.uniform3f(this.getUniformLocation("u_color").raw, brush_stroke.color[0], brush_stroke.color[1], brush_stroke.color[2]);

            //console.log(`Trying to draw ${vao.num_positions} verts`)
            this.gl.drawArrays(this.box.vertices.getDrawingMode(), 0, this.box.vertices.numVerts)
            // console.log("---+++---+++_--++++++++++++++")
            // throw "do something"
        }
    }
}
