import { FragmentShader, VertexShader, ShaderProgram, VertexArrayObject } from "./shader";
import { GlslAttribute, GlslUniformMat4, GlslType } from "./glsl";
export class StandardVertexShader extends VertexShader {
    constructor(gl, a_position, u_object_to_clip) {
        super(gl, a_position.toCode() +
            u_object_to_clip.toCode() + `
            void main(){
                gl_Position = ${u_object_to_clip.name} * vec4(${a_position.name}, 1);
            }`);
        this.a_position = a_position;
        this.u_object_to_clip = u_object_to_clip;
    }
    static create(gl) {
        let a_position = new GlslAttribute(gl, GlslType.vec3, "a_position");
        let u_object_to_clip = new GlslUniformMat4(gl, "u_object_to_clip");
        return new StandardVertexShader(gl, a_position, u_object_to_clip);
    }
}
export class StandardFragmentShader extends FragmentShader {
    constructor(gl, code) {
        super(gl, code);
    }
    static create(gl) {
        return new StandardFragmentShader(gl, `
            out highp vec4 outf_color;

            void main(){
                outf_color = vec4(1,0,0,1);
            }`);
    }
}
export class StandardShaderProgram extends ShaderProgram {
    constructor(gl, vertex_shader, fragment_shader) {
        super(gl, vertex_shader, fragment_shader);
        this.vertex_shader = vertex_shader;
        this.fragment_shader = fragment_shader;
    }
    static create(gl) {
        let vertex_shader = StandardVertexShader.create(gl);
        let fragment_shader = StandardFragmentShader.create(gl);
        return new StandardShaderProgram(gl, vertex_shader, fragment_shader);
    }
}
export class StandardVAO extends VertexArrayObject {
    constructor({ gl, a_position_buffer }) {
        super(gl);
        this.program = StandardShaderProgram.create(gl);
        this.bind();
        this.program.vertex_shader.a_position.enable({ program: this.program, buffer: a_position_buffer, normalize: false });
    }
    render({ u_object_to_clip_value }) {
        this.program.use();
        this.bind();
        this.program.vertex_shader.u_object_to_clip.set(u_object_to_clip_value, this.program);
        this.gl.drawArrays(this.gl.TRIANGLES, /*offset=*/ 0, /*count=*/ 4 * 3 * 6); //FIXME: get this from g_position_buffer
    }
}
//# sourceMappingURL=standard_shader.js.map