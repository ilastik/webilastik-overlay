import {FragmentShader, VertexShader, ShaderProgram} from "./shader"
import {VertexArrayObject, Vec3AttributeBuffer/*, VertexIndicesBuffer*/} from "./buffer"
import { mat4, vec4 } from "gl-matrix"


export type StencilOp = "KEEP" | "ZERO" | "REPLACE" | "INCR" | "INCR_WRAP" | "DECR" | "DECR_WRAP" | "INVERT"
export type StencilFunc = "NEVER" | "LESS" | "EQUAL" | "LEQUAL" | "GREATER" | "NOTEQUAL" | "GEQUAL" | "ALWAYS"
export enum CullFace{
    BACK = WebGL2RenderingContext["BACK"],
    FRONT = WebGL2RenderingContext["FRONT"],
    FRONT_AND_BACK = WebGL2RenderingContext["FRONT_AND_BACK"],
}
export enum FrontFace{
    CW = WebGL2RenderingContext["CW"],
    CCW = WebGL2RenderingContext["CCW"],
}


export interface CullConfig{
    face: CullFace,
    frontFace: FrontFace,
}

export interface ColorMask{
    r: boolean, g: boolean, b: boolean, a: boolean
}

export interface StencilConfig{
    func: StencilFunc, ref: number, mask: number,
    fail: StencilOp, zfail: StencilOp, zpass: StencilOp,
}

export enum DepthFunc{
    NEVER = WebGL2RenderingContext["NEVER"],
    LESS = WebGL2RenderingContext["LESS"],
    EQUAL = WebGL2RenderingContext["EQUAL"],
    LEQUAL = WebGL2RenderingContext["LEQUAL"],
    GREATER = WebGL2RenderingContext["GREATER"],
    NOTEQUAL = WebGL2RenderingContext["NOTEQUAL"],
    GEQUAKL = WebGL2RenderingContext["GEQUAL"],
    ALWAYS = WebGL2RenderingContext["ALWAYS"],
}

export interface RenderParams{
    colorMask?: ColorMask,
    depthMask?: boolean,
    depthFunc?: DepthFunc,
    stencil?: StencilConfig,
    cullConfig?: CullConfig | false,
}


export class StandardShaderProgram extends ShaderProgram{
    constructor(gl:WebGL2RenderingContext){
        let vertex_shader = new VertexShader(gl, `
            layout(location=0) in vec3 a_position; 
            layout(location=1) in vec3 a_normal;

            uniform mat4 u_object_to_world; 
            uniform mat4 u_world_to_view;
            uniform mat4 u_view_to_device;
            
            out mediump vec3 v_normal_in_world_coords;

            void main(){
                gl_Position = u_view_to_device * u_world_to_view * u_object_to_world * vec4(a_position, 1);
                v_normal_in_world_coords = (u_object_to_world * vec4(a_normal, 1)).xyz;
            }`
        )

        let fragment_shader = new FragmentShader(gl, `
            precision mediump float;

            in vec3 v_normal_in_world_coords;

            uniform vec4 u_color;

            out highp vec4 outf_color;

            void main(){
                vec3 color = u_color.rgb / 3.0; // this will be multiplied by a value in [1, 3], so maxium brightness is the original value
                vec3 light_direction_world = normalize(vec3(-1, -1, -1));

                float cos_angle_between_normal_and_light = dot(v_normal_in_world_coords, light_direction_world);
                float color_intensity = cos_angle_between_normal_and_light + 2.0; //slide interval [-1 , +1] to [1, +3]

                outf_color = vec4((color * color_intensity), u_color.a);
                //outf_color = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1);

            }`
        )

        super(gl, vertex_shader, fragment_shader)
    }

