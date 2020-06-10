import { Cube, Plane } from './shapes'
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
let plane = new Plane({gl, renderer, color: vec3.fromValues(1, 0, 0), position: vec3.fromValues(0, 0, -1), scale: vec3.fromValues(1, 1, 1)});
let cube = new Cube({gl, renderer, color: vec3.fromValues(0, 0, 1), scale: vec3.fromValues(0.5, 0.5, 0.5)});
let camera = new PerspectiveCamera({})

function gogo(x: number, y: number, z: number){
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera.moveTo(vec3.fromValues(x, y, z))
    camera.lookAt(cube.position)

    gl.colorMask(false, false, false, false);
    plane.render(camera)
    gl.colorMask(true, true, true, true);
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