import {FragmentShader, VertexShader, Attribute, AttributeType, ShaderProgram, Buffer, VertexArrayObject} from './shader'

let c = document.querySelector("#c")! as HTMLCanvasElement
console.log(`This is the canvas: ${c}`)

let gl = c.getContext("webgl2")!

c.width = 800
c.style.width = "800px"

c.height = 600
c.style.height = "600px"


let attr__a_position = new Attribute(gl, AttributeType.vec2, "a_position")

let vert_shader = new VertexShader(
    gl,
    attr__a_position.toCode() + `
    void main(){
        gl_Position = vec4(a_position.x, a_position.y, 0, 1);
    }`.replace(/^    /mg, '')
)

let frag_shader = new FragmentShader(
    gl,
    `out highp vec4 outf_color;

    void main(){
        outf_color = vec4(1,0,0,1);
    }`.replace(/^    /mg, '')
)

let prog = new ShaderProgram(gl, vert_shader, frag_shader)
console.log(`Managed to compile a shader prog! ${prog}`)

// three 2d points
let positionsBuffer = new Buffer(
    gl,
    "2-element positions",
    new Float32Array([
        0,   0,
        0,   0.5,
        0.7, 0,
    ]),
    "STATIC_DRAW"
);

let vao = new VertexArrayObject(gl)
vao.bind()

attr__a_position.enable({
    program: prog,
    buffer: positionsBuffer,
    normalize: false,
    byteOffset: 0
})

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);

prog.use()
vao.bind();

gl.drawArrays(gl.TRIANGLES, /*offset=*/0, /*count=*/3);