    public run({
        vao,
        u_color,
        u_object_to_world,
        u_world_to_view,
        u_view_to_device,

        renderParams: {
            colorMask={r: true, g: true, b: true, a: true},
            depthMask=true,
            depthFunc=DepthFunc.LESS,
            stencil={
                func: "ALWAYS", ref: 1, mask: 0xFFFFFFFF, //default stencilFunc to Always pass
                fail: "KEEP", zfail: "KEEP", zpass: "KEEP" //default tencil op to not touch the stencil
            },
            cullConfig={
                face: CullFace.BACK,
                frontFace: FrontFace.CCW,
            },
        },
    }: {
        vao: StandardVAO,
        u_color: vec4,
        u_object_to_world: mat4,
        u_world_to_view: mat4,
        u_view_to_device: mat4,

        renderParams: RenderParams
    }){
        this.gl.colorMask(colorMask.r, colorMask.g, colorMask.b, colorMask.a)

        this.gl.depthMask(depthMask)
        this.gl.depthFunc(depthFunc)

        this.gl.stencilFunc(/*func=*/this.gl[stencil.func], /*ref=*/stencil.ref, /*mask=*/stencil.mask)
        this.gl.stencilOp(/*fail=*/this.gl[stencil.fail], /*zfail=*/this.gl[stencil.zfail], /*zpass=*/this.gl[stencil.zpass])

        if(cullConfig === false){
            this.gl.disable(this.gl.CULL_FACE)
        }else{
            this.gl.enable(this.gl.CULL_FACE)
            this.gl.frontFace(cullConfig.frontFace)
            this.gl.cullFace(cullConfig.face)
        }

        this.use()

        let uniform_location = this.gl.getUniformLocation(this.glprogram, "u_object_to_world");
        this.gl.uniformMatrix4fv(uniform_location, false, u_object_to_world);

        uniform_location = this.gl.getUniformLocation(this.glprogram, "u_world_to_view");
        this.gl.uniformMatrix4fv(uniform_location, false, u_world_to_view);

        uniform_location = this.gl.getUniformLocation(this.glprogram, "u_view_to_device");
        this.gl.uniformMatrix4fv(uniform_location, false, u_view_to_device);

        uniform_location = this.gl.getUniformLocation(this.glprogram, "u_color")
        this.gl.uniform4f(uniform_location, u_color[0], u_color[1], u_color[2], u_color[3]);

        vao.bind();
        //console.log(`Trying to draw ${vao.num_positions} verts`)
        this.gl.drawArrays(this.gl.TRIANGLES, 0, vao.num_positions)
    }
}

export class StandardVAO extends VertexArrayObject{
    public readonly a_position_buffer: Vec3AttributeBuffer
    public readonly a_normal_buffer: Vec3AttributeBuffer
    public readonly num_positions: number
 //   public readonly vertex_indices_buffer: VertexIndicesBuffer
    program: StandardShaderProgram
    constructor({gl, a_position_data, a_normal_data, /*vertex_indices*/}: {
        gl: WebGL2RenderingContext,
        a_position_data: Float32Array,
        a_normal_data: Float32Array,
        //vertex_indices: Uint16Array,
    }){
        super(gl)
        //console.log(`Rendering positions: ${a_position_data}`)
        //console.log(`Rendering normals: ${a_normal_data}`)

        if(a_position_data.length != a_normal_data.length){
            throw `position/normals mismatch!! num positions: ${a_position_data.length} num normals: ${a_normal_data.length}`
        }
        this.bind()
        this.a_position_buffer = new Vec3AttributeBuffer(gl, a_position_data, "STATIC_DRAW")
        this.a_position_buffer.useWithAttribute({location: 0, vao: this});
        this.num_positions = a_position_data.length / 3


        this.a_normal_buffer = new Vec3AttributeBuffer(gl, a_normal_data, "STATIC_DRAW")
        this.a_normal_buffer.useWithAttribute({location: 1, vao: this});
        
        //this.vertex_indices_buffer = new VertexIndicesBuffer(gl, vertex_indices, "STATIC_DRAW")
        //this.vertex_indices_buffer.bind()
    }


    // public get num_indices() : number{
    //     return this.vertex_indices_buffer.num_indices
    // }

    public drop(){
        console.error("IMPLEMENT ME! Don't forget to also drop the buffers")
    }
}