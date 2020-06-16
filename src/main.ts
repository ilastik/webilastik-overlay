import { Cube } from './shapes'
import { Plane } from './shapes'

import { PerspectiveCamera } from './camera'
import { vec3 } from 'gl-matrix'
import { StandardShaderProgram, DepthFunc, /*CullFace, FrontFace*/ } from './standard_shader'

let c = document.querySelector("#c")! as HTMLCanvasElement
console.log(`This is the canvas: ${c}`)

let gl = c.getContext("webgl2", {depth: true, stencil: true})!
//gl.enable(gl.CULL_FACE);
//gl.cullFace(gl.BACK);

gl.enable(gl.DEPTH_TEST)
gl.enable(gl.STENCIL_TEST)
//gl.depthFunc(gl.LESS)

c.width = 800
c.style.width = c.width + "px"

c.height = 800
c.style.height = c.height + "px"

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


let renderer = new StandardShaderProgram(gl)
// debugger
let slicing_plane = new Plane({
    gl,
    renderer,
    color: vec3.fromValues(1, 0, 0),
    //position: vec3.fromValues(0, 0, -1),
    scale: vec3.fromValues(1, 1, 1)
});

// let stencil_plane = new Plane({
//     gl,
//     renderer, color: vec3.fromValues(0, 1, 0),
//     position: vec3.fromValues(0.5, 0, 0),
//     scale: vec3.fromValues(0.5, 1, 1)
// });

let cube = new Cube({gl, renderer, color: vec3.fromValues(0, 0, 1), scale: vec3.fromValues(0.5, 0.5, 0.5)});
let camera = new PerspectiveCamera({})

function gogo(x: number, y: number, z: number){
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    camera.moveTo(vec3.fromValues(x, y, z))
    camera.lookAt(cube.position)

    slicing_plane.render(camera, {
        //colorMask: {r: false, g: false, b: false, a: false}, //disable drawing of colors. only interested in depth
    })


    // stencil_plane.render(camera, {
    //     depthMask: false, //do not update depth buffer when doing stencil stuff
    //     stencil: {
    //         func: "ALWAYS", ref: 1, mask: 0xFFFFFFFF, //always pass test to update the stencil buffer with stencil_plane geometry
    //         fail: "ZERO", zfail: "ZERO", zpass: "INCR"//since the buffer has been reset, this should increment the buffer to 1
    //     },
    // })

    cube.render(camera, {
        cullConfig: false,//{face: CullFace.FRONT, frontFace: FrontFace.CCW}
        depthFunc: DepthFunc.GREATER
    })

//    cube.render(camera, {
//     stencil: {
//         func: "EQUAL", ref: 1, mask: 0xFFFFFFFF,//if stencil is 1, pass
//         fail: "KEEP", zfail: "KEEP", zpass: "KEEP", // do not touch stencil
//     }
//    })
}

function rotcube(angle: number){
    cube.rotateY(angle)
    gogo(0, 0, 2.5)
}

gogo(0, 0,2.5);


c.addEventListener("click", () => {
    rotcube(0.1)
})