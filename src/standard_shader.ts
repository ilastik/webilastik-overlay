import {FragmentShader, VertexShader, ShaderProgram} from "./shader"
import {VertexArrayObject, Vec3AttributeBuffer/*, VertexIndicesBuffer*/} from "./buffer"
import { mat4, vec4 } from "gl-matrix"
import { CullFace, FrontFace, StencilFunc, StencilOp, BlendFactor, DepthFunc } from "./gl"


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

export interface BlendingConfig{
    sfactor: BlendFactor,
    dfactor: BlendFactor,
}

export interface DepthConfig{
    mask: boolean,
    func: DepthFunc,
}

export interface RenderParams{
    colorMask?: ColorMask,
    depthConfig?: DepthConfig,
    stencilConfig?: StencilConfig,
    cullConfig?: CullConfig | false,
    blendingConfig?: BlendingConfig | false,
}

const lit_frag_shader_main = `
    void main(){
        vec3 color = u_color.rgb / 3.0; // this will be multiplied by a value in [1, 3], so maxium brightness is the original value
        vec3 light_direction_world = normalize(vec3(-1, -1, -1));

        float cos_angle_between_normal_and_light = dot(v_normal_in_world_coords, light_direction_world);
        float color_intensity = cos_angle_between_normal_and_light + 2.0; //slide interval [-1 , +1] to [1, +3]

        outf_color = vec4((color * color_intensity), u_color.a);
    }`

const solid_frag_shader_main = `
    void main(){
        outf_color = u_color;
    }`


export class StandardShaderProgram extends ShaderProgram{
    constructor(gl:WebGL2RenderingContext, shader_configs: {
        solid_color: boolean
    }){
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

        let frag_main = shader_configs.solid_color ? solid_frag_shader_main : lit_frag_shader_main;

        let fragment_shader = new FragmentShader(gl, `
            precision mediump float;
        
            in vec3 v_normal_in_world_coords;
        
            uniform vec4 u_color;
        
            out highp vec4 outf_color;
            
            ${frag_main}`
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
            depthConfig={
                mask: true,
                func: DepthFunc.LESS,
            },
            stencilConfig={
                func: "ALWAYS", ref: 1, mask: 0xFFFFFFFF, //default stencilFunc to Always pass
                fail: "KEEP", zfail: "KEEP", zpass: "KEEP" //default tencil op to not touch the stencil
            },
            cullConfig={
                face: CullFace.BACK,
                frontFace: FrontFace.CCW,
            },
            blendingConfig={
                sfactor: BlendFactor.SRC_ALPHA,
                dfactor: BlendFactor.ONE_MINUS_SRC_ALPHA,
            }
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

        this.gl.depthMask(depthConfig.mask)
        this.gl.depthFunc(depthConfig.func)

        this.gl.stencilFunc(/*func=*/this.gl[stencilConfig.func], /*ref=*/stencilConfig.ref, /*mask=*/stencilConfig.mask)
        this.gl.stencilOp(/*fail=*/this.gl[stencilConfig.fail], /*zfail=*/this.gl[stencilConfig.zfail], /*zpass=*/this.gl[stencilConfig.zpass])

        if(cullConfig === false){
            this.gl.disable(this.gl.CULL_FACE)
        }else{
            this.gl.enable(this.gl.CULL_FACE)
            this.gl.frontFace(cullConfig.frontFace)
            this.gl.cullFace(cullConfig.face)
        }

        if(blendingConfig === false){
            this.gl.disable(this.gl.BLEND)
        }else{
            this.gl.enable(this.gl.BLEND)
            this.gl.blendFunc(blendingConfig.sfactor, blendingConfig.dfactor)
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