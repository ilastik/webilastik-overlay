import { Cube } from './shapes'
import { PerspectiveCamera } from './camera'
import { vec3 } from 'gl-matrix'
import { StandardShaderProgram } from './standard_shader'

let c = document.querySelector("#c")! as HTMLCanvasElement
console.log(`This is the canvas: ${c}`)

let gl = c.getContext("webgl2", {depth: true})!
//gl.enable(gl.CULL_FACE);
//gl.cullFace(gl.BACK);

gl.enable(gl.DEPTH_TEST)
//gl.depthFunc(gl.LESS)

c.width = 800
c.style.width = c.width + "px"

c.height = 800
c.style.height = c.height + "px"

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


let renderer = new StandardShaderProgram(gl)
// debugger
let cube = new Cube({gl, renderer});
let camera = new PerspectiveCamera({})

function gogo(x: number, y: number, z: number){
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera.moveTo(vec3.fromValues(x, y, z))
    camera.lookAt(cube.position)

    cube.render(camera)
}

function rotcube(angle: number){
    cube.rotateY(angle)
    gogo(0, 0, 2.5)
}

gogo(0, 0,2.5);


c.addEventListener("click", () => {
    rotcube(0.1)
})